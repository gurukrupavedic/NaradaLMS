import { afterEach, describe, expect, it } from 'vitest'

import type { AccessPolicy } from '../utils/accessPolicy'
import { destroyTestWorld } from '../testing/cleanup'
import {
  createChapter,
  createCourse,
  createEvaluation,
  createExamSlot,
  createExamSlotRequest,
  createProfile,
  createTestSchool,
  createTrack,
  defaultCourseId,
  type TestWorld,
} from '../testing/fixtures'
import { findEligibleTrackIds, isCertifiedAcrossTrack } from '../exams/repository'
import { findManyRequests, findManySlots, findRequestById } from './repository'
import { cancelSlot } from './service'

// cancelSlot's own doc comment on why this is a bare object rather than a real `AccessPolicy.load`
// call: what's under test here is the real transaction against real Postgres (the compare-and-set,
// and the conditional reject of a pending request), not authorization, which is already covered by
// `service.test.ts`'s "checks school-admin authorization" case and `accessPolicy.test.ts` directly.
const grantingAccess = { requireCanCreateExam: () => undefined } as unknown as AccessPolicy

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

const slotPage = { limit: 20, trackId: undefined, status: undefined, cursor: undefined }
const requestPage = { limit: 20, status: undefined, cursor: undefined }

describe('findManySlots', () => {
  it('eager-loads the track name and orders soonest-first', async () => {
    const w = await createTestSchool()
    world = w
    const trackRow = await createTrack(w, { name: 'Rudram' })
    const admin = await createProfile(w, { name: 'Admin' })
    const later = await createExamSlot(w, {
      track: trackRow,
      openedBy: admin,
      scheduledAt: new Date('2026-03-01T10:00:00Z'),
    })
    const sooner = await createExamSlot(w, {
      track: trackRow,
      openedBy: admin,
      scheduledAt: new Date('2026-02-01T10:00:00Z'),
    })

    const { items } = await findManySlots(w.schoolDb, slotPage, await defaultCourseId(w))

    expect(items.map(item => item.id)).toEqual([sooner.id, later.id])
    expect(items[0]!.trackName).toBe('Rudram')
  })

  it('filters by trackId and by status', async () => {
    const w = await createTestSchool()
    world = w
    const trackA = await createTrack(w)
    const trackB = await createTrack(w)
    const admin = await createProfile(w, { name: 'Admin' })
    const openInA = await createExamSlot(w, { track: trackA, openedBy: admin, status: 'open' })
    await createExamSlot(w, { track: trackA, openedBy: admin, status: 'booked' })
    await createExamSlot(w, { track: trackB, openedBy: admin, status: 'open' })

    const { items } = await findManySlots(
      w.schoolDb,
      { ...slotPage, trackId: trackA.id, status: 'open' },
      await defaultCourseId(w),
    )

    expect(items.map(item => item.id)).toEqual([openInA.id])
  })

  it('scopes to the given course — a slot on another course\'s track never shows up', async () => {
    const w = await createTestSchool()
    world = w
    const otherCourse = await createCourse(w)
    const trackInDefaultCourse = await createTrack(w)
    const trackInOtherCourse = await createTrack(w, { course: otherCourse })
    const admin = await createProfile(w, { name: 'Admin' })
    const inDefault = await createExamSlot(w, { track: trackInDefaultCourse, openedBy: admin })
    await createExamSlot(w, { track: trackInOtherCourse, openedBy: admin })

    const { items } = await findManySlots(w.schoolDb, slotPage, await defaultCourseId(w))

    expect(items.map(item => item.id)).toEqual([inDefault.id])
  })
})

describe('findManyRequests', () => {
  async function seedTwoRequests() {
    const w = await createTestSchool()
    const trackRow = await createTrack(w, { name: 'Chamakam' })
    const admin = await createProfile(w, { name: 'Admin' })
    const ravi = await createProfile(w, { name: 'Ravi Kumar' })
    const priya = await createProfile(w, { name: 'Priya Rao' })
    const slot = await createExamSlot(w, {
      track: trackRow,
      openedBy: admin,
      scheduledAt: new Date('2026-04-01T09:00:00Z'),
      status: 'requested',
    })
    const raviRequest = await createExamSlotRequest(w, { slot, student: ravi })
    const otherSlot = await createExamSlot(w, { track: trackRow, openedBy: admin, status: 'requested' })
    const priyaRequest = await createExamSlotRequest(w, {
      slot: otherSlot,
      student: priya,
      status: 'approved',
    })
    return { w, trackRow, admin, ravi, priya, slot, raviRequest, priyaRequest }
  }

  it('scope "all" returns every request in the course, scope "own" returns only that student\'s', async () => {
    const seed = await seedTwoRequests()
    world = seed.w

    const all = await findManyRequests(
      seed.w.schoolDb,
      requestPage,
      { kind: 'all' },
      await defaultCourseId(seed.w),
    )
    expect(all.items.map(i => i.id).sort()).toEqual(
      [seed.raviRequest.id, seed.priyaRequest.id].sort(),
    )

    const own = await findManyRequests(
      seed.w.schoolDb,
      requestPage,
      { kind: 'own', profileId: seed.ravi.id },
      await defaultCourseId(seed.w),
    )
    expect(own.items.map(i => i.id)).toEqual([seed.raviRequest.id])
  })

  it('filters by status', async () => {
    const seed = await seedTwoRequests()
    world = seed.w

    const { items } = await findManyRequests(
      seed.w.schoolDb,
      { ...requestPage, status: 'approved' },
      { kind: 'all' },
      await defaultCourseId(seed.w),
    )

    expect(items.map(i => i.id)).toEqual([seed.priyaRequest.id])
  })

  it('eager-loads the track name, student name, and the slot\'s own scheduled time', async () => {
    const seed = await seedTwoRequests()
    world = seed.w

    const { items } = await findManyRequests(
      seed.w.schoolDb,
      requestPage,
      { kind: 'own', profileId: seed.ravi.id },
      await defaultCourseId(seed.w),
    )

    expect(items).toEqual([
      expect.objectContaining({
        id: seed.raviRequest.id,
        trackName: 'Chamakam',
        studentName: 'Ravi Kumar',
        slotScheduledAt: new Date('2026-04-01T09:00:00Z'),
      }),
    ])
  })
})

describe('cancelSlot (real Postgres, end to end)', () => {
  it('cancels an open slot with no pending request to reject', async () => {
    const w = await createTestSchool()
    world = w
    const trackRow = await createTrack(w)
    const admin = await createProfile(w, { name: 'Admin' })
    const slot = await createExamSlot(w, { track: trackRow, openedBy: admin, status: 'open' })

    const result = await cancelSlot({ db: w.schoolDb, access: grantingAccess }, slot.id, admin.id)

    expect(result.status).toBe('cancelled')
  })

  it('cancels a requested slot and rejects the real pending request row holding it', async () => {
    const w = await createTestSchool()
    world = w
    const trackRow = await createTrack(w)
    const admin = await createProfile(w, { name: 'Admin' })
    const student = await createProfile(w, { name: 'Student' })
    const slot = await createExamSlot(w, { track: trackRow, openedBy: admin, status: 'requested' })
    const pending = await createExamSlotRequest(w, { slot, student })

    const result = await cancelSlot({ db: w.schoolDb, access: grantingAccess }, slot.id, admin.id)

    expect(result.status).toBe('cancelled')
    const updatedRequest = await findRequestById(w.schoolDb, pending.id)
    expect(updatedRequest?.status).toBe('rejected')
    expect(updatedRequest?.reviewedBy).toBe(admin.id)
    expect(updatedRequest?.examId).toBeNull()
  })

  it('409s a booked slot instead of touching it', async () => {
    const w = await createTestSchool()
    world = w
    const trackRow = await createTrack(w)
    const admin = await createProfile(w, { name: 'Admin' })
    const slot = await createExamSlot(w, { track: trackRow, openedBy: admin, status: 'booked' })

    await expect(
      cancelSlot({ db: w.schoolDb, access: grantingAccess }, slot.id, admin.id),
    ).rejects.toMatchObject({ statusCode: 409 })
  })
})

describe('eligibility (L3+ on every gradable chapter of a track)', () => {
  async function seed() {
    const w = await createTestSchool()
    const student = await createProfile(w, { name: 'Student' })
    const evaluator = await createProfile(w, { name: 'Evaluator' })
    const grade = (chapter: Awaited<ReturnType<typeof createChapter>>, level: 'level2' | 'level3' | 'level4') =>
      createEvaluation(w, { student, chapter, evaluator, level })
    return { w, student, grade }
  }

  it('lists only tracks where every published chapter is currently L3 or L4', async () => {
    const { w, student, grade } = await seed()
    world = w
    const ready = await createTrack(w)
    const oneShort = await createTrack(w)
    const ungraded = await createTrack(w)
    const empty = await createTrack(w)
    const [r1, r2] = [
      await createChapter(w, ready, { status: 'published' }),
      await createChapter(w, ready, { status: 'published' }),
    ]
    const [s1, s2] = [
      await createChapter(w, oneShort, { status: 'published' }),
      await createChapter(w, oneShort, { status: 'published' }),
    ]
    await createChapter(w, ungraded, { status: 'published' })
    await grade(r1, 'level3')
    await grade(r2, 'level4')
    await grade(s1, 'level4')
    await grade(s2, 'level2')

    const eligible = await findEligibleTrackIds(w.schoolDb, student.id, await defaultCourseId(w))

    expect(eligible).toEqual([ready.id])
    expect(eligible).not.toContain(empty.id)
    expect(await isCertifiedAcrossTrack(w.schoolDb, student.id, ready.id)).toBe(true)
    expect(await isCertifiedAcrossTrack(w.schoolDb, student.id, oneShort.id)).toBe(false)
    expect(await isCertifiedAcrossTrack(w.schoolDb, student.id, empty.id)).toBe(false)
  })

  it('uses the latest evaluation per chapter, so a later downgrade breaks eligibility', async () => {
    const { w, student, grade } = await seed()
    world = w
    const trackRow = await createTrack(w)
    const chapterRow = await createChapter(w, trackRow, { status: 'published' })
    await grade(chapterRow, 'level4')
    await grade(chapterRow, 'level2')

    expect(await findEligibleTrackIds(w.schoolDb, student.id, await defaultCourseId(w))).toEqual([])
  })

  it('ignores draft chapters and never counts another course\'s tracks', async () => {
    const { w, student, grade } = await seed()
    world = w
    const trackRow = await createTrack(w)
    const published = await createChapter(w, trackRow, { status: 'published' })
    await createChapter(w, trackRow, { status: 'draft' })
    await grade(published, 'level3')
    const otherCourse = await createCourse(w)
    const otherTrack = await createTrack(w, { course: otherCourse })
    await grade(await createChapter(w, otherTrack, { status: 'published' }), 'level4')

    expect(await findEligibleTrackIds(w.schoolDb, student.id, await defaultCourseId(w))).toEqual([trackRow.id])
  })
})
