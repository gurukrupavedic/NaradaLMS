import { afterEach, describe, expect, it, vi } from 'vitest'

import * as storage from '@narada/storage'
import * as musicMetadata from 'music-metadata'

import { destroyTestWorld } from '../testing/cleanup'
import {
  createAudioAsset as createAudioAssetFixture,
  createAudioMapping,
  createChapter,
  createChapterScript,
  createChapterScriptSegment,
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
  resegmentChapter,
  setAudioMappings,
  upsertScript,
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

const SCRIPT_INPUT = {
  label: 'Devanagari',
  short: 'देव',
  fontClass: 'font-deva',
}

describe('upsertScript', () => {
  it('creates fresh segments for a chapter with none yet', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapter(world, trackRow, { status: 'published' })

    const detail = await upsertScript({ db: world.schoolDb }, chapterRow.id, 'sa', {
      ...SCRIPT_INPUT,
      text: 'line one\nline two',
      segments: [
        { start: 0, end: 8 },
        { start: 9, end: 18 },
      ],
    })

    expect(detail.scripts).toHaveLength(1)
    expect(detail.scripts[0]?.segments).toHaveLength(2)
    expect(detail.scripts[0]?.segments.map(s => [s.start, s.end])).toEqual([
      [0, 8],
      [9, 18],
    ])
  })

  it('re-saving with the same segment count reuses segment ids and leaves a sibling script + audio mapping untouched', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapter(world, trackRow, { status: 'published' })

    const sanskrit = await createChapterScript(world, chapterRow, { script: 'sa', text: 'old sa text here' })
    const telugu = await createChapterScript(world, chapterRow, { script: 'te', text: 'old te text here' })
    const segment1 = await createSegment(world, chapterRow, { order: 1 })
    const segment2 = await createSegment(world, chapterRow, { order: 2 })
    await createChapterScriptSegment(world, sanskrit, segment1, { start: 0, end: 3 })
    await createChapterScriptSegment(world, sanskrit, segment2, { start: 4, end: 8 })
    await createChapterScriptSegment(world, telugu, segment1, { start: 0, end: 3 })
    await createChapterScriptSegment(world, telugu, segment2, { start: 4, end: 8 })
    const audioAssetRow = await createAudioAssetFixture(world, chapterRow)
    await createAudioMapping(world, segment1, audioAssetRow, { audioStart: 0, audioEnd: 3 })
    await createAudioMapping(world, segment2, audioAssetRow, { audioStart: 3, audioEnd: 7 })

    // Re-save the Sanskrit script's text with the same segment count, but different offsets.
    const detail = await upsertScript({ db: world.schoolDb }, chapterRow.id, 'sa', {
      ...SCRIPT_INPUT,
      text: 'new sa text here',
      segments: [
        { start: 0, end: 3 },
        { start: 4, end: 8 },
      ],
    })

    const sa = detail.scripts.find(s => s.key === 'sa')
    const te = detail.scripts.find(s => s.key === 'te')
    expect(sa?.text).toBe('new sa text here')
    // Segment ids are unchanged — this is the load-bearing assertion: saving one script's text
    // must not disturb the shared segment identity or a sibling script's/audio's own offsets.
    expect(sa?.segments.map(s => s.id)).toEqual([segment1.id, segment2.id])
    expect(te?.segments).toEqual([
      { id: segment1.id, start: 0, end: 3 },
      { id: segment2.id, start: 4, end: 8 },
    ])
    expect(detail.audio[0]?.mappings).toEqual([
      { segmentId: segment1.id, audioStart: 0, audioEnd: 3 },
      { segmentId: segment2.id, audioStart: 3, audioEnd: 7 },
    ])
  })

  it('rejects a segment-count change while a sibling script still depends on the current segments, writing nothing', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapter(world, trackRow, { status: 'published' })

    const sanskrit = await createChapterScript(world, chapterRow, { script: 'sa', text: 'sa text' })
    const telugu = await createChapterScript(world, chapterRow, { script: 'te', text: 'te text' })
    const segment1 = await createSegment(world, chapterRow, { order: 1 })
    await createChapterScriptSegment(world, sanskrit, segment1, { start: 0, end: 3 })
    await createChapterScriptSegment(world, telugu, segment1, { start: 0, end: 3 })

    await expect(
      upsertScript({ db: world.schoolDb }, chapterRow.id, 'sa', {
        ...SCRIPT_INPUT,
        text: 'sa text, now two lines',
        segments: [
          { start: 0, end: 2 },
          { start: 3, end: 5 },
        ],
      }),
    ).rejects.toMatchObject({ statusCode: 422 })

    // Confirm nothing was written — the transaction rolled back.
    const detail = await findChapterDetail({ db: world.schoolDb }, chapterRow.id, { kind: 'authoring' })
    const sa = detail.scripts.find(s => s.key === 'sa')
    expect(sa?.text).toBe('sa text')
    expect(sa?.segments).toEqual([{ id: segment1.id, start: 0, end: 3 }])
  })

  it('allows a segment-count change when nothing else depends on the current segments yet', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapter(world, trackRow, { status: 'published' })

    // Only one script has content so far — nothing else depends on its segments.
    await upsertScript({ db: world.schoolDb }, chapterRow.id, 'sa', {
      ...SCRIPT_INPUT,
      text: 'one line',
      segments: [{ start: 0, end: 8 }],
    })

    const detail = await upsertScript({ db: world.schoolDb }, chapterRow.id, 'sa', {
      ...SCRIPT_INPUT,
      text: 'two lines now',
      segments: [
        { start: 0, end: 4 },
        { start: 5, end: 9 },
      ],
    })

    expect(detail.scripts[0]?.segments).toHaveLength(2)
  })
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
    // client-supplied duration anymore for this to have come from otherwise.
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
      createAudioAsset(
        { db: world.schoolDb },
        chapterRow.id,
        { uploadId: staged.id, label: null, reciter: 'R' },
      ),
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

    const segmentRow = await createSegment(world, chapterRow, { order: 1 })
    const foreignSegment = await createSegment(world, otherChapter, { order: 1 })
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
    const segment1 = await createSegment(world, chapterRow, { order: 1 })
    const segment2 = await createSegment(world, chapterRow, { order: 2 })

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
    const segmentRow = await createSegment(world, chapterRow, { order: 1 })
    const audioAssetRow = await createAudioAssetFixture(world, chapterRow, { objectKey: 'schools/test/delete-me.mp3' })
    await createAudioMapping(world, segmentRow, audioAssetRow, { audioStart: 0, audioEnd: 1 })

    await deleteAudioAsset({ db: world.schoolDb }, chapterRow.id, audioAssetRow.id)

    const detail = await findChapterDetail({ db: world.schoolDb }, chapterRow.id, { kind: 'authoring' })
    expect(detail.audio).toHaveLength(0)
    expect(storage.deleteObject).toHaveBeenCalledWith('schools/test/delete-me.mp3')
  })
})

describe('resegmentChapter', () => {
  it('resizes the shared segment timeline, updates every script, and clears existing audio mappings via cascade', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapter(world, trackRow, { status: 'published' })

    const sanskrit = await createChapterScript(world, chapterRow, { script: 'sa', text: 'old sa text here' })
    const telugu = await createChapterScript(world, chapterRow, { script: 'te', text: 'old te text here' })
    const segment1 = await createSegment(world, chapterRow, { order: 1 })
    const segment2 = await createSegment(world, chapterRow, { order: 2 })
    await createChapterScriptSegment(world, sanskrit, segment1, { start: 0, end: 3 })
    await createChapterScriptSegment(world, sanskrit, segment2, { start: 4, end: 8 })
    await createChapterScriptSegment(world, telugu, segment1, { start: 0, end: 3 })
    await createChapterScriptSegment(world, telugu, segment2, { start: 4, end: 8 })
    const audioAssetRow = await createAudioAssetFixture(world, chapterRow)
    await createAudioMapping(world, segment1, audioAssetRow, { audioStart: 0, audioEnd: 3 })
    await createAudioMapping(world, segment2, audioAssetRow, { audioStart: 3, audioEnd: 7 })

    const detail = await resegmentChapter({ db: world.schoolDb }, chapterRow.id, {
      scripts: {
        sa: {
          segments: [
            { start: 0, end: 2 },
            { start: 3, end: 5 },
            { start: 6, end: 9 },
          ],
        },
        te: {
          segments: [
            { start: 0, end: 2 },
            { start: 3, end: 5 },
            { start: 6, end: 9 },
          ],
        },
      },
    })

    const sa = detail.scripts.find(s => s.key === 'sa')
    const te = detail.scripts.find(s => s.key === 'te')
    expect(sa?.segments).toHaveLength(3)
    expect(sa?.segments.map(s => [s.start, s.end])).toEqual([
      [0, 2],
      [3, 5],
      [6, 9],
    ])
    // Both scripts share the same fresh segment ids — the whole point of resegmenting together.
    expect(sa?.segments.map(s => s.id)).toEqual(te?.segments.map(s => s.id))
    // Old segment ids are gone entirely, not reused.
    expect(sa?.segments.map(s => s.id)).not.toContain(segment1.id)
    expect(sa?.segments.map(s => s.id)).not.toContain(segment2.id)
    // The cascade wiped the audio mapping that pointed at the old segments — there is no safe way
    // to infer how it maps onto the new boundaries, so it's genuinely gone, not preserved.
    expect(detail.audio[0]?.mappings).toEqual([])
  })

  it('rejects a payload missing one of the chapter\'s existing scripts, writing nothing', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapter(world, trackRow, { status: 'published' })

    const sanskrit = await createChapterScript(world, chapterRow, { script: 'sa', text: 'sa text' })
    const telugu = await createChapterScript(world, chapterRow, { script: 'te', text: 'te text' })
    const segment1 = await createSegment(world, chapterRow, { order: 1 })
    await createChapterScriptSegment(world, sanskrit, segment1, { start: 0, end: 3 })
    await createChapterScriptSegment(world, telugu, segment1, { start: 0, end: 3 })

    await expect(
      resegmentChapter({ db: world.schoolDb }, chapterRow.id, {
        scripts: {
          sa: { segments: [{ start: 0, end: 2 }, { start: 3, end: 5 }] },
        },
      }),
    ).rejects.toMatchObject({ statusCode: 422 })

    // Confirm nothing was written — the transaction rolled back.
    const detail = await findChapterDetail({ db: world.schoolDb }, chapterRow.id, { kind: 'authoring' })
    const sa = detail.scripts.find(s => s.key === 'sa')
    expect(sa?.segments).toEqual([{ id: segment1.id, start: 0, end: 3 }])
  })
})
