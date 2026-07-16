import '@narada/env/load'
import { defineCommand, runMain } from 'citty'
import Enquirer from 'enquirer'
import { eq } from 'drizzle-orm'

import { auth } from '@narada/auth'
import {
  batch,
  batchClassSlot,
  chapter,
  dropSchoolSchema,
  enrollment,
  getScopedDatabase,
  member,
  organization,
  profile,
  provisionSchool,
  publicDb,
  shutdownPools,
  track,
  user as userTable,
  uuidv7,
  type SchoolDatabase,
} from '@narada/db'

const SEED_PASSWORD = 'testing123'

type OrgRole = 'owner' | 'admin' | 'member'
type BatchRole = 'instructor' | 'ta' | 'student'

const ORG_ROLES = new Set<string>(['owner', 'admin', 'member'])
const BATCH_ROLES = new Set<string>(['instructor', 'ta', 'student'])

type SchoolSeedInput = {
  slug: string
  name: string
  operatorEmail: string
  operatorPassword: string
  numTracks: number
  numChapters: number
  numBatches: number
  numInstructors: number
  numStudents: number
}

const schoolCmd = defineCommand({
  meta: { description: 'Seed a school with test users, tracks, chapters, batches, and enrollments.' },
  args: {
    slug: { type: 'string', required: true, description: 'School slug.' },
    name: { type: 'string', description: 'School display name (defaults to slug title-cased).' },
    tracks: { type: 'string', default: '2', description: 'Number of tracks to create.' },
    chapters: { type: 'string', default: '5', description: 'Number of chapters per track.' },
    batches: { type: 'string', default: '2', description: 'Number of batches per track.' },
    instructors: { type: 'string', default: '2', description: 'Number of instructor users.' },
    students: { type: 'string', default: '5', description: 'Number of student users.' },
  },
  async run({ args }) {
    const credentials = await promptCredentials()
    await seedSchool({
      slug: args.slug,
      name: args.name ?? toTitleCase(args.slug),
      operatorEmail: credentials.email,
      operatorPassword: credentials.password,
      numTracks: parseCount(args.tracks, '--tracks'),
      numChapters: parseCount(args.chapters, '--chapters'),
      numBatches: parseCount(args.batches, '--batches'),
      numInstructors: parseCount(args.instructors, '--instructors'),
      numStudents: parseCount(args.students, '--students'),
    })
  },
})

const userCmd = defineCommand({
  meta: { description: 'Create a user and optionally assign them a role.' },
  args: {
    email: { type: 'string', required: true, description: 'User email.' },
    name: { type: 'string', required: true, description: 'User display name.' },
    role: {
      type: 'string',
      description:
        'Role to assign: owner | admin | member (org-level) or instructor | ta | student (batch-level).',
    },
    schoolSlug: {
      type: 'string',
      description: 'School slug — required when assigning any role.',
    },
    batchId: {
      type: 'string',
      description: 'Batch ID — required for instructor | ta | student roles.',
    },
  },
  async run({ args }) {
    const credentials = await promptCredentials()
    try {
      await authenticateSuperAdmin(credentials.email, credentials.password)
      const user = await upsertUser(args.email, args.name)

      let assignment: Record<string, unknown> = {}
      if (args.role) {
        if (!args.schoolSlug) throw new Error('--schoolSlug is required when assigning a role')

        const school = await requireSchool(args.schoolSlug)
        if (ORG_ROLES.has(args.role)) {
          await upsertOrgMember(school.id, user.id, args.role as OrgRole)
          const schoolDb = getScopedDatabase(school.id)
          const userProfile = await upsertProfile(schoolDb, user.id, args.name)
          assignment = {
            schoolSlug: args.schoolSlug,
            orgRole: args.role,
            profileId: userProfile.id,
          }
        } else if (BATCH_ROLES.has(args.role)) {
          if (!args.batchId) {
            throw new Error('--batchId is required for batch roles (instructor, ta, student)')
          }

          const schoolDb = getScopedDatabase(school.id)
          const batchRow = await schoolDb.query.batch.findFirst({
            where: (t, { eq }) => eq(t.id, args.batchId!),
          })

          if (!batchRow) throw new Error(`Batch not found: ${args.batchId}`)
          const userProfile = await upsertProfile(schoolDb, user.id, args.name)
          await upsertEnrollment(schoolDb, args.batchId, userProfile.id, args.role as BatchRole)
          assignment = {
            schoolSlug: args.schoolSlug,
            batchId: args.batchId,
            batchRole: args.role,
            profileId: userProfile.id,
          }
        } else {
          throw new Error(
            `Unknown role "${args.role}". Valid: owner, admin, member, instructor, ta, student`,
          )
        }
      }

      console.log(
        JSON.stringify(
          {
            id: user.id,
            email: args.email,
            name: args.name,
            password: SEED_PASSWORD,
            ...assignment,
          },
          null,
          2,
        ),
      )
    } finally {
      await shutdownPools()
    }
  },
})

const superadminCmd = defineCommand({
  meta: { description: 'Create a super-admin user.' },
  args: {
    email: { type: 'string', required: true, description: 'Super-admin email.' },
    name: { type: 'string', required: true, description: 'Super-admin display name.' },
    password: { type: 'string', description: `Password (defaults to ${SEED_PASSWORD}).` },
  },
  async run({ args }) {
    try {
      const password = args.password ?? SEED_PASSWORD
      const newUser = await upsertUser(args.email, args.name, password)
      await publicDb
        .update(userTable)
        .set({ isSuperAdmin: true })
        .where(eq(userTable.id, newUser.id))
      console.log(
        JSON.stringify(
          { id: newUser.id, email: args.email, name: args.name, password, isSuperAdmin: true },
          null,
          2,
        ),
      )
    } finally {
      await shutdownPools()
    }
  },
})

runMain(
  defineCommand({
    meta: { name: 'seed', description: 'Seed test data for local development.' },
    subCommands: { school: schoolCmd, user: userCmd, superadmin: superadminCmd },
  }),
)

async function seedSchool(input: SchoolSeedInput) {
  try {
    await authenticateSuperAdmin(input.operatorEmail, input.operatorPassword)

    const school = await upsertSchool(input.slug, input.name)
    const schoolDb = getScopedDatabase(school.id)
    const ownerEmail = `${input.slug}-owner@seed.test`
    const adminEmail = `${input.slug}-admin@seed.test`
    const owner = await upsertUser(ownerEmail, 'Owner')
    const admin = await upsertUser(adminEmail, 'Admin')
    await upsertOrgMember(school.id, owner.id, 'owner')
    await upsertOrgMember(school.id, admin.id, 'admin')
    const ownerProfile = await upsertProfile(schoolDb, owner.id, 'Owner')
    const adminProfile = await upsertProfile(schoolDb, admin.id, 'Admin')

    const instructors = await Promise.all(
      range(input.numInstructors).map(i =>
        upsertUser(`${input.slug}-instructor${i + 1}@seed.test`, `Instructor ${i + 1}`),
      ),
    )
    const students = await Promise.all(
      range(input.numStudents).map(i =>
        upsertUser(`${input.slug}-student${i + 1}@seed.test`, `Student ${i + 1}`),
      ),
    )

    // All users with profiles must be org members
    for (const user of [...instructors, ...students]) {
      await upsertOrgMember(school.id, user.id, 'member')
    }

    const instructorProfiles = await Promise.all(
      instructors.map(u => upsertProfile(schoolDb, u.id, u.name)),
    )
    const studentProfiles = await Promise.all(
      students.map(u => upsertProfile(schoolDb, u.id, u.name)),
    )

    const instructorProfileById = new Map(instructors.map((u, i) => [u.id, instructorProfiles[i]!]))
    const studentProfileById = new Map(students.map((u, i) => [u.id, studentProfiles[i]!]))
    const totalBatches = input.numTracks * input.numBatches
    const studentsPerBatch =
      totalBatches === 0 ? 0 : Math.max(1, Math.ceil(input.numStudents / totalBatches))
    const trackResults = []
    let batchIndex = 0
    for (let t = 1; t <= input.numTracks; t++) {
      const trackRow = await upsertTrack(schoolDb, `Seed Track ${t}`)
      const chapters = await Promise.all(
        range(input.numChapters).map(index =>
          upsertChapter(schoolDb, trackRow.id, {
            code: `${t}.${index + 1}`,
            title: `Seed Chapter ${index + 1}`,
            order: index + 1,
          }),
        ),
      )
      const batchResults = []
      for (let b = 1; b <= input.numBatches; b++) {
        const batchRow = await upsertBatch(schoolDb, trackRow.id, `${input.slug}-t${t}-batch${b}`)
        await upsertClassSlots(schoolDb, batchRow.id)
        for (const user of pickForBatch(instructors, batchIndex, 2)) {
          const p = instructorProfileById.get(user.id)!
          await upsertEnrollment(schoolDb, batchRow.id, p.id, 'instructor')
        }

        for (const user of pickForBatch(students, batchIndex, studentsPerBatch)) {
          const p = studentProfileById.get(user.id)!
          await upsertEnrollment(schoolDb, batchRow.id, p.id, 'student')
        }

        batchResults.push({ id: batchRow.id, code: batchRow.code })
        batchIndex++
      }

      trackResults.push({
        id: trackRow.id,
        name: trackRow.name,
        chapters: chapters.map(row => ({ id: row.id, code: row.code, title: row.title })),
        batches: batchResults,
      })
    }

    console.log(
      JSON.stringify(
        {
          school: { id: school.id, slug: school.slug, name: school.name },
          owner: { id: owner.id, email: ownerEmail, profileId: ownerProfile.id },
          admin: { id: admin.id, email: adminEmail, profileId: adminProfile.id },
          tracks: trackResults,
          instructors: instructors.map((u, i) => ({
            id: u.id,
            email: `${input.slug}-instructor${i + 1}@seed.test`,
            profileId: instructorProfiles[i]!.id,
          })),
          students: students.map((u, i) => ({
            id: u.id,
            email: `${input.slug}-student${i + 1}@seed.test`,
            profileId: studentProfiles[i]!.id,
          })),
          password: SEED_PASSWORD,
        },
        null,
        2,
      ),
    )
  } finally {
    await shutdownPools()
  }
}

async function requireSchool(slug: string) {
  const school = await publicDb.query.organization.findFirst({
    where: (t, { eq }) => eq(t.slug, slug),
  })

  if (!school) throw new Error(`School not found: ${slug}`)
  return school
}

async function upsertSchool(slug: string, name: string) {
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

async function upsertUser(email: string, name: string, password = SEED_PASSWORD) {
  try {
    const result = await auth.api.signUpEmail({
      body: { email, password, name },
    })

    return result.user
  } catch {
    const row = await publicDb.query.user.findFirst({
      where: (t, { eq }) => eq(t.email, email),
    })

    if (!row) throw new Error(`Failed to create or find user: ${email}`)
    return row
  }
}

async function upsertOrgMember(organizationId: string, userId: string, role: OrgRole) {
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

async function upsertTrack(db: SchoolDatabase, name: string) {
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

async function upsertBatch(db: SchoolDatabase, trackId: string, code: string) {
  const existing = await db.query.batch.findFirst({
    where: (t, { eq }) => eq(t.code, code),
  })

  if (existing) return existing
  const [row] = await db
    .insert(batch)
    .values({ trackId, code, status: 'active', meetingUrl: `https://meet.google.com/${code}` })
    .returning()
  if (!row) throw new Error(`Failed to create batch: ${code}`)
  return row
}

// Every seeded batch meets Mon/Wed/Fri at 6pm — a realistic default weekly cadence for the
// "next class" feature, not meant to vary per batch.
const DEFAULT_CLASS_SLOTS = [
  { dayOfWeek: 1, time: '18:00', durationMinutes: 60 },
  { dayOfWeek: 3, time: '18:00', durationMinutes: 60 },
  { dayOfWeek: 5, time: '18:00', durationMinutes: 60 },
]

async function upsertClassSlots(db: SchoolDatabase, batchId: string) {
  const existing = await db.query.batchClassSlot.findMany({
    where: (t, { eq }) => eq(t.batchId, batchId),
  })

  if (existing.length > 0) return existing
  return db
    .insert(batchClassSlot)
    .values(DEFAULT_CLASS_SLOTS.map(slot => ({ ...slot, batchId })))
    .returning()
}

async function upsertChapter(
  db: SchoolDatabase,
  trackId: string,
  values: { code: string; title: string; order: number },
) {
  const existing = await db.query.chapter.findFirst({
    where: (table, { and, eq }) => and(eq(table.trackId, trackId), eq(table.code, values.code)),
  })

  if (existing) return existing
  const [row] = await db
    .insert(chapter)
    .values({ trackId, ...values, status: 'published', script: 'sa' })
    .returning()
  if (!row) throw new Error(`Failed to create chapter: ${values.code}`)
  return row
}

async function upsertProfile(db: SchoolDatabase, userId: string, name: string) {
  const existing = await db.query.profile.findFirst({
    where: (t, { eq }) => eq(t.userId, userId),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  })

  if (existing) return existing
  const [row] = await db.insert(profile).values({ userId, name }).returning()
  if (!row) throw new Error('Failed to create profile')
  return row
}

async function upsertEnrollment(
  db: SchoolDatabase,
  batchId: string,
  profileId: string,
  role: BatchRole,
) {
  const existing = await db.query.enrollment.findFirst({
    where: (t, { and, eq }) => and(eq(t.batchId, batchId), eq(t.profileId, profileId)),
  })

  if (existing) return existing
  const [row] = await db.insert(enrollment).values({ batchId, profileId, role }).returning()
  if (!row) throw new Error('Failed to create enrollment')
  return row
}

async function authenticateSuperAdmin(email: string, password: string) {
  const session = await auth.api.signInEmail({
    body: { email, password },
  })

  if (!session.user.isSuperAdmin) throw new Error('Authenticated user must be a super-admin.')
  return session.user
}

async function promptCredentials(): Promise<{ email: string; password: string }> {
  return Enquirer.prompt<{ email: string; password: string }>([
    {
      type: 'input',
      name: 'email',
      message: 'Super-admin email',
      required: true,
      result: (v: string) => v.trim(),
    },
    {
      type: 'password',
      name: 'password',
      message: 'Super-admin password',
      required: true,
    },
  ])
}

function toTitleCase(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i)
}

function parseCount(value: string, option: string): number {
  const count = Number(value)
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error(`${option} must be a non-negative integer`)
  }
  return count
}

function pickForBatch<T>(items: T[], batchIndex: number, count: number): T[] {
  const n = Math.min(count, items.length)
  return Array.from({ length: n }, (_, i) => items[(batchIndex * n + i) % items.length])
}
