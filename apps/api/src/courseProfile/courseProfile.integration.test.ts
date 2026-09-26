import { and, eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'

import { courseProfile } from '@narada/db'

import type { User } from '../session'
import type { AccessPolicy } from '../utils/accessPolicy'
import { destroyTestWorld } from '../testing/cleanup'
import { createCourse, createProfile, createTestSchool, type TestWorld } from '../testing/fixtures'
import * as repository from './repository'
import { addToCounter, updateCourseProfile } from './service'

// The service only ever calls `access.isSchoolAdmin()`, and only needs the school's and course's
// slugs — a minimal fake avoids a real membership round trip in tests that aren't about access.
function access(isSchoolAdmin: boolean): AccessPolicy {
  return { isSchoolAdmin: () => isSchoolAdmin } as unknown as AccessPolicy
}

const owner = { id: 'user-course', isSuperAdmin: false } as User
const stranger = { id: 'someone-else', isSuperAdmin: false } as User

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

/** A world with SLMTS's Vedam course (`ved`, the one that keeps a `japam` counter) already in it. */
async function seed() {
  const w = await createTestSchool()
  const ved = await createCourse(w, { slug: 'ved', name: 'Vedam' })
  return { w, ved }
}
type Seed = Awaited<ReturnType<typeof seed>>

function as(
  s: Seed,
  user: User,
  isSchoolAdmin = false,
  where: { school: string; course: { id: string; slug: string } } = {
    school: 'slmts',
    course: s.ved,
  },
) {
  return {
    db: s.w.schoolDb,
    school: { slug: where.school },
    course: { id: where.course.id, slug: where.course.slug },
    user,
    access: access(isSchoolAdmin),
  }
}

async function detailsOf(s: Seed, profileId: string, courseId = s.ved.id) {
  return (await repository.find(s.w.schoolDb, profileId, courseId))?.details
}

describe('addToCounter', () => {
  it('starts a profile with no course-level row at the amount added, then accumulates', async () => {
    const s = await seed()
    world = s.w
    const p = await createProfile(s.w, { userId: owner.id })

    expect(await detailsOf(s, p.id)).toBeUndefined()
    expect(await addToCounter(as(s, owner), p.id, 'japam', 108)).toEqual({
      key: 'japam',
      total: 108,
    })
    expect(await addToCounter(as(s, owner), p.id, 'japam', 54)).toEqual({
      key: 'japam',
      total: 162,
    })
    expect(await detailsOf(s, p.id)).toEqual({ japam: 162 })
  })

  it('counts every one of many concurrent adds, even the ones that race to create the row', async () => {
    const s = await seed()
    world = s.w
    const p = await createProfile(s.w, { userId: owner.id })

    await Promise.all(
      Array.from({ length: 25 }, () => addToCounter(as(s, owner), p.id, 'japam', 10)),
    )

    expect(await detailsOf(s, p.id)).toEqual({ japam: 250 })
  })

  it('leaves the other details in the row alone', async () => {
    const s = await seed()
    world = s.w
    const p = await createProfile(s.w, { userId: owner.id })
    await repository.insert(s.w.schoolDb, {
      profileId: p.id,
      courseId: s.ved.id,
      details: { note: 'kept' },
    })

    await addToCounter(as(s, owner), p.id, 'japam', 7)

    expect(await detailsOf(s, p.id)).toEqual({ note: 'kept', japam: 7 })
  })

  it('refuses an add that would pass the cap, and leaves the total as it was', async () => {
    const s = await seed()
    world = s.w
    const p = await createProfile(s.w, { userId: owner.id })
    await repository.insert(s.w.schoolDb, {
      profileId: p.id,
      courseId: s.ved.id,
      details: { japam: 999_999_999 },
    })

    await expect(addToCounter(as(s, owner), p.id, 'japam', 2)).rejects.toMatchObject({
      statusCode: 422,
    })
    expect(await detailsOf(s, p.id)).toEqual({ japam: 999_999_999 })
    // Exactly up to the cap is fine.
    expect(await addToCounter(as(s, owner), p.id, 'japam', 1)).toEqual({
      key: 'japam',
      total: 1_000_000_000,
    })
  })

  it('does not mix up two profiles', async () => {
    const s = await seed()
    world = s.w
    const one = await createProfile(s.w, { userId: owner.id })
    const two = await createProfile(s.w, { userId: owner.id })

    await addToCounter(as(s, owner), one.id, 'japam', 7)
    await addToCounter(as(s, owner), two.id, 'japam', 11)

    expect(await detailsOf(s, one.id)).toEqual({ japam: 7 })
    expect(await detailsOf(s, two.id)).toEqual({ japam: 11 })
  })

  it('does not exist where the course declares no such counter', async () => {
    const s = await seed()
    world = s.w
    const other = await createCourse(s.w, { slug: 'other', name: 'Other' })
    const p = await createProfile(s.w, { userId: owner.id })
    const rr = as(s, owner, false, { school: 'rr', course: { id: s.ved.id, slug: 'pur' } })

    await expect(
      addToCounter(as(s, owner, false, { school: 'slmts', course: other }), p.id, 'japam', 1),
    ).rejects.toMatchObject({ statusCode: 404 })
    await expect(addToCounter(rr, p.id, 'japam', 1)).rejects.toMatchObject({ statusCode: 404 })
    await expect(addToCounter(as(s, owner), p.id, 'parayanam', 1)).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(await detailsOf(s, p.id)).toBeUndefined()
  })
})

describe('per course', () => {
  it("keeps one profile's course-level details separate in each course", async () => {
    const s = await seed()
    world = s.w
    const other = await createCourse(s.w, { slug: 'other', name: 'Other' })
    const p = await createProfile(s.w, { userId: owner.id })

    await repository.insert(s.w.schoolDb, {
      profileId: p.id,
      courseId: s.ved.id,
      details: { japam: 1 },
    })
    await repository.insert(s.w.schoolDb, {
      profileId: p.id,
      courseId: other.id,
      details: { japam: 2 },
    })
    await repository.addToCounter(s.w.schoolDb, p.id, s.ved.id, 'japam', 10, 1_000_000_000)

    expect(await detailsOf(s, p.id, s.ved.id)).toEqual({ japam: 11 })
    expect(await detailsOf(s, p.id, other.id)).toEqual({ japam: 2 })
  })

  it('has at most one row per profile per course', async () => {
    const s = await seed()
    world = s.w
    const p = await createProfile(s.w, { userId: owner.id })

    await repository.insert(s.w.schoolDb, {
      profileId: p.id,
      courseId: s.ved.id,
      details: { japam: 1 },
    })
    await repository.insert(s.w.schoolDb, {
      profileId: p.id,
      courseId: s.ved.id,
      details: { japam: 99 },
    })

    const rows = await s.w.schoolDb
      .select()
      .from(courseProfile)
      .where(and(eq(courseProfile.profileId, p.id), eq(courseProfile.courseId, s.ved.id)))
    expect(rows.map(r => r.details)).toEqual([{ japam: 1 }])
  })
})

describe('updateCourseProfile', () => {
  it('sets a counter outright, creating the row if there is none', async () => {
    const s = await seed()
    world = s.w
    const p = await createProfile(s.w, { userId: owner.id })

    expect(
      (await updateCourseProfile(as(s, owner), p.id, { details: { japam: 500 } })).details,
    ).toEqual({ japam: 500 })
    expect(
      (await updateCourseProfile(as(s, owner), p.id, { details: { japam: 40 } })).details,
    ).toEqual({ japam: 40 })
    expect(await detailsOf(s, p.id)).toEqual({ japam: 40 })
  })

  it('writes the three answers as columns, keeping details, and clears one with null', async () => {
    const s = await seed()
    world = s.w
    const p = await createProfile(s.w, { userId: owner.id })
    await addToCounter(as(s, owner), p.id, 'japam', 9)

    const set = await updateCourseProfile(as(s, owner), p.id, {
      learningGoal: 'Recite the Vedam',
      currentProficiency: 'level1',
      comments: 'Evenings only',
    })
    expect(set).toEqual({
      learningGoal: 'Recite the Vedam',
      currentProficiency: 'level1',
      comments: 'Evenings only',
      details: { japam: 9 },
    })

    const cleared = await updateCourseProfile(as(s, owner), p.id, { comments: null })
    expect(cleared).toMatchObject({ learningGoal: 'Recite the Vedam', comments: null })
  })

  it('keeps the three answers per course, like details', async () => {
    const s = await seed()
    world = s.w
    const other = await createCourse(s.w, { slug: 'other', name: 'Other' })
    const p = await createProfile(s.w, { userId: owner.id })

    await updateCourseProfile(as(s, owner), p.id, { learningGoal: 'in ved' })
    await updateCourseProfile(as(s, owner, false, { school: 'slmts', course: other }), p.id, {
      learningGoal: 'in other',
    })

    expect((await repository.find(s.w.schoolDb, p.id, s.ved.id))?.learningGoal).toBe('in ved')
    expect((await repository.find(s.w.schoolDb, p.id, other.id))?.learningGoal).toBe('in other')
  })

  it('a rejected edit leaves nothing behind — not even the row it would have created', async () => {
    const s = await seed()
    world = s.w
    const p = await createProfile(s.w, { userId: owner.id })

    await expect(
      updateCourseProfile(as(s, owner), p.id, { details: { japam: -1 } }),
    ).rejects.toMatchObject({
      statusCode: 400,
    })
    await expect(
      updateCourseProfile(as(s, owner), p.id, { details: { unknown: 'x' } }),
    ).rejects.toMatchObject({
      statusCode: 400,
    })

    expect(await detailsOf(s, p.id)).toBeUndefined()
  })

  it('serialises concurrent edits, so neither undoes the other', async () => {
    const s = await seed()
    world = s.w
    const p = await createProfile(s.w, { userId: owner.id })
    await repository.insert(s.w.schoolDb, {
      profileId: p.id,
      courseId: s.ved.id,
      details: { japam: 5 },
    })

    // Forced interleaving (two racing calls would just happen to run back to back): a transaction
    // takes the row lock and only writes its change once the edit under test has had time to start.
    // Without the lock, that edit reads the *old* details in the meantime and its write later
    // overwrites this one's `note`.
    let lockTaken!: () => void
    const taken = new Promise<void>(resolve => (lockTaken = resolve))
    let letGo!: () => void
    const goAhead = new Promise<void>(resolve => (letGo = resolve))
    const holder = s.w.schoolDb.transaction(async tx => {
      await repository.lock(tx, p.id, s.ved.id)
      lockTaken()
      await goAhead
      await repository.update(tx, p.id, s.ved.id, {
        details: { japam: 5, note: 'from the other edit' },
      })
    })

    await taken
    const edit = updateCourseProfile(as(s, owner), p.id, { details: { japam: 6 } })
    await new Promise(resolve => setTimeout(resolve, 150))
    letGo()
    await Promise.all([holder, edit])

    expect(await detailsOf(s, p.id)).toEqual({ japam: 6, note: 'from the other edit' })
  })
})

describe('who may write', () => {
  it("404s someone else's profile for a non-admin, and writes nothing", async () => {
    const s = await seed()
    world = s.w
    const p = await createProfile(s.w, { userId: owner.id })

    await expect(addToCounter(as(s, stranger), p.id, 'japam', 1)).rejects.toMatchObject({
      statusCode: 404,
    })
    await expect(
      updateCourseProfile(as(s, stranger), p.id, { details: { japam: 1 } }),
    ).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(await detailsOf(s, p.id)).toBeUndefined()
  })

  it('lets a school admin add to and set anyone’s', async () => {
    const s = await seed()
    world = s.w
    const p = await createProfile(s.w, { userId: owner.id })

    await addToCounter(as(s, stranger, true), p.id, 'japam', 30)
    await updateCourseProfile(as(s, stranger, true), p.id, { details: { japam: 20 } })

    expect(await detailsOf(s, p.id)).toEqual({ japam: 20 })
  })
})
