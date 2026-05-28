import { z } from 'zod'
import { and, eq } from 'drizzle-orm'

import { enrollment, publicDb, type SchoolDatabase } from '@narada/db'
import { notFound } from '../error'

export const membershipSchema = z.object({
  organizationId: z.string(),
  organizationName: z.string(),
  organizationSlug: z.string(),
  role: z.string(),
})

export const profileSchema = z.object({
  isSuperAdmin: z.boolean(),
  memberships: z.array(membershipSchema),
})

export const updateProfileSchema = z
  .object({
    phone: z.string().optional(),
    city: z.string().optional(),
  })
  .refine(data => data.phone !== undefined || data.city !== undefined, {
    message: 'No fields to update',
  })

export type Membership = z.infer<typeof membershipSchema>
export type Profile = z.infer<typeof profileSchema>
export type UpdateProfileData = z.infer<typeof updateProfileSchema>

export default class ProfileService {
  public static async get(userId: string, isSuperAdmin: boolean): Promise<Profile> {
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

  public static async update(
    db: SchoolDatabase,
    userId: string,
    batchId: string,
    data: UpdateProfileData,
  ): Promise<void> {
    const rows = await db
      .update(enrollment)
      .set(data)
      .where(and(eq(enrollment.userId, userId), eq(enrollment.batchId, batchId)))
      .returning()

    if (rows.length === 0) {
      throw notFound()
    }
  }
}
