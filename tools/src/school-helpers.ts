import { eq } from 'drizzle-orm'

import {
  dropSchoolSchema,
  isValidCourseSlug,
  member,
  organization,
  provisionSchool,
  publicDb,
  uuidv7,
} from '@narada/db'

export type OrgRole = 'owner' | 'admin' | 'member'

// A course lives in the URL (`/vedam/dashboard`), so its slug must be a lower-case URL segment that
// isn't a word the web app already uses at the top level. The database refuses one anyway; this says
// why before anything is written.
export function assertCourseSlug(slug: string): void {
  if (!isValidCourseSlug(slug)) {
    throw new Error(
      `Course slug "${slug}" isn't usable: it must be lower-case letters, digits and single hyphens ` +
        `(like "vedam" or "smartam-2"), and not a reserved word such as "login" or "admin".`,
    )
  }
}

/** Finds the school by slug, or creates it and provisions its Postgres schema. */
export async function upsertSchool(slug: string, name: string) {
  const existing = await publicDb.query.organization.findFirst({
    where: (t, { eq }) => eq(t.slug, slug),
  })

  if (existing) return existing
  const id = uuidv7()
  const [school] = await publicDb
    .insert(organization)
    .values({ id, name, slug, createdAt: new Date() })
    .returning()

  try {
    await provisionSchool(id)
  } catch (error) {
    await Promise.allSettled([
      publicDb.delete(organization).where(eq(organization.id, id)),
      dropSchoolSchema(id),
    ])
    throw error
  }

  return school!
}

const MEMBER_CHUNK = 1000

/**
 * Makes each user a member of the school with `role`. Someone who is already a member is left as they
 * are (`member` is unique on organization + user), so this is safe to repeat. Returns how many were
 * added.
 */
export async function addOrgMembers(organizationId: string, userIds: string[], role: OrgRole): Promise<number> {
  let added = 0
  for (let i = 0; i < userIds.length; i += MEMBER_CHUNK) {
    const rows = userIds
      .slice(i, i + MEMBER_CHUNK)
      .map(userId => ({ id: uuidv7(), organizationId, userId, role, createdAt: new Date() }))
    added += (await publicDb.insert(member).values(rows).onConflictDoNothing().returning({ id: member.id })).length
  }
  return added
}
