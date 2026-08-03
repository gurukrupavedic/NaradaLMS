import { publicDb, type organization, type SchoolDbClient } from '@narada/db'

import { forbidden, internalError, notFound } from '../error'
import type { User } from '../session'
import * as repository from './repository'
import type { CreateProfileData, Profile, UpdateProfileData } from './schema'

type School = typeof organization.$inferSelect

type ProfileServiceContext = { db: SchoolDbClient; school: School; user: User }

export async function findByUserId(
  context: ProfileServiceContext,
  userId: string,
): Promise<Profile[]> {
  return repository.findByUserId(context.db, userId)
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

/** Ownership is enforced by `repository.updateOwned`'s SQL predicate; a foreign-owned profile 404s the same as a missing one. */
export async function updateProfile(
  context: ProfileServiceContext,
  id: string,
  data: UpdateProfileData,
): Promise<Profile> {
  const row = await repository.updateOwned(context.db, id, context.user.id, data)
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
