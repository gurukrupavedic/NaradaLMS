import type { PublicDb } from '@narada/db'

import * as repository from './repository'
import type { AuthProfile } from './schema'

export async function getAuthProfile(
  db: PublicDb,
  userId: string,
  isSuperAdmin: boolean,
): Promise<AuthProfile> {
  const memberships = await repository.findMembershipsForUser(db, userId)

  return {
    isSuperAdmin,
    memberships: memberships.map(m => ({
      organizationId: m.organizationId,
      organizationName: m.organization.name,
      organizationSlug: m.organization.slug,
      role: m.role,
    })),
  }
}
