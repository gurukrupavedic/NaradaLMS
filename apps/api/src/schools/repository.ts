import { eq } from 'drizzle-orm'

import { organization, type PublicDb } from '@narada/db'

import type { School, UpdateSchoolData } from './schema'

function toSchool(row: typeof organization.$inferSelect): School {
  return { id: row.id, name: row.name, slug: row.slug, createdAt: row.createdAt }
}

export async function findAll(db: PublicDb): Promise<School[]> {
  const rows = await db.query.organization.findMany()
  return rows.map(toSchool)
}

export async function findById(db: PublicDb, id: string): Promise<School | undefined> {
  const row = await db.query.organization.findFirst({
    where: (t, { eq: eqCol }) => eqCol(t.id, id),
  })

  return row ? toSchool(row) : undefined
}

export async function findBySlug(db: PublicDb, slug: string): Promise<School | undefined> {
  const row = await db.query.organization.findFirst({
    where: (t, { eq: eqCol }) => eqCol(t.slug, slug),
  })

  return row ? toSchool(row) : undefined
}

export async function update(
  db: PublicDb,
  id: string,
  data: UpdateSchoolData,
): Promise<School | undefined> {
  const rows = await db.update(organization).set(data).where(eq(organization.id, id)).returning()
  const row = rows.at(0)
  return row ? toSchool(row) : undefined
}
