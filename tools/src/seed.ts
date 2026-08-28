import '@narada/env/load'
import { createHash } from 'node:crypto'
import { defineCommand, runMain } from 'citty'
import { eq } from 'drizzle-orm'

import {
  batchClassSlot,
  getScopedDatabase,
  publicDb,
  shutdownPools,
  user as userTable,
  uuidv7,
  type SchoolDatabase,
} from '@narada/db'
import { promptSuperAdminPhone, requireSuperAdminByPhone } from './provisioning'
import {
  requireSchool,
  upsertBatch,
  upsertChapter,
  upsertEnrollment,
  upsertOrgMember,
  upsertProfile,
  upsertSchool,
  upsertTrack,
  type BatchRole,
  type OrgRole,
} from './school-helpers'

const ORG_ROLES = new Set<string>(['owner', 'admin', 'member'])
const BATCH_ROLES = new Set<string>(['instructor', 'ta', 'student'])

type SchoolSeedInput = {
  slug: string
  name: string
  operatorPhone: string
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
    const operatorPhone = await promptSuperAdminPhone()
    await seedSchool({
      slug: args.slug,
      name: args.name ?? toTitleCase(args.slug),
      operatorPhone,
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
    phoneNumber: {
      type: 'string',
      description: 'Optional phone number (E.164) to set on the user alongside their email.',
    },
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
    const operatorPhone = await promptSuperAdminPhone()
    try {
      await requireSuperAdminByPhone(operatorPhone)
      const user = await upsertUser(args.email, args.name, args.phoneNumber)

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
            phoneNumber: args.phoneNumber ?? user.phoneNumber ?? null,
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
    phoneNumber: {
      type: 'string',
      description:
        'Optional phone number (E.164) to set on the super-admin — needed for other CLI commands’ phone-based operator check to find them.',
    },
  },
  async run({ args }) {
    try {
      const newUser = await upsertUser(args.email, args.name, args.phoneNumber)
      await publicDb
        .update(userTable)
        .set({ isSuperAdmin: true })
        .where(eq(userTable.id, newUser.id))
      console.log(
        JSON.stringify(
          {
            id: newUser.id,
            email: args.email,
            name: args.name,
            phoneNumber: args.phoneNumber ?? newUser.phoneNumber ?? null,
            isSuperAdmin: true,
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

runMain(
  defineCommand({
    meta: { name: 'seed', description: 'Seed test data for local development.' },
    subCommands: { school: schoolCmd, user: userCmd, superadmin: superadminCmd },
  }),
)

async function seedSchool(input: SchoolSeedInput) {
  try {
    await requireSuperAdminByPhone(input.operatorPhone)

    const school = await upsertSchool(input.slug, input.name)
    const schoolDb = getScopedDatabase(school.id)
    const ownerEmail = `${input.slug}-owner@seed.test`
    const adminEmail = `${input.slug}-admin@seed.test`
    const ownerPhone = fictionalPhoneNumber(input.slug, 'owner', 0)
    const adminPhone = fictionalPhoneNumber(input.slug, 'admin', 0)
    const owner = await upsertUser(ownerEmail, 'Owner', ownerPhone)
    const admin = await upsertUser(adminEmail, 'Admin', adminPhone)
    await upsertOrgMember(school.id, owner.id, 'owner')
    await upsertOrgMember(school.id, admin.id, 'admin')
    const ownerProfile = await upsertProfile(schoolDb, owner.id, 'Owner')
    const adminProfile = await upsertProfile(schoolDb, admin.id, 'Admin')

    const instructorPhones = range(input.numInstructors).map(i =>
      fictionalPhoneNumber(input.slug, 'instructor', i),
    )
    const studentPhones = range(input.numStudents).map(i => fictionalPhoneNumber(input.slug, 'student', i))
    const instructors = await Promise.all(
      range(input.numInstructors).map(i =>
        upsertUser(`${input.slug}-instructor${i + 1}@seed.test`, `Instructor ${i + 1}`, instructorPhones[i]),
      ),
    )
    const students = await Promise.all(
      range(input.numStudents).map(i =>
        upsertUser(`${input.slug}-student${i + 1}@seed.test`, `Student ${i + 1}`, studentPhones[i]),
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
        const batchCode = `${input.slug}-t${t}-batch${b}`
        const batchRow = await upsertBatch(schoolDb, trackRow.id, batchCode, {
          meetingUrl: `https://meet.google.com/${batchCode}`,
        })
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
          owner: { id: owner.id, email: ownerEmail, phoneNumber: ownerPhone, profileId: ownerProfile.id },
          admin: { id: admin.id, email: adminEmail, phoneNumber: adminPhone, profileId: adminProfile.id },
          tracks: trackResults,
          instructors: instructors.map((u, i) => ({
            id: u.id,
            email: `${input.slug}-instructor${i + 1}@seed.test`,
            phoneNumber: instructorPhones[i],
            profileId: instructorProfiles[i]!.id,
          })),
          students: students.map((u, i) => ({
            id: u.id,
            email: `${input.slug}-student${i + 1}@seed.test`,
            phoneNumber: studentPhones[i],
            profileId: studentProfiles[i]!.id,
          })),
        },
        null,
        2,
      ),
    )
  } finally {
    await shutdownPools()
  }
}

// Sign-in is phone OTP (or Google) only, and both create their `user` row implicitly on first
// verification — there's no signup endpoint left for this CLI to call through. This inserts the
// row directly instead, which is exactly as legitimate a way to create a user as auth.api ever
// was; it just never creates a credential, since none of our sign-in methods use one.
async function upsertUser(email: string, name: string, phoneNumber?: string) {
  let user = await publicDb.query.user.findFirst({
    where: (t, { eq }) => eq(t.email, email),
  })

  if (!user) {
    const [row] = await publicDb
      .insert(userTable)
      .values({ id: uuidv7(), email, name, phoneNumber })
      .returning()
    if (!row) throw new Error(`Failed to create user: ${email}`)
    user = row
  }

  if (phoneNumber && user.phoneNumber !== phoneNumber) {
    const [updated] = await publicDb
      .update(userTable)
      .set({ phoneNumber })
      .where(eq(userTable.id, user.id))
      .returning()
    if (updated) user = updated
  }

  return user
}

// Every seeded batch meets Mon/Wed/Fri at 6pm — a realistic default weekly cadence for the
// "next class" feature, not meant to vary per batch. Kept local to seed.ts (not school-helpers.ts)
// since it's fabricated test scheduling, not something the real Excel import has data for.
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

// Deterministic, syntactically-valid E.164 numbers using the 555 area code — not a real NANP
// geographic area code, so these can never collide with a real WhatsApp-reachable number. Derived
// per school+role+index so distinct schools/roles/indices get distinct numbers, but re-running the
// seed for the same school reuses the same numbers (idempotent, matching upsertUser's lookup).
function fictionalPhoneNumber(slug: string, role: string, index: number): string {
  const hash = createHash('sha1').update(`${slug}:${role}:${index}`).digest('hex')
  const digits = BigInt(`0x${hash.slice(0, 10)}`) % 10_000_000n
  return `+1555${digits.toString().padStart(7, '0')}`
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
