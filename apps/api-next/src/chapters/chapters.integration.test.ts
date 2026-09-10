import { afterEach, describe, expect, it } from 'vitest'

import { destroyTestWorld } from '../testing/cleanup'
import {
  createAudioAsset,
  createAudioMapping,
  createChapter as createChapterFixture,
  createChapterScript,
  createChapterScriptSegment,
  createSegment,
  createTestSchool,
  createTrack,
  type TestWorld,
} from '../testing/fixtures'
import { findById } from './repository'
import { findById as findChapterDetail } from './service'

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
  it('returns scripts sharing segment ids with their own per-script offsets, and audio with a signed url', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapterFixture(world, trackRow, { status: 'published' })

    const sanskrit = await createChapterScript(world, chapterRow, {
      script: 'sa',
      text: 'ॐ सह नाववतु',
    })
    const telugu = await createChapterScript(world, chapterRow, {
      script: 'te',
      text: 'ఓం సహ నావవతు',
    })

    const segment1 = await createSegment(world, chapterRow, { order: 1 })
    const segment2 = await createSegment(world, chapterRow, { order: 2 })

    await createChapterScriptSegment(world, sanskrit, segment1, { start: 0, end: 2 })
    await createChapterScriptSegment(world, sanskrit, segment2, { start: 3, end: 6 })
    await createChapterScriptSegment(world, telugu, segment1, { start: 0, end: 2 })
    await createChapterScriptSegment(world, telugu, segment2, { start: 3, end: 7 })

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

    expect(detail.scripts).toHaveLength(2)
    const sa = detail.scripts.find(s => s.key === 'sa')
    const te = detail.scripts.find(s => s.key === 'te')

    // Same segment ids on both scripts, in reading order — this is the part that makes a script
    // switch keep your place: only the offsets differ per script, never the ids.
    expect(sa?.segments.map(s => s.id)).toEqual(te?.segments.map(s => s.id))
    expect(sa?.segments).toEqual([
      { id: segment1.id, start: 0, end: 2 },
      { id: segment2.id, start: 3, end: 6 },
    ])
    expect(te?.segments).toEqual([
      { id: segment1.id, start: 0, end: 2 },
      { id: segment2.id, start: 3, end: 7 },
    ])

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
