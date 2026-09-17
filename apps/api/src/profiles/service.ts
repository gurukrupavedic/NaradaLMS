import { publicDb, type organization, type SchoolDbClient } from '@narada/db'

import { forbidden, internalError, notFound } from '../error'
import type { User } from '../session'
import type { BatchReadScope } from '../utils/accessPolicy'
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
  scope: BatchReadScope,
): Promise<Profile[]> {
  return repository.search(context.db, query, scope)
}

export async function findById(context: ProfileServiceContext, id: string): Promise<Profile> {
  const row = await repository.findById(context.db, id)
  if (!row) {
    throw notFound()
  }

  return row
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
 * Ownership is enforced by `repository.updateOwned`'s SQL predicate; a foreign-owned profile 404s
 * the same as a missing one.
 *
 * When the patch touches `city`, `state`, or `country`, `countryTimeZone` is re-derived
 * (`utils/timezone.ts::deriveTimeZone`) from the *effective* location — the patch merged onto
 * whatever isn't being changed — rather than just the fields present in this call. A patch that
 * only changes `city` still needs the profile's existing `state`/`country` to resolve correctly,
 * so this reads the current location first (via the same ownership-checked query `updateOwned`
 * uses) rather than guessing from partial input.
 */
export async function updateProfile(
  context: ProfileServiceContext,
  id: string,
  data: UpdateProfileData,
): Promise<Profile> {
  let patch: UpdateProfileData & { countryTimeZone?: string | null } = data
  if (data.city !== undefined || data.state !== undefined || data.country !== undefined) {
    const current = await repository.findOwnedLocationFields(context.db, id, context.user.id)
    if (!current) {
      throw notFound()
    }

    patch = {
      ...data,
      countryTimeZone: deriveTimeZone({
        city: data.city !== undefined ? data.city : current.city,
        state: data.state !== undefined ? data.state : current.state,
        country: data.country !== undefined ? data.country : current.country,
      }),
    }
  }

  const row = await repository.updateOwned(context.db, id, context.user.id, patch)
  if (!row) {
    throw notFound()
  }

  return row
}

/**
 * Deactivates the caller's own profile (DD-011) instead of physically deleting it: only
 * `deletedAt` is set. Every other column, and every `enrollment`/`exam`/`evaluation` row
 * referencing this profile, is left exactly as it was, so historical queries keep working.
 */
export async function deleteById(context: ProfileServiceContext, id: string): Promise<void> {
  const rows = await repository.softDeleteOwned(context.db, id, context.user.id)
  if (rows.length === 0) {
    throw notFound()
  }
}

/**
 * Admin-deactivation (DD-011 §9): a school admin deactivating a profile other than their own.
 * Authorization (`access.requireCanDeactivateProfile()`) happens in the route, matching every
 * other admin-gated write in this codebase (see `batches/route.ts`) — this function assumes the
 * caller has already been checked.
 */
export async function deactivateByAdmin(context: ProfileServiceContext, id: string): Promise<void> {
  const rows = await repository.softDeleteById(context.db, id)
  if (rows.length === 0) {
    throw notFound()
  }
}
