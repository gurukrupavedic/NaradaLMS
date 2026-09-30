import { afterEach, describe, expect, it } from 'vitest'

import { destroyTestWorld } from '../testing/cleanup'
import {
  createChapter,
  createDocChapter,
  createSegment,
  createSegmentText,
  createTestSchool,
  createTrack,
  type TestWorld,
} from '../testing/fixtures'
import { deleteSegment, getDocChapterDetail, mergeSegmentWithNext, splitSegment } from './service'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

describe('getDocChapterDetail', () => {
  it('returns segments in order, each with its own per-script text map', async () => {
    world = await createTestSchool()
    const docChapterRow = await createDocChapter(world, { title: 'Chapter One', track: 'TRACK 1' })
    const segment1 = await createSegment(world, docChapterRow, { order: 1 })
    const segment2 = await createSegment(world, docChapterRow, { order: 2 })
    await createSegmentText(world, segment1, { script: 'sa', text: 'ॐ शुक्लांबरधरं' })
    await createSegmentText(world, segment1, { script: 'te', text: 'ఓం శుక్లాంబరధరం' })
    await createSegmentText(world, segment2, { script: 'sa', text: 'सह नौ भुनक्तु' })

    const detail = await getDocChapterDetail(world.schoolDb, docChapterRow.id)

    expect(detail).toEqual({
      id: docChapterRow.id,
      title: 'Chapter One',
      track: 'TRACK 1',
      segments: [
        { id: segment1.id, order: 1, chapterId: null, flaggedForReview: false, scripts: { sa: 'ॐ शुक्लांबरधरं', te: 'ఓం శుక్లాంబరధరం' } },
        { id: segment2.id, order: 2, chapterId: null, flaggedForReview: false, scripts: { sa: 'सह नौ भुनक्तु' } },
      ],
    })
  })

  it('404s an unknown doc chapter', async () => {
    world = await createTestSchool()
    await expect(getDocChapterDetail(world.schoolDb, crypto.randomUUID())).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('splitSegment', () => {
  it('splits at a word boundary, renumbers, and flags both halves', async () => {
    world = await createTestSchool()
    const docChapterRow = await createDocChapter(world)
    const trackRow = await createTrack(world)
    const chapterRow = await createChapter(world, trackRow)
    const segment1 = await createSegment(world, docChapterRow, { order: 1, chapter: chapterRow })
    const segment2 = await createSegment(world, docChapterRow, { order: 2 })
    await createSegmentText(world, segment1, { script: 'sa', text: 'aaa bbb ccc ddd' })
    await createSegmentText(world, segment1, { script: 'te', text: 'unrelated telugu text' })
    await createSegmentText(world, segment2, { script: 'sa', text: 'zzz' })

    const detail = await splitSegment(world.schoolDb, docChapterRow.id, segment1.id, { script: 'sa', wordIndex: 2 })

    expect(detail.segments).toHaveLength(3)
    const [first, second, third] = detail.segments

    // First half keeps the original id, the split script's first 2 words, and its other-script
    // text untouched — but is now flagged (that other-script text may no longer correspond 1:1).
    expect(first).toMatchObject({
      id: segment1.id,
      order: 1,
      chapterId: chapterRow.id,
      flaggedForReview: true,
      scripts: { sa: 'aaa bbb', te: 'unrelated telugu text' },
    })
    // Second half is brand new, inherits the chapter assignment, has only the split script's
    // remaining words, and nothing at all for the other scripts.
    expect(second).toMatchObject({
      order: 2,
      chapterId: chapterRow.id,
      flaggedForReview: true,
      scripts: { sa: 'ccc ddd' },
    })
    expect(second?.scripts.te).toBeUndefined()
    expect(second?.id).not.toBe(segment1.id)
    // The original second segment is pushed down to order 3, untouched otherwise.
    expect(third).toMatchObject({ id: segment2.id, order: 3, scripts: { sa: 'zzz' } })
  })

  it('rejects splitting a script the segment has no text for', async () => {
    world = await createTestSchool()
    const docChapterRow = await createDocChapter(world)
    const segment1 = await createSegment(world, docChapterRow, { order: 1 })
    await createSegmentText(world, segment1, { script: 'sa', text: 'aaa bbb' })

    await expect(
      splitSegment(world.schoolDb, docChapterRow.id, segment1.id, { script: 'te', wordIndex: 1 }),
    ).rejects.toMatchObject({ statusCode: 422 })
  })

  it('rejects a wordIndex at or past the end of the text', async () => {
    world = await createTestSchool()
    const docChapterRow = await createDocChapter(world)
    const segment1 = await createSegment(world, docChapterRow, { order: 1 })
    await createSegmentText(world, segment1, { script: 'sa', text: 'aaa bbb' })

    await expect(
      splitSegment(world.schoolDb, docChapterRow.id, segment1.id, { script: 'sa', wordIndex: 2 }),
    ).rejects.toMatchObject({ statusCode: 422 })
  })

  it('404s a segment id that belongs to a different doc chapter', async () => {
    world = await createTestSchool()
    const docChapterA = await createDocChapter(world, { title: 'A' })
    const docChapterB = await createDocChapter(world, { title: 'B' })
    const segmentInB = await createSegment(world, docChapterB, { order: 1 })
    await createSegmentText(world, segmentInB, { script: 'sa', text: 'aaa bbb' })

    await expect(
      splitSegment(world.schoolDb, docChapterA.id, segmentInB.id, { script: 'sa', wordIndex: 1 }),
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('mergeSegmentWithNext', () => {
  it('concatenates each script (space-joined) and keeps the first segment\'s id', async () => {
    world = await createTestSchool()
    const docChapterRow = await createDocChapter(world)
    const segment1 = await createSegment(world, docChapterRow, { order: 1, flaggedForReview: true })
    const segment2 = await createSegment(world, docChapterRow, { order: 2 })
    const segment3 = await createSegment(world, docChapterRow, { order: 3 })
    await createSegmentText(world, segment1, { script: 'sa', text: 'aaa' })
    await createSegmentText(world, segment1, { script: 'te', text: 'xxx' })
    await createSegmentText(world, segment2, { script: 'sa', text: 'bbb' })
    await createSegmentText(world, segment3, { script: 'sa', text: 'ccc' })

    const detail = await mergeSegmentWithNext(world.schoolDb, docChapterRow.id, segment1.id)

    expect(detail.segments).toHaveLength(2)
    expect(detail.segments[0]).toMatchObject({
      id: segment1.id,
      order: 1,
      flaggedForReview: true, // carried over from the first segment
      scripts: { sa: 'aaa bbb', te: 'xxx' },
    })
    expect(detail.segments[1]).toMatchObject({ id: segment3.id, order: 2, scripts: { sa: 'ccc' } })
  })

  it('adopts whichever side has a chapter assignment when only one does', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapter(world, trackRow)
    const docChapterRow = await createDocChapter(world)
    const segment1 = await createSegment(world, docChapterRow, { order: 1 })
    const segment2 = await createSegment(world, docChapterRow, { order: 2, chapter: chapterRow })
    await createSegmentText(world, segment1, { script: 'sa', text: 'aaa' })
    await createSegmentText(world, segment2, { script: 'sa', text: 'bbb' })

    const detail = await mergeSegmentWithNext(world.schoolDb, docChapterRow.id, segment1.id)

    expect(detail.segments[0]?.chapterId).toBe(chapterRow.id)
  })

  it('rejects merging segments assigned to two different chapters', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterA = await createChapter(world, trackRow)
    const chapterB = await createChapter(world, trackRow)
    const docChapterRow = await createDocChapter(world)
    const segment1 = await createSegment(world, docChapterRow, { order: 1, chapter: chapterA })
    const segment2 = await createSegment(world, docChapterRow, { order: 2, chapter: chapterB })
    await createSegmentText(world, segment1, { script: 'sa', text: 'aaa' })
    await createSegmentText(world, segment2, { script: 'sa', text: 'bbb' })

    await expect(mergeSegmentWithNext(world.schoolDb, docChapterRow.id, segment1.id)).rejects.toMatchObject({
      statusCode: 422,
    })
  })

  it('rejects merging the last segment (no next segment)', async () => {
    world = await createTestSchool()
    const docChapterRow = await createDocChapter(world)
    const segment1 = await createSegment(world, docChapterRow, { order: 1 })
    await createSegmentText(world, segment1, { script: 'sa', text: 'aaa' })

    await expect(mergeSegmentWithNext(world.schoolDb, docChapterRow.id, segment1.id)).rejects.toMatchObject({
      statusCode: 422,
    })
  })
})

describe('deleteSegment', () => {
  it('hard deletes and renumbers the remaining segments', async () => {
    world = await createTestSchool()
    const docChapterRow = await createDocChapter(world)
    const segment1 = await createSegment(world, docChapterRow, { order: 1 })
    const segment2 = await createSegment(world, docChapterRow, { order: 2 })
    const segment3 = await createSegment(world, docChapterRow, { order: 3 })
    await createSegmentText(world, segment1, { script: 'sa', text: 'aaa' })
    await createSegmentText(world, segment2, { script: 'sa', text: 'bbb' })
    await createSegmentText(world, segment3, { script: 'sa', text: 'ccc' })

    const detail = await deleteSegment(world.schoolDb, docChapterRow.id, segment2.id)

    expect(detail.segments).toEqual([
      { id: segment1.id, order: 1, chapterId: null, flaggedForReview: false, scripts: { sa: 'aaa' } },
      { id: segment3.id, order: 2, chapterId: null, flaggedForReview: false, scripts: { sa: 'ccc' } },
    ])
  })

  it('404s an unknown segment', async () => {
    world = await createTestSchool()
    const docChapterRow = await createDocChapter(world)

    await expect(deleteSegment(world.schoolDb, docChapterRow.id, crypto.randomUUID())).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})
