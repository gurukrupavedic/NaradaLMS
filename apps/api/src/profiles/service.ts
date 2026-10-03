import { State } from 'country-state-city'

import { publicDb, type organization, type SchoolDbClient } from '@narada/db'
import { sendOtpMessage, verifyOtpCode } from '@narada/otp'

import { conflict, orNotFound, validationError } from '../error'
import type { User } from '../session'
import type { AccessPolicy } from '../utils/accessPolicy'
import { profileFieldsFor } from '@narada/profile-fields'

import { mergeDetailsPatch } from '../utils/details'
import { deriveTimeZone } from '../utils/timezone'
import * as repository from './repository'
import type {
  ContactChangeData,
  ContactCodeRequestData,
  Profile,
  SearchProfilesQuery,
  UpdateProfileData,
} from './schema'

type School = typeof organization.$inferSelect

type ProfileServiceContext = { db: SchoolDbClient; school: School; user: User }

export async function findByUserId(
  context: ProfileServiceContext,
  userId: string,
): Promise<Profile[]> {
  return repository.findByUserId(context.db, userId)
}

export async function searchProfiles(
  context: ProfileServiceContext,
  query: SearchProfilesQuery,
): Promise<Profile[]> {
  return repository.search(context.db, query)
}

export async function findById(context: ProfileServiceContext, id: string): Promise<Profile> {
  return orNotFound(await repository.findById(context.db, id))
}

/**
 * Edits a profile's details — the caller's own, or (if they're a school admin) any profile in the
 * school. `access.isSchoolAdmin()` decides which: an admin's write carries no ownership predicate
 * at all (`ownerUserId: null`), while anyone else's only ever matches their own row — a non-admin
 * patching someone else's profile 404s the same as a missing one, same as before this had an admin
 * path at all.
 *
 * When the patch touches `city`, `state`, or `country`, `countryTimeZone` is re-derived
 * (`utils/timezone.ts::deriveTimeZone`) from the *effective* location — the patch merged onto
 * whatever isn't being changed — rather than just the fields present in this call. A patch that
 * only changes `city` still needs the profile's existing `state`/`country` to resolve correctly,
 * so this reads the current location first (via the same ownership-checked query the write below
 * uses) rather than guessing from partial input.
 *
 * A `details` patch is merged onto the stored details and re-validated against this school's field
 * definitions (`utils/details.ts::mergeDetailsPatch`) — inside a transaction that first locks the
 * row, since it is a read-merge-write and two edits must not both merge onto the same stale copy.
 */
export async function updateProfile(
  context: ProfileServiceContext & { access: AccessPolicy },
  id: string,
  data: UpdateProfileData,
): Promise<Profile> {
  const ownerUserId = context.access.isSchoolAdmin() ? null : context.user.id
  const { details: detailsPatch, ...columns } = data

  let patch: Omit<UpdateProfileData, 'details'> & { countryTimeZone?: string | null } = columns
  if (data.city !== undefined || data.state !== undefined || data.country !== undefined) {
    const current = orNotFound(await repository.findLocationFields(context.db, id, ownerUserId))

    const effective = {
      city: data.city !== undefined ? data.city : current.city,
      state: data.state !== undefined ? data.state : current.state,
      country: data.country !== undefined ? data.country : current.country,
    }
    // A state is always given where the country has any — switching country without picking one
    // of its states is rejected rather than leaving the old country's state code behind.
    if (effective.country && !effective.state && State.getStatesOfCountry(effective.country).length > 0) {
      throw validationError('state: required for this country')
    }

    patch = { ...columns, countryTimeZone: deriveTimeZone(effective) }
  }

  if (detailsPatch === undefined) {
    return orNotFound(await repository.update(context.db, id, ownerUserId, patch))
  }

  return context.db.transaction(async tx => {
    const current = orNotFound(await repository.findDetailsForUpdate(tx, id, ownerUserId))
    const details = mergeDetailsPatch(profileFieldsFor(context.school.slug), current, detailsPatch)
    return orNotFound(await repository.update(tx, id, ownerUserId, { ...patch, details }))
  })
}

/**
 * Where the code for a contact change goes: the new phone when it's changing (so the caller proves
 * they hold it), otherwise the profile's current one. Owner-only — a school admin gets the same 404
 * as for a missing profile, since the code can only be read off the phone it was sent to.
 */
async function contactChangeTarget(
  context: ProfileServiceContext,
  profileId: string,
  newPhone: string | undefined,
): Promise<string> {
  const owned = orNotFound(await repository.findOwnedPhone(context.db, profileId, context.user.id))
  const target = newPhone ?? owned.phone
  if (!target) throw validationError('phone: this profile has no phone number on record')
  if (newPhone && newPhone !== owned.phone) {
    if (await repository.isPhoneTakenByOtherUser(publicDb, newPhone, context.user.id)) {
      throw conflict('That phone number is already used by another account.')
    }
  }
  return target
}

export async function requestContactCode(
  context: ProfileServiceContext,
  profileId: string,
  data: ContactCodeRequestData,
): Promise<void> {
  await sendOtpMessage(await contactChangeTarget(context, profileId, data.phone))
}

/** Verifies the code, then applies the phone and/or year-of-birth change it was requested for. */
export async function changeContact(
  context: ProfileServiceContext,
  profileId: string,
  data: ContactChangeData,
): Promise<Profile> {
  const target = await contactChangeTarget(context, profileId, data.phone)
  if (!(await verifyOtpCode(target, data.code))) {
    throw validationError('That code is incorrect or has expired.')
  }

  if (data.phone) {
    await repository.updatePhone(context.db, publicDb, context.user.id, data.phone)
  }
  if (data.yearOfBirth !== undefined) {
    await repository.updateYearOfBirth(context.db, profileId, context.user.id, data.yearOfBirth)
  }
  return findById(context, profileId)
}
