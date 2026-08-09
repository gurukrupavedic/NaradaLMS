import '@narada/env/load'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { defineCommand, runMain } from 'citty'

import {
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
} from '@narada/db'
// Reusing the live API's own validators rather than re-deriving parallel checks: a bulk import
// that bypasses the HTTP layer should still never write a row the real API would reject.
import { enrollSchema } from '@narada/api/src/services/enrollment'
import { createEvaluationSchema } from '@narada/api/src/services/evaluation'
import { upsertOrgMember, upsertSchool } from './school-helpers'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_DATA_DIR = path.join(__dirname, '../../seed-data')
const CHUNK_SIZE = 1000

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
type UserRow = { id: string; name: string; email: string; isSuperAdmin: false }
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

function validate(enrollments: EnrollmentRow[], evaluations: EvaluationRow[]): string[] {
  const errors: string[] = []

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

const importCmd = defineCommand({
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

      const errors = validate(enrollments, evaluations)
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

      // publicDb: user, then org membership for every imported user.
      for (const rows of chunk(users, CHUNK_SIZE)) {
        await publicDb.insert(userTable).values(rows).onConflictDoNothing({ target: userTable.id })
      }
      for (const u of users) {
        await upsertOrgMember(school.id, u.id, 'member')
      }
      console.log(`✅ Imported ${users.length} users + org memberships.`)

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
        for (const rows of chunk(profiles, CHUNK_SIZE)) {
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

runMain(importCmd)
