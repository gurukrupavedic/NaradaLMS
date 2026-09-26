import { afterEach, describe, expect, it } from 'vitest'

import type { User } from '../session'
import { AccessPolicy } from '../utils/accessPolicy'
import { getDashboardData } from '../dashboard/service'
import { destroyTestWorld } from '../testing/cleanup'
import {
  createBatch,
  createMembership,
  createProfile,
  createTestSchool,
  createTrack,
  createUser,
  enroll,
  type TestWorld,
  defaultCourseId,
} from '../testing/fixtures'
import * as repository from './repository'
import { findById, updateProfile } from './service'

// `updateProfile` only ever calls `access.isSchoolAdmin()` — a minimal fake avoids
// spinning up a real membership/AccessPolicy.load round trip in tests that don't otherwise need one.
function access(isSchoolAdmin: boolean): AccessPolicy {
  return { isSchoolAdmin: () => isSchoolAdmin } as unknown as AccessPolicy
}

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

describe('updateProfile (student self-edit) — countryTimeZone re-derivation', () => {
  function actor(userId: string): User {
    return { id: userId, isSuperAdmin: false } as User
  }

  it('derives countryTimeZone from the patch, merged onto the existing city, when state/country change but city does not', async () => {
    world = await createTestSchool()
    const profileRow = await createProfile(world, { userId: 'user-tz-1', city: 'Cambridge' })
    const orgSchool = { id: world.orgId } as unknown as Parameters<
      typeof updateProfile
    >[0]['school']
    const context = { db: world.schoolDb, school: orgSchool, user: actor('user-tz-1'), access: access(false) }

    const updated = await updateProfile(context, profileRow.id, { state: 'MA', country: 'US' })

    expect(updated.countryTimeZone).toBe('America/New_York')
    expect(updated.city).toBe('Cambridge')
  })

  it('leaves a previously derived countryTimeZone untouched when the patch touches neither city, state, nor country', async () => {
    world = await createTestSchool()
    const profileRow = await createProfile(world, { userId: 'user-tz-2', city: 'Cambridge' })
    const orgSchool = { id: world.orgId } as unknown as Parameters<
      typeof updateProfile
    >[0]['school']
    const context = { db: world.schoolDb, school: orgSchool, user: actor('user-tz-2'), access: access(false) }

    await updateProfile(context, profileRow.id, { state: 'MA', country: 'US' })
    const updated = await updateProfile(context, profileRow.id, { name: 'Renamed' })

    expect(updated.name).toBe('Renamed')
    expect(updated.countryTimeZone).toBe('America/New_York')
  })

  it('re-derives from scratch when city changes but state/country do not', async () => {
    world = await createTestSchool()
    const profileRow = await createProfile(world, { userId: 'user-tz-3', city: 'Cambridge' })
    const orgSchool = { id: world.orgId } as unknown as Parameters<
      typeof updateProfile
    >[0]['school']
    const context = { db: world.schoolDb, school: orgSchool, user: actor('user-tz-3'), access: access(false) }

    await updateProfile(context, profileRow.id, { state: 'TG', country: 'IN' })
    const updated = await updateProfile(context, profileRow.id, { city: 'Hyderabad' })

    expect(updated.countryTimeZone).toBe('Asia/Kolkata')
  })

  it('a non-admin editing a profile that is not theirs 404s, the same as a missing one', async () => {
    world = await createTestSchool()
    const profileRow = await createProfile(world, { userId: 'user-owner', name: 'Original Name' })
    const orgSchool = { id: world.orgId } as unknown as Parameters<typeof updateProfile>[0]['school']
    const context = { db: world.schoolDb, school: orgSchool, user: actor('someone-else'), access: access(false) }

    await expect(updateProfile(context, profileRow.id, { name: 'Hijacked' })).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})

describe('updateProfile details (school-specific fields)', () => {
  // Only `school.slug` matters to the details rules (the definitions are keyed by it), so the
  // world's own random-slugged school is stood in for by an SLMTS-shaped one.
  const slmts = (w: TestWorld) =>
    ({ id: w.orgId, slug: 'slmts' }) as unknown as Parameters<typeof updateProfile>[0]['school']
  const owner = { id: 'user-details', isSuperAdmin: false } as User
  const stored = { gothram: 'Bharadwaja', married: false, gothramMother: 'Vasishta' }

  it('merges a patch onto the stored details and persists it', async () => {
    world = await createTestSchool()
    const profileRow = await createProfile(world, { userId: 'user-details', details: stored })
    const context = { db: world.schoolDb, school: slmts(world), user: owner, access: access(false) }

    const updated = await updateProfile(context, profileRow.id, { details: { gothramMother: 'Kashyapa' } })

    expect(updated.details).toEqual({ gothram: 'Bharadwaja', married: false, gothramMother: 'Kashyapa' })
    expect((await findById({ db: world.schoolDb, school: slmts(world), user: owner }, profileRow.id)).details).toEqual(
      updated.details,
    )
  })

  it('a rejected patch changes nothing, columns included', async () => {
    world = await createTestSchool()
    const profileRow = await createProfile(world, { userId: 'user-details', name: 'Before', details: stored })
    const context = { db: world.schoolDb, school: slmts(world), user: owner, access: access(false) }

    // Ticking married without the spouse's gothram is refused, and the name in the same patch must
    // not be written either — the edit is all or nothing.
    await expect(
      updateProfile(context, profileRow.id, { name: 'After', details: { married: true } }),
    ).rejects.toMatchObject({ statusCode: 400, message: 'details.gothramSpouse: is required' })

    const after = await findById({ db: world.schoolDb, school: slmts(world), user: owner }, profileRow.id)
    expect(after.name).toBe('Before')
    expect(after.details).toEqual(stored)
  })

  it('serialises concurrent edits, so neither undoes the other', async () => {
    world = await createTestSchool()
    const profileRow = await createProfile(world, { userId: 'user-details', details: stored })
    const context = { db: world.schoolDb, school: slmts(world), user: owner, access: access(false) }

    // Forced interleaving (two racing calls would just happen to run back to back): a transaction
    // takes the row lock and only writes its change once the edit under test has had time to
    // start. Without the lock, that edit reads the *old* details in the meantime and its write
    // later overwrites this one's `gothram`.
    let lockTaken!: () => void
    const taken = new Promise<void>(resolve => (lockTaken = resolve))
    let letGo!: () => void
    const goAhead = new Promise<void>(resolve => (letGo = resolve))
    const holder = world.schoolDb.transaction(async tx => {
      await repository.findDetailsForUpdate(tx, profileRow.id, null)
      lockTaken()
      await goAhead
      await repository.update(tx, profileRow.id, null, { details: { ...stored, gothram: 'Atreya' } })
    })

    await taken
    const edit = updateProfile(context, profileRow.id, { details: { gothramMother: 'Kashyapa' } })
    await new Promise(resolve => setTimeout(resolve, 150))
    letGo()
    await Promise.all([holder, edit])

    const after = await findById({ db: world.schoolDb, school: slmts(world), user: owner }, profileRow.id)
    expect(after.details).toEqual({ gothram: 'Atreya', married: false, gothramMother: 'Kashyapa' })
  })

  it("404s another user's profile without touching it", async () => {
    world = await createTestSchool()
    const profileRow = await createProfile(world, { userId: 'someone-else', details: stored })
    const context = { db: world.schoolDb, school: slmts(world), user: owner, access: access(false) }

    await expect(
      updateProfile(context, profileRow.id, { details: { gothram: 'Hijacked' } }),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('lets a school admin edit anyone’s details', async () => {
    world = await createTestSchool()
    const profileRow = await createProfile(world, { userId: 'someone-else', details: stored })
    const context = { db: world.schoolDb, school: slmts(world), user: owner, access: access(true) }

    const updated = await updateProfile(context, profileRow.id, { details: { gothram: 'Atreya' } })

    expect(updated.details).toMatchObject({ gothram: 'Atreya' })
  })
})

describe('updateProfile (school admin correcting another profile)', () => {
  function actor(userId: string): User {
    return { id: userId, isSuperAdmin: false } as User
  }

  it('edits a profile with no ownership check — the patch applies even though the actor is not its owner', async () => {
    world = await createTestSchool()
    const profileRow = await createProfile(world, { userId: 'user-owner', name: 'Original Name' })
    const orgSchool = { id: world.orgId } as unknown as Parameters<typeof updateProfile>[0]['school']
    const context = { db: world.schoolDb, school: orgSchool, user: actor('user-admin'), access: access(true) }

    const updated = await updateProfile(context, profileRow.id, { name: 'Corrected Name' })

    expect(updated.name).toBe('Corrected Name')
  })

  it('re-derives countryTimeZone from the effective location, same as the owner-edit path', async () => {
    world = await createTestSchool()
    const profileRow = await createProfile(world, { userId: 'user-owner-2', city: 'Cambridge' })
    const orgSchool = { id: world.orgId } as unknown as Parameters<typeof updateProfile>[0]['school']
    const context = { db: world.schoolDb, school: orgSchool, user: actor('user-admin'), access: access(true) }

    const updated = await updateProfile(context, profileRow.id, { state: 'MA', country: 'US' })

    expect(updated.countryTimeZone).toBe('America/New_York')
    expect(updated.city).toBe('Cambridge')
  })

  it('404s for a nonexistent profile id', async () => {
    world = await createTestSchool()
    const orgSchool = { id: world.orgId } as unknown as Parameters<typeof updateProfile>[0]['school']
    const context = { db: world.schoolDb, school: orgSchool, user: actor('user-admin'), access: access(true) }

    await expect(
      updateProfile(context, crypto.randomUUID(), { name: 'New Name' }),
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('search (admin "enroll a student" support)', () => {
  it('matches by case-insensitive substring and orders by name', async () => {
    world = await createTestSchool()
    await createProfile(world, { name: 'Bea Baker' })
    await createProfile(world, { name: 'Ada Anderson' })
    await createProfile(world, { name: 'Zed Zephyr' })

    const results = await repository.search(world.schoolDb, { query: 'a' })

    expect(results.map(r => r.name)).toEqual(['Ada Anderson', 'Bea Baker'])
  })

  it('matches every word of a multi-word query regardless of order', async () => {
    world = await createTestSchool()
    const match = await createProfile(world, { name: 'Ravi Kumar' })
    await createProfile(world, { name: 'Someone Else' })

    // "kumar ravi" is not a substring of "Ravi Kumar" — a plain `ilike` over the full query would
    // miss this even though every word the reader typed is right there.
    const results = await repository.search(world.schoolDb, { query: 'kumar ravi' })

    expect(results.map(r => r.id)).toEqual([match.id])
  })

  it('matches by email or phone as well as name', async () => {
    world = await createTestSchool()
    const byEmail = await createProfile(world, { name: 'Ada Anderson', email: 'ada.a@example.org' })
    const byPhone = await createProfile(world, { name: 'Bea Baker', phone: '+919885981818' })
    await createProfile(world, { name: 'Zed Zephyr', email: 'zed@example.org', phone: '+14155550100' })

    const emailResults = await repository.search(world.schoolDb, { query: 'ada.a@example' })
    const phoneResults = await repository.search(world.schoolDb, { query: '98859 81818' })
    const partialPhone = await repository.search(world.schoolDb, { query: '9885981818' })

    expect(emailResults.map(r => r.id)).toEqual([byEmail.id])
    // Two words that are each a substring of the stored number — the same whitespace-token rule
    // a name uses, which is what lets a spaced-out "98859 81818" find "+919885981818".
    expect(phoneResults.map(r => r.id)).toEqual([byPhone.id])
    expect(partialPhone.map(r => r.id)).toEqual([byPhone.id])
  })

  it('finds a phone number stored without its leading "+" (a historically imported profile) when the query has one', async () => {
    world = await createTestSchool()
    // tools/src/parse/people.ts used to write `profile.phone` without the "+" it always includes
    // for `registration.phone` — fixed for new imports, but rows already imported before the fix
    // still look like this, and an admin naturally searches the way the number is displayed
    // elsewhere (with the "+").
    const importedStyle = await createProfile(world, { name: 'Imported Student', phone: '14255551234' })
    const selfRegisteredStyle = await createProfile(world, { name: 'Self Registered', phone: '+14255559999' })

    const results = await repository.search(world.schoolDb, { query: '+1425' })

    expect(results.map(r => r.id).sort()).toEqual([importedStyle.id, selfRegisteredStyle.id].sort())
  })

  it('excludes profiles already enrolled in excludeBatchId', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)
    const enrolledProfile = await createProfile(world, { name: 'Already Enrolled' })
    const unenrolledProfile = await createProfile(world, { name: 'Not Yet Enrolled' })
    await enroll(world, enrolledProfile, batchRow, 'student')

    const results = await repository.search(world.schoolDb, { excludeBatchId: batchRow.id })

    expect(results.map(r => r.id)).toContain(unenrolledProfile.id)
    expect(results.map(r => r.id)).not.toContain(enrolledProfile.id)
  })

  it('with no query and no excludeBatchId, returns every active profile up to the limit', async () => {
    world = await createTestSchool()
    await createProfile(world)
    await createProfile(world)

    const results = await repository.search(world.schoolDb, {})

    expect(results.length).toBeGreaterThanOrEqual(2)
  })
})

// The profile detail page's whole access story, end to end against a real database — the pieces
// `profiles/route.ts`'s `GET /:profileId/detail` composes: `AccessPolicy#requireCanViewProfile`
// (unit-tested against mocks in `utils/accessPolicy.test.ts`), `findById`, and the dashboard
// domain's already-parametrized `getDashboardData`.
describe('profile detail access (self, admin, shared teacher, stranger)', () => {
  function actor(userId: string): User {
    return { id: userId, isSuperAdmin: false } as User
  }

  it('a student can view their own profile', async () => {
    world = await createTestSchool()
    const userRow = await createUser(world)
    await createMembership(world, userRow.id, { role: 'member' })
    const studentProfile = await createProfile(world, { userId: userRow.id })
    const orgSchool = { id: world.orgId } as unknown as Parameters<
      typeof AccessPolicy.load
    >[0]['school']

    const access = await AccessPolicy.load({
      db: world.schoolDb,
      school: orgSchool,
      user: actor(userRow.id),
      profile: studentProfile,
    })

    await expect(access.requireCanViewProfile(studentProfile.id)).resolves.toBeUndefined()
    const detail = await findById(
      { db: world.schoolDb, school: orgSchool, user: actor(userRow.id) },
      studentProfile.id,
    )
    await expect(
      getDashboardData({ db: world.schoolDb }, detail.id, detail.name, await defaultCourseId(world)),
    ).resolves.toBeDefined()
  })

  it('a school admin can view any profile', async () => {
    world = await createTestSchool()
    const adminUserRow = await createUser(world)
    await createMembership(world, adminUserRow.id, { role: 'admin' })
    const adminProfile = await createProfile(world, { userId: adminUserRow.id })
    const studentProfile = await createProfile(world)
    const orgSchool = { id: world.orgId } as unknown as Parameters<
      typeof AccessPolicy.load
    >[0]['school']

    const access = await AccessPolicy.load({
      db: world.schoolDb,
      school: orgSchool,
      user: actor(adminUserRow.id),
      profile: adminProfile,
    })

    await expect(access.requireCanViewProfile(studentProfile.id)).resolves.toBeUndefined()
  })

  it('a teacher sharing a batch with the student can view their profile', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const batchRow = await createBatch(world, trackRow)
    const teacherUserRow = await createUser(world)
    await createMembership(world, teacherUserRow.id, { role: 'member' })
    const teacherProfile = await createProfile(world, { userId: teacherUserRow.id })
    const studentProfile = await createProfile(world)
    await enroll(world, teacherProfile, batchRow, 'instructor')
    await enroll(world, studentProfile, batchRow, 'student')
    const orgSchool = { id: world.orgId } as unknown as Parameters<
      typeof AccessPolicy.load
    >[0]['school']

    const access = await AccessPolicy.load({
      db: world.schoolDb,
      school: orgSchool,
      user: actor(teacherUserRow.id),
      profile: teacherProfile,
    })

    await expect(access.requireCanViewProfile(studentProfile.id)).resolves.toBeUndefined()
  })

  it('an unrelated member with no shared batch and no admin status is denied', async () => {
    world = await createTestSchool()
    const strangerUserRow = await createUser(world)
    await createMembership(world, strangerUserRow.id, { role: 'member' })
    const strangerProfile = await createProfile(world, { userId: strangerUserRow.id })
    const studentProfile = await createProfile(world)
    const orgSchool = { id: world.orgId } as unknown as Parameters<
      typeof AccessPolicy.load
    >[0]['school']

    const access = await AccessPolicy.load({
      db: world.schoolDb,
      school: orgSchool,
      user: actor(strangerUserRow.id),
      profile: strangerProfile,
    })

    await expect(access.requireCanViewProfile(studentProfile.id)).rejects.toMatchObject({
      statusCode: 403,
    })
  })
})
