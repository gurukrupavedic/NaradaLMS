import '@narada/env/load'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { defineCommand, runMain } from 'citty'
import { hashPassword } from 'better-auth/crypto'

import {
  account,
  batch,
  chapter,
  enrollment,
  evaluation,
  getScopedDatabase,
  profile,
  publicDb,
  shutdownPools,
  track,
  user as userTable,
  uuidv7,
} from '@narada/db'
// Reusing the live API's own validators rather than re-deriving parallel checks: a bulk import
// that bypasses the HTTP layer should still never write a row the real API would reject.
import { enrollSchema } from '@narada/api/src/services/enrollment'
import { createEvaluationSchema } from '@narada/api/src/services/evaluation'
import { promptSuperAdminPhone, requireSuperAdminByPhone } from './provisioning'
import { requireSchool, upsertOrgMember, upsertSchool } from './school-helpers'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_DATA_DIR = path.join(__dirname, '../../seed-data')
const CHUNK_SIZE = 1000
const DEFAULT_TEMP_PASSWORD = 'testing123'

type TrackRow = { id: string; name: string; order: number }
type ChapterRow = {
  id: string
  trackId: string
  code: string
  title: string
  status: 'draft' | 'published'
  order: number
  script: 'te' | 'sa' | 'en' | null
}
type BatchRow = {
  id: string
  trackId: string
  code: string
  status: 'upcoming' | 'active' | 'completed'
  startDate: string | null
  meetingUrl: string | null
}
type UserRow = {
  id: string
  name: string
  email: string
  isSuperAdmin: false
  phoneNumber: string | null
  phoneNumberVerified: boolean | null
}
type ProfileRow = { id: string; userId: string; name: string; phone: string | null; city: string | null }
type EnrollmentRow = {
  profileId: string
  batchId: string
  role: 'instructor' | 'ta' | 'student'
  status: 'active' | 'break' | 'dropped' | 'inactive'
  joinedAt: string | null
  leftDate: string | null
}
type ProficiencyLevel = 'absent' | 'notStarted' | 'practicing' | 'level1' | 'level2' | 'level3' | 'level4'
type EvaluationRow = {
  id: string
  studentId: string
  chapterId: string
  level: ProficiencyLevel
  evaluatorId: string
}

function chunk<T>(rows: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size))
  return out
}

function readJson<T>(dataDir: string, fileName: string): T {
  const filePath = path.join(dataDir, fileName)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing seed file: ${filePath} — run \`pnpm parse:excel\` first.`)
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
}

// Matches the phoneNumber plugin's validator on feat/whatsapp-otp-auth (packages/auth/src/index.ts)
// — kept in sync manually since that plugin isn't wired into this schema/branch yet.
const E164_PATTERN = /^\+[1-9]\d{7,14}$/

function validate(users: UserRow[], enrollments: EnrollmentRow[], evaluations: EvaluationRow[]): string[] {
  const errors: string[] = []

  for (const u of users) {
    if (u.phoneNumber && !E164_PATTERN.test(u.phoneNumber)) {
      errors.push(`user ${u.id}: phoneNumber "${u.phoneNumber}" is not valid E.164`)
    }
  }

  for (const e of enrollments) {
    const result = enrollSchema.safeParse({ profileId: e.profileId, role: e.role })
    if (!result.success) {
      errors.push(`enrollment ${e.profileId}/${e.batchId}: ${result.error.issues.map(i => i.message).join('; ')}`)
    }
  }

  for (const ev of evaluations) {
    const result = createEvaluationSchema.safeParse({
      studentId: ev.studentId,
      chapterId: ev.chapterId,
      level: ev.level,
    })
    if (!result.success) {
      errors.push(`evaluation ${ev.id}: ${result.error.issues.map(i => i.message).join('; ')}`)
    }
  }

  return errors
}

const dataCmd = defineCommand({
  meta: { description: 'Import parsed Excel seed data (seed-data/*.json) into a real school.' },
  args: {
    slug: { type: 'string', default: 'slmts', description: 'School org slug to import into.' },
    name: { type: 'string', description: 'School display name (defaults to uppercased slug).' },
    dataDir: { type: 'string', description: 'Directory containing the parsed seed-data JSON files.' },
    commit: {
      type: 'boolean',
      default: false,
      description: 'Actually write to the database. Without this flag, only validates and reports.',
    },
  },
  async run({ args }) {
    const dataDir = args.dataDir ?? DEFAULT_DATA_DIR

    try {
      const tracks = readJson<TrackRow[]>(dataDir, 'tracks.json')
      const chapters = readJson<ChapterRow[]>(dataDir, 'chapters.json')
      const batches = readJson<BatchRow[]>(dataDir, 'batches.json')
      const users = readJson<UserRow[]>(dataDir, 'users.json')
      const profiles = readJson<ProfileRow[]>(dataDir, 'profiles.json')
      const enrollments = readJson<EnrollmentRow[]>(dataDir, 'enrollments.json')
      const evaluations = readJson<EvaluationRow[]>(dataDir, 'evaluations.json')

      console.log(
        `Loaded ${users.length} users, ${profiles.length} profiles, ${tracks.length} tracks, ` +
          `${chapters.length} chapters, ${batches.length} batches, ${enrollments.length} enrollments, ` +
          `${evaluations.length} evaluations from ${dataDir}`,
      )

      const errors = validate(users, enrollments, evaluations)
      if (errors.length > 0) {
        console.error(`❌ ${errors.length} row(s) failed validation against the live API's own schemas:`)
        for (const e of errors.slice(0, 20)) console.error(`  - ${e}`)
        if (errors.length > 20) console.error(`  ...and ${errors.length - 20} more`)
        throw new Error('Validation failed — fix seed-data before importing.')
      }
      console.log('✅ All rows pass validation against the live API schemas.')

      if (!args.commit) {
        console.log('Dry run only — pass --commit to write to the database. No rows were inserted.')
        return
      }

      const school = await upsertSchool(args.slug, args.name ?? args.slug.toUpperCase())
      const schoolDb = getScopedDatabase(school.id)
      console.log(`Importing into organization "${school.slug}" (${school.id})`)

      // Roster rows can belong to people who already have a production account (own email/phone
      // registered outside this import). Their user.id/email/phoneNumber are unique constraints, so
      // inserting a second row for the same identity fails — the fix is to reuse the existing user's
      // id rather than insert a duplicate.
      const emails = users.map(u => u.email)
      const phones = users.flatMap(u => (u.phoneNumber ? [u.phoneNumber] : []))
      const existingUsers = await publicDb.query.user.findMany({
        where: (t, { inArray, or }) => or(inArray(t.email, emails), inArray(t.phoneNumber, phones)),
        columns: { id: true, email: true, phoneNumber: true, name: true },
      })
      const existingByEmail = new Map(existingUsers.map(u => [u.email, u]))
      const existingByPhone = new Map(
        existingUsers.filter(u => u.phoneNumber).map(u => [u.phoneNumber as string, u]),
      )

      const idRemap = new Map<string, string>()
      for (const row of users) {
        const emailMatch = existingByEmail.get(row.email)
        const phoneMatch = row.phoneNumber ? existingByPhone.get(row.phoneNumber) : undefined
        if (emailMatch && phoneMatch && emailMatch.id !== phoneMatch.id) {
          throw new Error(
            `user ${row.id} (${row.email} / ${row.phoneNumber}) matches two different existing ` +
              `production users — by email: ${emailMatch.id}, by phone: ${phoneMatch.id}. Resolve manually.`,
          )
        }
        const existing = emailMatch ?? phoneMatch
        if (existing) idRemap.set(row.id, existing.id)
      }

      if (idRemap.size > 0) {
        console.log(`⚠️  ${idRemap.size} roster user(s) already have a production account — reusing them:`)
        for (const row of users) {
          const existing = idRemap.get(row.id)
          if (!existing) continue
          const match = existingByEmail.get(row.email) ?? existingByPhone.get(row.phoneNumber ?? '')
          console.log(`  - "${row.name}" <${row.email}> -> existing user ${existing} ("${match?.name}")`)
        }
      }

      const usersToInsert = users.filter(u => !idRemap.has(u.id))
      const remappedProfiles = profiles.map(p =>
        idRemap.has(p.userId) ? { ...p, userId: idRemap.get(p.userId)! } : p,
      )

      // publicDb: user, then org membership for every imported user.
      for (const rows of chunk(usersToInsert, CHUNK_SIZE)) {
        await publicDb.insert(userTable).values(rows).onConflictDoNothing({ target: userTable.id })
      }
      const memberUserIds = new Set(users.map(u => idRemap.get(u.id) ?? u.id))
      for (const userId of memberUserIds) {
        await upsertOrgMember(school.id, userId, 'member')
      }
      console.log(
        `✅ Imported ${usersToInsert.length} new users (${idRemap.size} reused existing accounts) + ` +
          `${memberUserIds.size} org memberships.`,
      )

      // Scoped school DB, in FK dependency order, inside one transaction per school.
      await schoolDb.transaction(async tx => {
        for (const rows of chunk(tracks, CHUNK_SIZE)) {
          await tx.insert(track).values(rows).onConflictDoNothing({ target: track.order })
        }
        for (const rows of chunk(chapters, CHUNK_SIZE)) {
          await tx.insert(chapter).values(rows).onConflictDoNothing({ target: [chapter.trackId, chapter.code] })
        }
        for (const rows of chunk(batches, CHUNK_SIZE)) {
          const values = rows.map(r => ({ ...r, startDate: r.startDate ? new Date(r.startDate) : null }))
          await tx.insert(batch).values(values).onConflictDoNothing({ target: batch.code })
        }
        for (const rows of chunk(remappedProfiles, CHUNK_SIZE)) {
          await tx.insert(profile).values(rows).onConflictDoNothing({ target: profile.id })
        }
        for (const rows of chunk(enrollments, CHUNK_SIZE)) {
          const values = rows.map(r => ({
            ...r,
            joinedAt: r.joinedAt ? new Date(r.joinedAt) : null,
            leftDate: r.leftDate ? new Date(r.leftDate) : null,
          }))
          await tx
            .insert(enrollment)
            .values(values)
            .onConflictDoNothing({ target: [enrollment.profileId, enrollment.batchId] })
        }
        for (const rows of chunk(evaluations, CHUNK_SIZE)) {
          await tx.insert(evaluation).values(rows).onConflictDoNothing({ target: evaluation.id })
        }
      })

      console.log(
        `✅ Import committed: ${tracks.length} tracks, ${chapters.length} chapters, ${batches.length} batches, ` +
          `${profiles.length} profiles, ${enrollments.length} enrollments, ${evaluations.length} evaluations.`,
      )
    } finally {
      await shutdownPools()
    }
  },
})

// Stopgap until feat/whatsapp-otp-auth ships: imported roster users have a `user` row (from the
// `data` subcommand) but no `account` row, since that import bypasses better-auth's own
// signUpEmail entirely. signUpEmail can't be used to backfill one either — it tries to create a
// new `user` row and fails on the email/phoneNumber unique constraints these people already
// occupy. So this writes the `account` row directly, matching exactly what signUpEmail itself
// writes (providerId "credential", accountId == userId, password hashed with better-auth's own
// hasher) so `signInEmail` verifies it identically to a normal password account.
const grantPasswordsCmd = defineCommand({
  meta: {
    description:
      'Grant a shared temporary password to school members who have no login method yet ' +
      '(no account row at all — password or OAuth). Re-run is safe: only touches users still missing one.',
  },
  args: {
    schoolSlug: { type: 'string', default: 'slmts', description: 'Only grants to members of this school.' },
    password: { type: 'string', default: DEFAULT_TEMP_PASSWORD, description: 'Temporary password to grant.' },
    commit: {
      type: 'boolean',
      default: false,
      description: 'Actually write to the database. Without this flag, only reports who would be affected.',
    },
  },
  async run({ args }) {
    const operatorPhone = await promptSuperAdminPhone()
    try {
      await requireSuperAdminByPhone(operatorPhone)

      const school = await requireSchool(args.schoolSlug)
      const members = await publicDb.query.member.findMany({
        where: (t, { eq }) => eq(t.organizationId, school.id),
        columns: { userId: true },
      })
      const memberUserIds = [...new Set(members.map(m => m.userId))]

      const existingAccounts = await publicDb.query.account.findMany({
        columns: { userId: true },
      })
      const hasAnyLoginMethod = new Set(existingAccounts.map(a => a.userId))

      const targetUserIds = memberUserIds.filter(id => !hasAnyLoginMethod.has(id))

      console.log(
        `${targetUserIds.length} of ${memberUserIds.length} members of "${args.schoolSlug}" have no login method yet.`,
      )

      if (!args.commit) {
        console.log('Dry run only — pass --commit to write to the database. No rows were inserted.')
        return
      }

      let count = 0
      for (const userId of targetUserIds) {
        const hash = await hashPassword(args.password)
        await publicDb.insert(account).values({
          id: uuidv7(),
          userId,
          providerId: 'credential',
          accountId: userId,
          password: hash,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        count++
        if (count % 200 === 0) console.log(`  ${count}/${targetUserIds.length}`)
      }

      console.log(`✅ Granted temporary password to ${count} users. Password: "${args.password}"`)
    } finally {
      await shutdownPools()
    }
  },
})

runMain(
  defineCommand({
    meta: {
      name: 'import-school',
      description: 'Import a school roster from parsed Excel data and manage its post-import access.',
    },
    subCommands: { data: dataCmd, 'grant-passwords': grantPasswordsCmd },
  }),
)
