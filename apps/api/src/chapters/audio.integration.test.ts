import { afterEach, describe, expect, it, vi } from 'vitest'

import * as storage from '@narada/storage'
import * as musicMetadata from 'music-metadata'

import { destroyTestWorld } from '../testing/cleanup'
import {
  createAudioAsset as createAudioAssetFixture,
  createAudioMapping,
  createChapter,
  createDocChapter,
  createSegment,
  createStagedUpload,
  createTestSchool,
  createTrack,
  type TestWorld,
} from '../testing/fixtures'
import { parse } from '../utils/validate'
import { SetAudioMappingsSchema } from './schema'
import {
  createAudioAsset,
  createAudioUpload,
  deleteAudioAsset,
  findById as findChapterDetail,
  setAudioMappings,
} from './service'

// Real signing (getDownloadUrl) and R2 HEAD/GET checks (objectExists/getObject) both need a real
// bucket to hit for real — mocked here so these tests exercise the staged-upload state machine and
// segment bookkeeping, not R2 itself.
vi.mock('@narada/storage', () => ({
  getUploadUrl: vi.fn(async (key: string) => ({ uploadUrl: `https://mock-upload.example/${key}` })),
  getDownloadUrl: vi.fn(async (key: string) => `https://mock-download.example/${key}`),
  objectExists: vi.fn(async () => true),
  getObject: vi.fn(async () => Buffer.from('fake audio bytes')),
  deleteObject: vi.fn(async () => undefined),
}))

// Parsing real audio bytes needs a real audio file — mocked so these tests control what "valid" vs
// "unparseable" audio looks like without needing an actual fixture file on disk.
vi.mock('music-metadata', () => ({
  parseBuffer: vi.fn(async () => ({ format: { duration: 12.5 } })),
}))

let world: TestWorld | undefined

afterEach(async () => {
  vi.mocked(storage.objectExists).mockResolvedValue(true)
  vi.mocked(storage.deleteObject).mockClear()
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

describe('createAudioUpload + createAudioAsset', () => {
  it('presigns, confirms, and creates the audio asset', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapter(world, trackRow, { status: 'published' })

    const { uploadId, uploadUrl } = await createAudioUpload(
      { db: world.schoolDb },
      chapterRow.id,
      'test-user',
      'test-school',
      { contentType: 'audio/mpeg' },
    )
    expect(uploadUrl).toContain(chapterRow.id)

    const asset = await createAudioAsset({ db: world.schoolDb }, chapterRow.id, {
      uploadId,
      label: 'Take 1',
      reciter: 'Test Reciter',
    })

    expect(asset.label).toBe('Take 1')
    expect(asset.url).toContain('mock-download.example')
    expect(asset.mappings).toEqual([])
    // Server-derived from the (mocked) parsed audio bytes, not client-supplied — there is no
    // client-supplied duration for this to have come from otherwise.
    expect(asset.duration).toBe(12.5)
  })

  it('is idempotent on retry — confirming the same upload twice yields exactly one audio asset', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapter(world, trackRow, { status: 'published' })

    const { uploadId } = await createAudioUpload({ db: world.schoolDb }, chapterRow.id, 'u', 's', {
      contentType: 'audio/mpeg',
    })
    const data = { uploadId, label: null, reciter: 'R' }

    const first = await createAudioAsset({ db: world.schoolDb }, chapterRow.id, data)
    const second = await createAudioAsset({ db: world.schoolDb }, chapterRow.id, data)

    expect(second.id).toBe(first.id)
    const detail = await findChapterDetail({ db: world.schoolDb }, chapterRow.id, { kind: 'authoring' })
    expect(detail.audio).toHaveLength(1)
  })

  it('rejects confirming an upload whose object was never actually put in storage', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapter(world, trackRow, { status: 'published' })
    vi.mocked(storage.objectExists).mockResolvedValueOnce(false)

    const { uploadId } = await createAudioUpload({ db: world.schoolDb }, chapterRow.id, 'u', 's', {
      contentType: 'audio/mpeg',
    })

    await expect(
      createAudioAsset({ db: world.schoolDb }, chapterRow.id, { uploadId, label: null, reciter: 'R' }),
    ).rejects.toMatchObject({ statusCode: 422 })
  })

  it('rejects confirming an expired upload, and flips it to expired', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapter(world, trackRow, { status: 'published' })
    const staged = await createStagedUpload(world, chapterRow, {
      expiresAt: new Date(Date.now() - 1000),
    })

    await expect(
      createAudioAsset({ db: world.schoolDb }, chapterRow.id, { uploadId: staged.id, label: null, reciter: 'R' }),
    ).rejects.toMatchObject({ statusCode: 422 })

    const detail = await findChapterDetail({ db: world.schoolDb }, chapterRow.id, { kind: 'authoring' })
    expect(detail.audio).toHaveLength(0)
  })

  it('rejects an upload whose bytes do not decode as audio, leaving the staged upload unconfirmed', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapter(world, trackRow, { status: 'published' })
    vi.mocked(musicMetadata.parseBuffer).mockRejectedValueOnce(new Error('not a recognized audio format'))

    const { uploadId } = await createAudioUpload({ db: world.schoolDb }, chapterRow.id, 'u', 's', {
      contentType: 'audio/mpeg',
    })

    await expect(
      createAudioAsset({ db: world.schoolDb }, chapterRow.id, { uploadId, label: null, reciter: 'R' }),
    ).rejects.toMatchObject({ statusCode: 422 })

    const detail = await findChapterDetail({ db: world.schoolDb }, chapterRow.id, { kind: 'authoring' })
    expect(detail.audio).toHaveLength(0)

    // Confirming again with a valid parse should still work — the failed attempt didn't burn the
    // staged upload (it's still `pending`, not left dangling in some half-confirmed state).
    const asset = await createAudioAsset({ db: world.schoolDb }, chapterRow.id, {
      uploadId,
      label: null,
      reciter: 'R',
    })
    expect(asset.duration).toBe(12.5)
  })
})

describe('setAudioMappings', () => {
  it('replaces mappings, rejecting a segment that belongs to a different chapter', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapter(world, trackRow, { status: 'published' })
    const otherChapter = await createChapter(world, trackRow, { status: 'published' })
    const docChapterRow = await createDocChapter(world)

    const segmentRow = await createSegment(world, docChapterRow, { order: 1, chapter: chapterRow })
    const foreignSegment = await createSegment(world, docChapterRow, { order: 2, chapter: otherChapter })
    const audioAssetRow = await createAudioAssetFixture(world, chapterRow)

    await expect(
      setAudioMappings({ db: world.schoolDb }, chapterRow.id, audioAssetRow.id, {
        mappings: [{ segmentId: foreignSegment.id, audioStart: 0, audioEnd: 1 }],
      }),
    ).rejects.toMatchObject({ statusCode: 422 })

    const asset = await setAudioMappings({ db: world.schoolDb }, chapterRow.id, audioAssetRow.id, {
      mappings: [{ segmentId: segmentRow.id, audioStart: 0, audioEnd: 1 }],
    })
    expect(asset.mappings).toEqual([{ segmentId: segmentRow.id, audioStart: 0, audioEnd: 1 }])
  })

  it('rejects overlapping mappings at the validation layer (the route\'s own parse() call, not the service)', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapter(world, trackRow, { status: 'published' })
    const docChapterRow = await createDocChapter(world)
    const segment1 = await createSegment(world, docChapterRow, { order: 1, chapter: chapterRow })
    const segment2 = await createSegment(world, docChapterRow, { order: 2, chapter: chapterRow })

    // Mirrors what the route does before ever calling the service — overlap validation lives in
    // the Zod schema, not `setAudioMappings` itself, so exercising it means going through `parse`.
    await expect(
      parse(SetAudioMappingsSchema, {
        mappings: [
          { segmentId: segment1.id, audioStart: 0, audioEnd: 5 },
          { segmentId: segment2.id, audioStart: 3, audioEnd: 8 },
        ],
      }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('deleteAudioAsset', () => {
  it('deletes the row and best-effort deletes the R2 object', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapter(world, trackRow, { status: 'published' })
    const docChapterRow = await createDocChapter(world)
    const segmentRow = await createSegment(world, docChapterRow, { order: 1, chapter: chapterRow })
    const audioAssetRow = await createAudioAssetFixture(world, chapterRow, { objectKey: 'schools/test/delete-me.mp3' })
    await createAudioMapping(world, segmentRow, audioAssetRow, { audioStart: 0, audioEnd: 1 })

    await deleteAudioAsset({ db: world.schoolDb }, chapterRow.id, audioAssetRow.id)

    const detail = await findChapterDetail({ db: world.schoolDb }, chapterRow.id, { kind: 'authoring' })
    expect(detail.audio).toHaveLength(0)
    expect(storage.deleteObject).toHaveBeenCalledWith('schools/test/delete-me.mp3')
  })
})
