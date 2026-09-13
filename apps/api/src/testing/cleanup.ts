import { inArray } from 'drizzle-orm'

import {
  dropSchoolSchema,
  member,
  organization,
  organizationIdFromSchoolSchema,
  publicDb,
  session,
  user,
} from '@narada/db'

import type { TestWorld } from './fixtures'
import { isValidTestSchemaName } from './schemaName'

export { isValidTestSchemaName }

/**
 * Tears down everything a `TestWorld` created: validates every recorded schema name before
 * dropping anything (never drops on a name that doesn't prove out as a real `school-*` schema),
 * drops each school schema, then deletes exactly the public rows this world created — scoped by
 * `inArray` on the ids this world itself tracked, never an unscoped `DELETE`.
 */
export async function destroyTestWorld(world: TestWorld): Promise<void> {
  for (const schemaName of world.createdSchemas) {
    if (!isValidTestSchemaName(schemaName)) {
      throw new Error(
        `refusing to drop schema "${schemaName}": it does not look like a school-* test schema`,
      )
    }
  }

  for (const schemaName of world.createdSchemas) {
    const organizationId = organizationIdFromSchoolSchema(schemaName)
    // isValidTestSchemaName above already guarantees this is non-null.
    if (organizationId) {
      await dropSchoolSchema(organizationId)
    }
  }

  // FK-safe order: member (references organization, user) -> session (references user) ->
  // organization -> user.
  if (world.createdPublicMemberIds.length > 0) {
    await publicDb.delete(member).where(inArray(member.id, world.createdPublicMemberIds))
  }

  if (world.createdPublicUserIds.length > 0) {
    await publicDb.delete(session).where(inArray(session.userId, world.createdPublicUserIds))
  }

  if (world.createdPublicOrgIds.length > 0) {
    await publicDb.delete(organization).where(inArray(organization.id, world.createdPublicOrgIds))
  }

  if (world.createdPublicUserIds.length > 0) {
    await publicDb.delete(user).where(inArray(user.id, world.createdPublicUserIds))
  }
}
