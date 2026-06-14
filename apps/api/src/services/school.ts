import { z } from 'zod'
import { eq } from 'drizzle-orm'

import { organization, member, publicDb, provisionSchool, dropSchoolSchema, uuidv7 } from '@narada/db'
import { conflict, internalError, notFound } from '../error'
import { requireNonEmpty } from '../utils/validate'

export const createSchoolSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with hyphens'),
  ownerUserId: z.string().min(1).optional(),
})

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
export type CreateSchoolData = z.infer<typeof createSchoolSchema>
export type UpdateSchoolData = z.infer<typeof updateSchoolSchema>

type DbOrg = typeof organization.$inferSelect

function schoolResponse(row: DbOrg): School {
  return { id: row.id, name: row.name, slug: row.slug, createdAt: row.createdAt }
}

export async function findSchools(): Promise<School[]> {
  const rows = await publicDb.query.organization.findMany()
  return rows.map(schoolResponse)
}

export async function findSchoolById(schoolId: string): Promise<School | undefined> {
  const row = await publicDb.query.organization.findFirst({
    where: (t, { eq }) => eq(t.id, schoolId),
  })

  return row ? schoolResponse(row) : undefined
}

export async function createSchool(data: CreateSchoolData): Promise<School> {
  const existing = await publicDb.query.organization.findFirst({
    where: (t, { eq }) => eq(t.slug, data.slug),
  })

  if (existing) throw conflict()

  const { ownerUserId, ...orgData } = data
  const id = uuidv7()
  const rows = await publicDb
    .insert(organization)
    .values({ id, ...orgData, createdAt: new Date() })
    .returning()

  const row = rows.at(0)
  if (!row) throw internalError()

  try {
    await provisionSchool(id)
    if (ownerUserId) {
      await publicDb.insert(member).values({
        id: uuidv7(),
        organizationId: id,
        userId: ownerUserId,
        role: 'owner',
        createdAt: new Date(),
      })
    }
  } catch (error) {
    await rollbackFailedCreate(id, error)
    throw error
  }

  return schoolResponse(row)
}

export async function updateSchool(schoolId: string, data: UpdateSchoolData): Promise<School> {
  const existing = await findSchoolById(schoolId)
  if (!existing) throw notFound()

  if (data.slug && data.slug !== existing.slug) {
    const taken = await publicDb.query.organization.findFirst({
      where: (t, { eq }) => eq(t.slug, data.slug!),
    })

    if (taken) throw conflict()
  }

  const rows = await publicDb
    .update(organization)
    .set(data)
    .where(eq(organization.id, schoolId))
    .returning()

  const row = rows.at(0)
  if (!row) throw notFound()
  return schoolResponse(row)
}

async function rollbackFailedCreate(schoolId: string, cause: unknown): Promise<void> {
  const results = await Promise.allSettled([
    publicDb.delete(organization).where(eq(organization.id, schoolId)),
    dropSchoolSchema(schoolId),
  ])
  const failures = results.filter(result => result.status === 'rejected')

  if (failures.length > 0) {
    throw new AggregateError(
      [cause, ...failures.map(result => result.reason)],
      `failed to provision school ${schoolId}; rollback also failed`,
    )
  }
}
