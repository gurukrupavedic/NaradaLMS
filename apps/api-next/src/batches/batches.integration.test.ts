import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'

import { track } from '@narada/db'

import * as examRepository from '../exams/repository'
import { destroyTestWorld } from '../testing/cleanup'
import { pgErrorCode } from '../testing/concurrency'
import { createBatch, createChapter, createProfile, createTestSchool, createTrack, type TestWorld } from '../testing/fixtures'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

describe('exam foreign-key integrity (matrix item 8)', () => {
  it('raises a 23503 for an exam referencing a nonexistent chapterId', async () => {
    world = await createTestSchool()
    const studentProfile = await createProfile(world)
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)

    await expect(
      examRepository.insert(world.schoolDb, {
        chapterId: crypto.randomUUID(),
        studentId: studentProfile.id,
        scheduledAt: new Date(),
        batchId: batchRow.id,
      }),
    ).rejects.toSatisfy((error: unknown) => pgErrorCode(error) === '23503')
  })

  it('raises a 23503 for an exam referencing a nonexistent studentId', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapter(world, trackRow)
    const batchRow = await createBatch(world, trackRow)

    await expect(
      examRepository.insert(world.schoolDb, {
        chapterId: chapterRow.id,
        studentId: crypto.randomUUID(),
        scheduledAt: new Date(),
        batchId: batchRow.id,
      }),
    ).rejects.toSatisfy((error: unknown) => pgErrorCode(error) === '23503')
  })
})

describe('track deletion constraint behavior (matrix item 9)', () => {
  it('cascades: deleting a track deletes its chapters too (chapter.trackId is onDelete: cascade)', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const chapterRow = await createChapter(world, trackRow)

    await world.schoolDb.delete(track).where(eq(track.id, trackRow.id))

    const stillThere = await world.schoolDb.query.chapter.findFirst({
      where: (t, { eq: eqCol }) => eqCol(t.id, chapterRow.id),
    })
    expect(stillThere).toBeUndefined()
  })

  it(
    'restricts: deleting a track still referenced by a batch raises a 23503 ' +
      "(batch.trackId has no onDelete action, i.e. restrict)",
    async () => {
      world = await createTestSchool()
      const trackRow = await createTrack(world)
      await createBatch(world, trackRow)

      await expect(
        world.schoolDb.delete(track).where(eq(track.id, trackRow.id)),
      ).rejects.toSatisfy((error: unknown) => pgErrorCode(error) === '23503')

      const stillThere = await world.schoolDb.query.track.findFirst({
        where: (t, { eq: eqCol }) => eqCol(t.id, trackRow.id),
      })
      expect(stillThere).toBeDefined()
    },
  )

  it(
    'the restrict from a batch reference blocks the whole statement even when a cascadable ' +
      'chapter reference is also present — the chapter is not deleted either (atomic statement)',
    async () => {
      world = await createTestSchool()
      const trackRow = await createTrack(world)
      const chapterRow = await createChapter(world, trackRow)
      await createBatch(world, trackRow)

      await expect(
        world.schoolDb.delete(track).where(eq(track.id, trackRow.id)),
      ).rejects.toSatisfy((error: unknown) => pgErrorCode(error) === '23503')

      const chapterStillThere = await world.schoolDb.query.chapter.findFirst({
        where: (t, { eq: eqCol }) => eqCol(t.id, chapterRow.id),
      })
      expect(chapterStillThere).toBeDefined()
    },
  )
})
