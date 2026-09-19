import { publicDb, type SchoolDbClient } from '@narada/db'

import { conflict, internalError, notFound } from '../error'
import { insert as insertProfile } from '../profiles/repository'
import { deriveTimeZone } from '../utils/timezone'
import * as repository from './repository'
import type { CreateRegistrationData, FindRegistrationsData, Registration } from './schema'

type RegistrationServiceContext = { db: SchoolDbClient }
type ReviewContext = RegistrationServiceContext & { school: { id: string } }

export async function findAll(
  context: RegistrationServiceContext,
  params: FindRegistrationsData,
): Promise<{ items: Registration[]; nextCursor: string | null }> {
  return repository.findAll(context.db, params)
}

export async function findById(context: RegistrationServiceContext, id: string): Promise<Registration> {
  const row = await repository.findById(context.db, id)
  if (!row) {
    throw notFound()
  }

  return row
}

export async function submit(
  context: RegistrationServiceContext,
  data: CreateRegistrationData,
  courseId: string,
): Promise<Registration> {
  const row = await repository.insert(context.db, {
    ...data,
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
 * `AccessPolicy.load` requires one), and a `profile` (this school's schema) for them to actually
 * appear on rosters under.
 *
 * Ordered *before* the registration's own status flips to 'approved' (`review` below), on purpose:
 * `findOrCreateApplicantUser`/`ensureSchoolMembership` are idempotent, so if this throws partway
 * (the profile insert is the one non-idempotent step — see its own repository doc comment) the
 * registration is untouched and still `pending`, and simply clicking Approve again picks up
 * exactly where it left off. The tradeoff that accepts is a genuine *concurrent* double-approve of
 * the same registration racing here before either has flipped its status — accepted rather than
 * engineered around, since this is a human clicking a button the UI already disables once clicked,
 * not a high-concurrency path.
 */
async function provisionApprovedApplicant(
  context: ReviewContext,
  registration: Registration,
): Promise<string> {
  const fullName = `${registration.firstName} ${registration.lastName}`
  const applicantUser = await repository.findOrCreateApplicantUser(publicDb, {
    phone: registration.phone,
    name: fullName,
    email: registration.email,
  })

  const [, profile] = await Promise.all([
    repository.ensureSchoolMembership(publicDb, context.school.id, applicantUser.id),
    insertProfile(context.db, {
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
      learningGoal: registration.learningGoal,
      currentProficiency: registration.currentProficiency,
      spokenLanguages: registration.spokenLanguages,
      readLanguages: registration.readLanguages,
      parentNames: registration.parentNames,
      dressCodeAgreed: registration.dressCodeAgreed,
      noMeatAgreed: registration.noMeatAgreed,
      noAlcoholAgreed: registration.noAlcoholAgreed,
      noSmokingAgreed: registration.noSmokingAgreed,
      comments: registration.comments,
    }),
  ])
  if (!profile) {
    throw internalError()
  }

  return profile.id
}

async function review(
  context: ReviewContext,
  id: string,
  status: 'approved' | 'rejected',
  reviewedBy: string | null,
): Promise<Registration> {
  const existing = await repository.findById(context.db, id)
  if (!existing) {
    throw notFound()
  }

  const convertedProfileId =
    status === 'approved' ? await provisionApprovedApplicant(context, existing) : null

  const row = await repository.transitionStatus(context.db, id, status, reviewedBy, convertedProfileId)
  if (!row) {
    // The precheck above ruled out "no such registration" — the only other way transitionStatus
    // updates 0 rows is a registration that's already been reviewed (its `pending` guard failed).
    throw conflict('registration has already been reviewed')
  }

  return row
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
