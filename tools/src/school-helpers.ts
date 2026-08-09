import { eq } from 'drizzle-orm'

import {
  batch,
  type batchStatus,
  chapter,
  dropSchoolSchema,
  enrollment,
  type enrollmentStatus,
  getScopedDatabase,
  member,
  organization,
  profile,
  provisionSchool,
  publicDb,
  track,
  uuidv7,
  type SchoolDatabase,
} from '@narada/db'

export type OrgRole = 'owner' | 'admin' | 'member'
export type BatchRole = 'instructor' | 'ta' | 'student'
export type BatchStatus = (typeof batchStatus.enumValues)[number]
export type EnrollmentStatus = (typeof enrollmentStatus.enumValues)[number]

export async function requireSchool(slug: string) {
  const school = await publicDb.query.organization.findFirst({
    where: (t, { eq }) => eq(t.slug, slug),
  })

  if (!school) throw new Error(`School not found: ${slug}`)
  return school
}

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

export async function upsertOrgMember(organizationId: string, userId: string, role: OrgRole) {
  const existing = await publicDb.query.member.findFirst({
    where: (t, { and, eq }) => and(eq(t.organizationId, organizationId), eq(t.userId, userId)),
  })

  if (existing) return existing
  const [row] = await publicDb
    .insert(member)
    .values({ id: uuidv7(), organizationId, userId, role, createdAt: new Date() })
    .returning()

  return row!
}

export async function upsertTrack(db: SchoolDatabase, name: string) {
  const existing = await db.query.track.findFirst({
    where: (t, { eq }) => eq(t.name, name),
  })

  if (existing) return existing
  const currentTracks = await db.query.track.findMany({ columns: { order: true } })
  const order = currentTracks.length > 0 ? Math.max(...currentTracks.map(r => r.order)) + 1 : 1
  const [row] = await db.insert(track).values({ name, order }).returning()
  if (!row) throw new Error(`Failed to create track: ${name}`)
  return row
}

export async function upsertBatch(
  db: SchoolDatabase,
  trackId: string,
  code: string,
  values: { status?: BatchStatus; startDate?: Date | null; meetingUrl?: string | null } = {},
) {
  const existing = await db.query.batch.findFirst({
    where: (t, { eq }) => eq(t.code, code),
  })

  if (existing) return existing
  const [row] = await db
    .insert(batch)
    .values({
      trackId,
      code,
      status: values.status ?? 'active',
      startDate: values.startDate,
      meetingUrl: values.meetingUrl,
    })
    .returning()
  if (!row) throw new Error(`Failed to create batch: ${code}`)
  return row
}

export async function upsertChapter(
  db: SchoolDatabase,
  trackId: string,
  values: { code: string; title: string; order: number; script?: 'te' | 'sa' | 'en' | null },
) {
  const existing = await db.query.chapter.findFirst({
    where: (table, { and, eq }) => and(eq(table.trackId, trackId), eq(table.code, values.code)),
  })

  if (existing) return existing
  const [row] = await db
    .insert(chapter)
    .values({ trackId, ...values, status: 'published' })
    .returning()
  if (!row) throw new Error(`Failed to create chapter: ${values.code}`)
  return row
}

// Matches on (userId, name) rather than userId alone: one user can own several profiles (e.g.
// family members sharing a WhatsApp-registered phone number), so the first profile found for a
// userId is not necessarily the one being upserted.
export async function upsertProfile(
  db: SchoolDatabase,
  userId: string,
  name: string,
  values: { phone?: string | null; city?: string | null } = {},
) {
  const existing = await db.query.profile.findFirst({
    where: (t, { and, eq }) => and(eq(t.userId, userId), eq(t.name, name)),
  })

  if (existing) return existing
  const [row] = await db.insert(profile).values({ userId, name, ...values }).returning()
  if (!row) throw new Error('Failed to create profile')
  return row
}

export async function upsertEnrollment(
  db: SchoolDatabase,
  batchId: string,
  profileId: string,
  role: BatchRole,
  values: { status?: EnrollmentStatus; joinedAt?: Date | null; leftDate?: Date | null } = {},
) {
  const existing = await db.query.enrollment.findFirst({
    where: (t, { and, eq }) => and(eq(t.batchId, batchId), eq(t.profileId, profileId)),
  })

  if (existing) return existing
  const [row] = await db
    .insert(enrollment)
    .values({ batchId, profileId, role, ...values })
    .returning()
  if (!row) throw new Error('Failed to create enrollment')
  return row
}
