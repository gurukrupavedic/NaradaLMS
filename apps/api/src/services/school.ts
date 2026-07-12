import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { organization, type PublicDatabase } from '@narada/db'
import { conflict, notFound } from '../error'
import { requireNonEmpty } from '../utils/validate'

export const updateSchoolSchema = requireNonEmpty(
  z.object({
    name: z.string().min(1).optional(),
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with hyphens')
      .optional(),
  }),
)

export type School = Pick<typeof organization.$inferSelect, 'id' | 'name' | 'slug' | 'createdAt'>
export type UpdateSchoolData = z.infer<typeof updateSchoolSchema>

type DbOrg = typeof organization.$inferSelect

function schoolResponse(row: DbOrg): School {
  return { id: row.id, name: row.name, slug: row.slug, createdAt: row.createdAt }
}

export async function findSchools(db: PublicDatabase): Promise<School[]> {
  const rows = await db.query.organization.findMany()
  return rows.map(schoolResponse)
}

export async function findSchoolById(db: PublicDatabase, schoolId: string): Promise<School | undefined> {
  const row = await db.query.organization.findFirst({
    where: (t, { eq }) => eq(t.id, schoolId),
  })

  return row ? schoolResponse(row) : undefined
}

export async function updateSchool(db: PublicDatabase, schoolId: string, data: UpdateSchoolData): Promise<School> {
  const existing = await findSchoolById(db, schoolId)
  if (!existing) throw notFound()

  if (data.slug && data.slug !== existing.slug) {
    const taken = await db.query.organization.findFirst({
      where: (t, { eq }) => eq(t.slug, data.slug!),
    })

    if (taken) throw conflict()
  }

  const rows = await db
    .update(organization)
    .set(data)
    .where(eq(organization.id, schoolId))
    .returning()

  const row = rows.at(0)
  if (!row) throw notFound()
  return schoolResponse(row)
}
