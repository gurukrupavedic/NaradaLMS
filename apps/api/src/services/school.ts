import { z } from 'zod'
import { eq } from 'drizzle-orm'

import {
  organization,
  publicDb,
  provisionSchool,
  renameSchool,
  clearSchoolDbCache,
} from '@narada/db'
import { conflict, internalError, notFound } from '../error'

export const schoolSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.date(),
})

export const createSchoolSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with hyphens'),
})

export const updateSchoolSchema = z
  .object({
    name: z.string().min(1).optional(),
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with hyphens')
      .optional(),
  })
  .refine(data => Object.keys(data).length > 0, { message: 'No fields to update' })

export type School = z.infer<typeof schoolSchema>
export type CreateSchoolData = z.infer<typeof createSchoolSchema>
export type UpdateSchoolData = z.infer<typeof updateSchoolSchema>

type DbOrg = typeof organization.$inferSelect

function mapSchool(row: DbOrg): School {
  return { id: row.id, name: row.name, slug: row.slug, createdAt: row.createdAt }
}

export default class SchoolService {
  public static async findAll(): Promise<School[]> {
    const rows = await publicDb.query.organization.findMany()
    return rows.map(mapSchool)
  }

  public static async findById(schoolId: string): Promise<School | undefined> {
    const row = await publicDb.query.organization.findFirst({
      where: (t, { eq }) => eq(t.id, schoolId),
    })

    return row ? mapSchool(row) : undefined
  }

  public static async create(data: CreateSchoolData): Promise<School> {
    const existing = await publicDb.query.organization.findFirst({
      where: (t, { eq }) => eq(t.slug, data.slug),
    })

    if (existing) {
      throw conflict()
    }

    const rows = await publicDb
      .insert(organization)
      .values({ id: crypto.randomUUID(), ...data, createdAt: new Date() })
      .returning()

    const row = rows.at(0)
    if (!row) {
      throw internalError()
    }

    await provisionSchool(data.slug)
    return mapSchool(row)
  }

  public static async update(schoolId: string, data: UpdateSchoolData): Promise<School> {
    const existing = await SchoolService.findById(schoolId)
    if (!existing) throw notFound()

    if (data.slug && data.slug !== existing.slug) {
      const taken = await publicDb.query.organization.findFirst({
        where: (t, { eq }) => eq(t.slug, data.slug!),
      })

      if (taken) {
        throw conflict()
      }

      await renameSchool(existing.slug, data.slug)
      clearSchoolDbCache(existing.slug)
    }

    const rows = await publicDb
      .update(organization)
      .set(data)
      .where(eq(organization.id, schoolId))
      .returning()

    const row = rows.at(0)
    if (!row) {
      throw notFound()
    }

    return mapSchool(row)
  }
}
