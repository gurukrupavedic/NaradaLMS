import { z } from 'zod'

import { publicDb } from '@narada/db'

export const membershipSchema = z.object({
  organizationId: z.string(),
  organizationName: z.string(),
  organizationSlug: z.string(),
  role: z.string(),
})

export const authProfileSchema = z.object({
  isSuperAdmin: z.boolean(),
  memberships: z.array(membershipSchema),
})

export type Membership = z.infer<typeof membershipSchema>
export type AuthProfile = z.infer<typeof authProfileSchema>

export async function getAuthProfile(userId: string, isSuperAdmin: boolean): Promise<AuthProfile> {
  const memberships = await publicDb.query.member.findMany({
    where: (t, { eq: e }) => e(t.userId, userId),
    with: { organization: true },
  })

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
