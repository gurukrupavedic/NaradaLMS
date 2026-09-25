import { publicDb, type SchoolDb, type SchoolDbClient } from '@narada/db'
import { registrationFieldsFor, splitDetails } from '@narada/profile-fields'

import { conflict, internalError, orInternalError, orNotFound } from '../error'
import { insert as insertCourseProfile } from '../courseProfile/repository'
import { insert as insertProfile } from '../profiles/repository'
import { resolveDetails } from '../utils/details'
import { deriveTimeZone } from '../utils/timezone'
import * as repository from './repository'
import type { CreateRegistrationData, FindRegistrationsData, Registration } from './schema'

type RegistrationServiceContext = { db: SchoolDbClient }
type SubmitContext = RegistrationServiceContext & {
  school: { slug: string }
  course: { slug: string }
}
type ReviewContext = RegistrationServiceContext & { school: { id: string; slug: string } }

export async function findAll(
  context: RegistrationServiceContext,
  params: FindRegistrationsData,
  courseId: string,
): Promise<{ items: Registration[]; nextCursor: string | null }> {
  return repository.findAll(context.db, params, courseId)
}

export async function findById(context: RegistrationServiceContext, id: string): Promise<Registration> {
  return orNotFound(await repository.findById(context.db, id))
}

export async function submit(
  context: SubmitContext,
  data: CreateRegistrationData,
  courseId: string,
): Promise<Registration> {
  const row = await repository.insert(context.db, {
    ...data,
    // The whole form is being submitted, so every visible required field must be answered — both the
    // school's fields and the course's, as one list. `provisionApprovedApplicant` divides them again.
    details: resolveDetails(
      registrationFieldsFor(context.school.slug, context.course.slug),
      data.details ?? {},
      'all',
    ),
    courseId,
    countryTimeZone: deriveTimeZone({ city: data.city, state: data.state, country: data.country }),
  })
  if (!row) {
    throw internalError()
  }

  return row
}

/**
 * Provisions the real account an approved applicant needs: a `user` (public schema, found by
 * phone or created), school membership (also public schema — every school-scoped endpoint's
 * `AccessPolicy.load` requires one), and a `profile` (this school's schema, written through `db` so
 * it lands in `review`'s transaction) for them to actually appear on rosters under.
 *
 * The `user`/`member` writes go through the public-schema pool, a different connection than the
 * school one, so they can't join that transaction — but both are find-or-create, so if a later
 * step throws the registration is still `pending` and clicking Approve again picks up where it left
 * off. (The profile insert, the one non-idempotent step, rolls back with the transaction.)
 */
async function provisionApprovedApplicant(
  db: SchoolDb,
  school: { id: string; slug: string },
  registration: Registration,
): Promise<string> {
  const fullName = `${registration.firstName} ${registration.lastName}`
  const courseSlug = orNotFound(await repository.findCourseSlug(db, registration.courseId))
  const answers = splitDetails(school.slug, courseSlug, registration.details)
  const applicantUser = await repository.findOrCreateApplicantUser(publicDb, {
    phone: registration.phone,
    name: fullName,
    email: registration.email,
  })

  await repository.ensureSchoolMembership(publicDb, school.id, applicantUser.id)
  const profile = await insertProfile(db, {
    userId: applicantUser.id,
    name: fullName,
    phone: registration.phone,
    city: registration.city,
    // `profile` mirrors the rest of `registration`'s own columns exactly (see its schema's doc
    // comment) so the application's full detail survives onto the living record, not just
    // name/phone/city — straight field-for-field, since the names already match.
    email: registration.email,
    yearOfBirth: registration.yearOfBirth,
    state: registration.state,
    country: registration.country,
    countryTimeZone: registration.countryTimeZone,
    spokenLanguages: registration.spokenLanguages,
    readLanguages: registration.readLanguages,
    parentNames: registration.parentNames,
    dressCodeAgreed: registration.dressCodeAgreed,
    noMeatAgreed: registration.noMeatAgreed,
    noAlcoholAgreed: registration.noAlcoholAgreed,
    noSmokingAgreed: registration.noSmokingAgreed,
    // The answers divide by the level that declares each key: the school's go on the profile, the
    // course's on the profile's row for the course applied to (`courseProfile`).
    details: answers.profile,
  })
  if (!profile) {
    throw internalError()
  }

  await insertCourseProfile(db, {
    profileId: profile.id,
    courseId: registration.courseId,
    learningGoal: registration.learningGoal,
    currentProficiency: registration.currentProficiency,
    comments: registration.comments,
    details: answers.course,
  })

  return profile.id
}

/**
 * Runs in one transaction that first locks the registration row, so two reviewers (or a double
 * click) can't both provision a profile for it: the loser waits, then finds it already reviewed
 * and gets the 409 without provisioning anything.
 */
async function review(
  context: ReviewContext,
  id: string,
  status: 'approved' | 'rejected',
  reviewedBy: string | null,
): Promise<Registration> {
  return context.db.transaction(async tx => {
    const existing = orNotFound(await repository.findByIdForUpdate(tx, id))

    if (existing.status !== 'pending') {
      throw conflict('registration has already been reviewed')
    }

    const convertedProfileId =
      status === 'approved' ? await provisionApprovedApplicant(tx, context.school, existing) : null

    return orInternalError(await repository.transitionStatus(tx, id, status, reviewedBy, convertedProfileId))
  })
}

export async function approve(
  context: ReviewContext,
  id: string,
  reviewedBy: string | null,
): Promise<Registration> {
  return review(context, id, 'approved', reviewedBy)
}

export async function reject(
  context: ReviewContext,
  id: string,
  reviewedBy: string | null,
): Promise<Registration> {
  return review(context, id, 'rejected', reviewedBy)
}
