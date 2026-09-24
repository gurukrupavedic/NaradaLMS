import { publicDb, type organization, type SchoolDbClient } from '@narada/db'

import { forbidden, internalError, notFound, orNotFound } from '../error'
import type { User } from '../session'
import type { AccessPolicy } from '../utils/accessPolicy'
import { deriveTimeZone } from '../utils/timezone'
import * as repository from './repository'
import type { CreateProfileData, Profile, SearchProfilesQuery, UpdateProfileData } from './schema'

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
 * A super admin may create a profile in any school; everyone else must already hold an
 * organization membership for this school (checked against the public schema, not this
 * school's own tables).
 */
export async function createProfile(
  context: ProfileServiceContext,
  data: CreateProfileData,
): Promise<Profile> {
  if (!context.user.isSuperAdmin) {
    const membership = await repository.findMembership(publicDb, context.school.id, context.user.id)
    if (!membership) {
      throw forbidden()
    }
  }

  const row = await repository.insert(context.db, {
    userId: context.user.id,
    phone: null,
    city: null,
    ...data,
  })

  if (!row) {
    throw internalError()
  }

  return row
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
 */
export async function updateProfile(
  context: ProfileServiceContext & { access: AccessPolicy },
  id: string,
  data: UpdateProfileData,
): Promise<Profile> {
  const ownerUserId = context.access.isSchoolAdmin() ? null : context.user.id

  let patch: UpdateProfileData & { countryTimeZone?: string | null } = data
  if (data.city !== undefined || data.state !== undefined || data.country !== undefined) {
    const current = orNotFound(await repository.findLocationFields(context.db, id, ownerUserId))

    patch = {
      ...data,
      countryTimeZone: deriveTimeZone({
        city: data.city !== undefined ? data.city : current.city,
        state: data.state !== undefined ? data.state : current.state,
        country: data.country !== undefined ? data.country : current.country,
      }),
    }
  }

  return orNotFound(await repository.update(context.db, id, ownerUserId, patch))
}

/**
 * Deactivates a profile (DD-011) instead of physically deleting it: only `deletedAt` is set.
 * Every other column, and every `enrollment`/`exam`/`evaluation` row referencing this profile, is
 * left exactly as it was, so historical queries keep working. Same owner-vs-admin split as
 * `updateProfile` above: a school admin deactivates any profile, anyone else only their own.
 */
export async function deleteProfile(
  context: ProfileServiceContext & { access: AccessPolicy },
  id: string,
): Promise<void> {
  const ownerUserId = context.access.isSchoolAdmin() ? null : context.user.id
  const rows = await repository.softDelete(context.db, id, ownerUserId)
  if (rows.length === 0) {
    throw notFound()
  }
}
