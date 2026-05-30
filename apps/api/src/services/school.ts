import { z } from 'zod'
import { eq } from 'drizzle-orm'

import {
  organization,
  publicDb,
  provisionSchool,
  dropSchoolSchema,
  uuidv7,
} from '@narada/db'
import { conflict, internalError, notFound } from '../error'
import { requireNonEmpty } from '../utils/validate'

export const createSchoolSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with hyphens'),
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

export default class SchoolService {
  public static async findAll(): Promise<School[]> {
    const rows = await publicDb.query.organization.findMany()
    return rows.map(schoolResponse)
  }

  public static async findById(schoolId: string): Promise<School | undefined> {
    const row = await publicDb.query.organization.findFirst({
      where: (t, { eq }) => eq(t.id, schoolId),
    })

    return row ? schoolResponse(row) : undefined
  }

  public static async create(data: CreateSchoolData): Promise<School> {
    const existing = await publicDb.query.organization.findFirst({
      where: (t, { eq }) => eq(t.slug, data.slug),
    })

    if (existing) throw conflict()
    const id = uuidv7()
    const rows = await publicDb
      .insert(organization)
      .values({ id, ...data, createdAt: new Date() })
      .returning()

    const row = rows.at(0)
    if (!row) throw internalError()
    try {
      await provisionSchool(id)
    } catch (error) {
      await publicDb.delete(organization).where(eq(organization.id, id))
      await dropSchoolSchema(id)
      throw error
    }

    return schoolResponse(row)
  }

  public static async update(schoolId: string, data: UpdateSchoolData): Promise<School> {
    const existing = await SchoolService.findById(schoolId)
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
}
