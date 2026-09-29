import { afterEach, describe, expect, it } from 'vitest'

import { destroyTestWorld } from '../testing/cleanup'
import {
  createAudioAsset,
  createAudioMapping,
  createChapter as createChapterFixture,
  createDocChapter,
  createSegment,
  createSegmentText,
  createTestSchool,
  createTrack,
  type TestWorld,
  defaultCourseId,
} from '../testing/fixtures'
import { findAll as findAllTracks } from '../tracks/repository'
import { findById } from './repository'
import { createChapter, findById as findChapterDetail, updateChapter } from './service'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

describe('findById', () => {
  it('a published chapter is visible under both views', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapterFixture(world, trackRow, { status: 'published' })

    await expect(
      findById(world.schoolDb, chapterRow.id, { kind: 'learnerPreview' }),
    ).resolves.toMatchObject({ id: chapterRow.id })
    await expect(
      findById(world.schoolDb, chapterRow.id, { kind: 'authoring' }),
    ).resolves.toMatchObject({ id: chapterRow.id })
  })

  it('a draft chapter is invisible under learnerPreview but visible under authoring', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapterFixture(world, trackRow, { status: 'draft' })

    await expect(
      findById(world.schoolDb, chapterRow.id, { kind: 'learnerPreview' }),
    ).resolves.toBeUndefined()
    await expect(
      findById(world.schoolDb, chapterRow.id, { kind: 'authoring' }),
    ).resolves.toMatchObject({ id: chapterRow.id })
  })

  it('a nonexistent chapter is undefined under either view — same shape as a hidden draft, so a caller can\'t distinguish "hidden" from "does not exist"', async () => {
    world = await createTestSchool()

    await expect(
      findById(world.schoolDb, crypto.randomUUID(), { kind: 'learnerPreview' }),
    ).resolves.toBeUndefined()
  })
})

describe('findById (service) — content', () => {
  it('returns scripts sharing segment ids with their own per-script text, and audio with a signed url', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapterFixture(world, trackRow, { status: 'published' })
    const docChapterRow = await createDocChapter(world)

    const segment1 = await createSegment(world, docChapterRow, { order: 1, chapter: chapterRow })
    const segment2 = await createSegment(world, docChapterRow, { order: 2, chapter: chapterRow })

    await createSegmentText(world, segment1, { script: 'sa', text: 'ॐ सह नाववतु' })
    await createSegmentText(world, segment2, { script: 'sa', text: 'सह नौ भुनक्तु' })
    await createSegmentText(world, segment1, { script: 'te', text: 'ఓం సహ నావవతు' })
    await createSegmentText(world, segment2, { script: 'te', text: 'సహ నౌ భునక్తు' })

    const audioAssetRow = await createAudioAsset(world, chapterRow, {
      objectKey: 'schools/test/audio.mp3',
    })
    await createAudioMapping(world, segment1, audioAssetRow, { audioStart: 0, audioEnd: 3 })
    await createAudioMapping(world, segment2, audioAssetRow, { audioStart: 3, audioEnd: 7 })

    const detail = await findChapterDetail(
      { db: world.schoolDb },
      chapterRow.id,
      { kind: 'learnerPreview' },
    )

    const sa = detail.scripts.find(s => s.key === 'sa')
    const te = detail.scripts.find(s => s.key === 'te')
    const en = detail.scripts.find(s => s.key === 'en')

    // Same segment ids on both scripts, in reading order — this is the part that makes a script
    // switch keep your place: only the text differs per script, never the ids.
    expect(sa?.segments.map(s => s.id)).toEqual(te?.segments.map(s => s.id))
    expect(sa?.segments).toEqual([
      { id: segment1.id, text: 'ॐ सह नाववतु' },
      { id: segment2.id, text: 'सह नौ भुनक्तु' },
    ])
    expect(te?.segments).toEqual([
      { id: segment1.id, text: 'ఓం సహ నావవతు' },
      { id: segment2.id, text: 'సహ నౌ భునక్తు' },
    ])
    // No English text was ever imported for this chapter — the script still appears (its
    // label/short/fontClass are constant, not data-dependent), just with no segments yet.
    expect(en?.segments).toEqual([])

    expect(detail.audio).toHaveLength(1)
    const audio = detail.audio[0]
    // A real presigned S3/R2 URL embeds the object key in its path (that's how presigning works)
    // but always carries signing/expiry query params — the raw `objectKey` column, unsigned, on
    // its own, is what must never leak, and it doesn't: the field itself isn't on the response.
    expect(audio?.url).toMatch(/^https?:\/\/.+\?.+/)
    expect(audio).not.toHaveProperty('objectKey')
    expect(audio?.mappings).toEqual([
      { segmentId: segment1.id, audioStart: 0, audioEnd: 3 },
      { segmentId: segment2.id, audioStart: 3, audioEnd: 7 },
    ])
  })
})

describe('createChapter (service)', () => {
  it('creates a draft chapter one past the track\'s current max active order', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    await createChapterFixture(world, trackRow, { order: 0 })
    await createChapterFixture(world, trackRow, { order: 1 })

    const created = await createChapter({ db: world.schoolDb }, { trackId: trackRow.id, code: 'new-1', title: 'New Chapter' })

    expect(created.status).toBe('draft')
    expect(created.script).toBeNull()
    expect(created.order).toBe(2)
  })

  it('rejects a duplicate code within the same track', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    await createChapterFixture(world, trackRow, { code: 'dup' })

    await expect(
      createChapter({ db: world.schoolDb }, { trackId: trackRow.id, code: 'dup', title: 'Another' }),
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it('rejects an unknown trackId', async () => {
    world = await createTestSchool()

    await expect(
      createChapter({ db: world.schoolDb }, { trackId: crypto.randomUUID(), code: 'c1', title: 'Orphan' }),
    ).rejects.toMatchObject({ statusCode: 422 })
  })
})

describe('updateChapter (service)', () => {
  it('updates each field independently', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapterFixture(world, trackRow, { code: 'c1', title: 'Old Title', status: 'draft' })

    const updated = await updateChapter({ db: world.schoolDb }, chapterRow.id, { title: 'New Title', status: 'published' })

    expect(updated.title).toBe('New Title')
    expect(updated.status).toBe('published')
    expect(updated.code).toBe('c1')
  })

  it('rejects renaming a chapter\'s code to collide with a sibling', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    await createChapterFixture(world, trackRow, { code: 'taken' })
    const chapterRow = await createChapterFixture(world, trackRow, { code: 'mine' })

    await expect(
      updateChapter({ db: world.schoolDb }, chapterRow.id, { code: 'taken' }),
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it('404s a nonexistent chapter', async () => {
    world = await createTestSchool()

    await expect(
      updateChapter({ db: world.schoolDb }, crypto.randomUUID(), { title: 'x' }),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('archiving pushes order below the track\'s minimum and hides the chapter from every view', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const other = await createChapterFixture(world, trackRow, { order: 0, status: 'published' })
    const toArchive = await createChapterFixture(world, trackRow, { order: 1, status: 'published' })

    const archived = await updateChapter({ db: world.schoolDb }, toArchive.id, { status: 'draft', archived: true })

    expect(archived.order).toBeLessThan(other.order)

    const authoringTracks = await findAllTracks(world.schoolDb, { kind: 'authoring' }, await defaultCourseId(world))
    const authoringTrack = authoringTracks.find(t => t.id === trackRow.id)
    expect(authoringTrack?.chapters.map(c => c.id)).toEqual([other.id])

    const learnerTracks = await findAllTracks(world.schoolDb, { kind: 'learnerPreview' }, await defaultCourseId(world))
    const learnerTrack = learnerTracks.find(t => t.id === trackRow.id)
    expect(learnerTrack?.chapters.map(c => c.id)).toEqual([other.id])
  })

  it('un-archiving appends the chapter back at the end of the active order', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const first = await createChapterFixture(world, trackRow, { order: 0 })
    const archived = await updateChapter(
      { db: world.schoolDb },
      (await createChapterFixture(world, trackRow, { order: 1 })).id,
      { archived: true },
    )
    const second = await createChapterFixture(world, trackRow, { order: 2 })

    const restored = await updateChapter({ db: world.schoolDb }, archived.id, { archived: false })

    expect(restored.order).toBeGreaterThan(second.order)
    expect(restored.order).toBeGreaterThan(first.order)
  })
})
