import { publicDb, type organization, type SchoolDbClient } from '@narada/db'

import { conflict, forbidden, internalError, notFound } from '../error'
import type { User } from '../session'
import { DbConstraint, withConstraintMapping } from '../utils/dbError'
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

export async function deleteById(context: ProfileServiceContext, id: string): Promise<void> {
  const rows = await withConstraintMapping(
    () => repository.deleteOwned(context.db, id, context.user.id),
    {
      [DbConstraint.evaluationEvaluatorIdFk]: () =>
        conflict('profile is still referenced by an evaluation and cannot be deleted'),
    },
  )

  if (rows.length === 0) {
    throw notFound()
  }
}
