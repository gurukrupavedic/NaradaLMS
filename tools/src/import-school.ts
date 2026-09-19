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
// @narada/api, not @narada/api-legacy: railway.json builds apps/api/Dockerfile, and that's the
// rewritten app (post PR #128) — api-legacy is the pre-rewrite app, kept only as a buildable
// fallback (docker-compose.yaml's "legacy" profile), not what's actually deployed.
import { CreateEnrollmentSchema as enrollSchema } from '@narada/api/src/enrollment/schema'
import { CreateEvaluationSchema as createEvaluationSchema } from '@narada/api/src/evaluations/schema'
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
// Registration-sheet metadata, identity-matched to a profileId — parse-excel-to-json.ts's own
// RegistrationMetadataRow, narrowed to just the fields `applyRegistrationMetadata` below actually
// consumes (the rest still have no home on `profile` — see that file's doc comment).
type RegistrationMetadataRow = {
  profileId: string
  email: string | null
  yearOfBirth: number | null
  countryTimeZone: string | null
  spokenLanguages: string | null
  readLanguages: string | null
  parentNames: string | null
  learningGoal: string | null
  currentProficiency: string | null
  dressCodeAgreed: string | null
  noMeatAgreed: string | null
  noAlcoholAgreed: string | null
  noSmokingAgreed: string | null
  comments: string | null
}
// `profile` with the registration-derived columns filled in — see `applyRegistrationMetadata`.
type ProfileInsertRow = ProfileRow & {
  email: string | null
  yearOfBirth: number | null
  countryTimeZone: string | null
  learningGoal: string | null
  currentProficiency: ProficiencyLevel | null
  spokenLanguages: string[]
  readLanguages: string[]
  parentNames: string[]
  dressCodeAgreed: boolean
  noMeatAgreed: boolean
  noAlcoholAgreed: boolean
  noSmokingAgreed: boolean
  comments: string | null
}
type EnrollmentRow = {
  profileId: string
  batchId: string
  role: 'instructor' | 'ta' | 'student'
  status: 'active' | 'break' | 'dropped' | 'inactive'
  joinedAt: string | null
  leftDate: string | null
}
type ProficiencyLevel = 'absent' | 'notStarted' | 'practicing' | 'level0' | 'level1' | 'level2' | 'level3' | 'level4'
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

function parseYesNo(value: string | null): boolean {
  return value?.trim().toLowerCase() === 'yes'
}

// Free-text lists in the source spreadsheet mix comma-separated ("Telugu, Hindi") and
// space-separated ("telugu English") entries inconsistently; splitting on commas handles the
// overwhelming majority without guessing at anything more elaborate — a handful of purely
// space-separated entries stay as one combined string rather than being force-split on a boundary
// that isn't actually there.
//
// Junk placeholder entries are dropped rather than kept as a fake language/parent name. The
// "not applicable" family shows up in a lot of different spellings/punctuation across ~1000 rows
// ("N/A", "N.A.", "N-A", "n/a", "Not Applicable") — stripping non-alphanumerics before comparing
// collapses all of those to one check instead of hand-enumerating every variant.
const LIST_JUNK_VALUES = new Set(['na', 'none', 'no', 'notapplicable', '0'])
function normalizeForJunkCheck(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}
function splitList(value: string | null): string[] {
  if (!value) return []
  return value
    .split(',')
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0 && !LIST_JUNK_VALUES.has(normalizeForJunkCheck(entry)))
}

// The historical registration sheet asked a differently-worded self-assessment question ("None" /
// "Low" / "High", each followed by a long free-text explanation) than the live registration form's
// Level 1-4 scale (lib/registration-proficiency.ts in apps/web) — there is no exact mapping
// between them. This keeps only the leading keyword's coarse intent: no experience, some
// self-taught practice, or meaningfully experienced — kept at the lowest formal tier rather than
// guessing a specific level 1-4 number the data doesn't actually claim.
function mapSelfReportedProficiency(value: string | null): ProficiencyLevel | null {
  const lower = value?.trim().toLowerCase()
  if (!lower) return null
  if (lower.startsWith('none')) return 'notStarted'
  if (lower.startsWith('low')) return 'practicing'
  if (lower.startsWith('high')) return 'level1'
  return null
}

/**
 * Merges each profile with its matching registration-metadata row (by profileId, 1:1 — see
 * parse-excel-to-json.ts's own doc comment on RegistrationMetadataRow), converting the sheet's raw
 * strings into the typed shape `profile`'s own columns expect — the same fields
 * `registrations/service.ts::provisionApprovedApplicant` copies from a live registration approval,
 * so a bulk-imported profile ends up carrying the same kind of detail one approved through the app
 * would. A profile with no metadata row (e.g. a teacher, who never filed a registration) gets the
 * same column defaults a fresh registration-less profile would.
 */
function applyRegistrationMetadata(
  profiles: ProfileRow[],
  metadata: RegistrationMetadataRow[],
): ProfileInsertRow[] {
  const metadataByProfileId = new Map(metadata.map(row => [row.profileId, row]))

  return profiles.map(profile => {
    const meta = metadataByProfileId.get(profile.id)
    return {
      ...profile,
      email: meta?.email ?? null,
      yearOfBirth: meta?.yearOfBirth ?? null,
      countryTimeZone: meta?.countryTimeZone ?? null,
      learningGoal: meta?.learningGoal ?? null,
      currentProficiency: mapSelfReportedProficiency(meta?.currentProficiency ?? null),
      spokenLanguages: splitList(meta?.spokenLanguages ?? null),
      readLanguages: splitList(meta?.readLanguages ?? null),
      parentNames: splitList(meta?.parentNames ?? null),
      dressCodeAgreed: parseYesNo(meta?.dressCodeAgreed ?? null),
      noMeatAgreed: parseYesNo(meta?.noMeatAgreed ?? null),
      noAlcoholAgreed: parseYesNo(meta?.noAlcoholAgreed ?? null),
      noSmokingAgreed: parseYesNo(meta?.noSmokingAgreed ?? null),
      comments: meta?.comments ?? null,
    }
  })
}

/** Like `readJson`, but tolerant of an older seed-data directory that predates this file. */
function readJsonOptional<T>(dataDir: string, fileName: string, fallback: T): T {
  const filePath = path.join(dataDir, fileName)
  if (!fs.existsSync(filePath)) return fallback
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
}

// Matches the phoneNumber plugin's validator in packages/auth/src/index.ts — kept in sync
// manually rather than imported, since that's server auth config and this is an offline CLI import.
const E164_PATTERN = /^\+[1-9]\d{7,14}$/

function validate(
  users: UserRow[],
  enrollments: EnrollmentRow[],
  evaluations: EvaluationRow[],
): string[] {
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
      const registrationMetadata = readJsonOptional<RegistrationMetadataRow[]>(
        dataDir,
        'registration-metadata.json',
        [],
      )

      console.log(
        `Loaded ${users.length} users, ${profiles.length} profiles, ${tracks.length} tracks, ` +
          `${chapters.length} chapters, ${batches.length} batches, ${enrollments.length} enrollments, ` +
          `${evaluations.length} evaluations, ` +
          `${registrationMetadata.length} registration-metadata rows from ${dataDir}`,
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
      const remappedProfiles = applyRegistrationMetadata(
        profiles.map(p => (idRemap.has(p.userId) ? { ...p, userId: idRemap.get(p.userId)! } : p)),
        registrationMetadata,
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
        // Exams and their results are deliberately not imported here: a track's certification is
        // now its latest `examResult` (packages/db/src/schema/school.ts), which needs the real
        // mark sheet — a level from the old spreadsheet's "L4 Cert Status" column can't stand in
        // for it. Seed them from data that carries the marks.
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

// Retired by the Twilio OTP rollout (packages/auth/src/index.ts sets emailAndPassword.enabled to
// false): even if this still wrote a working "credential" account row, better-auth no longer
// registers a /sign-in/email endpoint to authenticate it against, so a granted password would
// silently do nothing. Left registered (rather than deleted outright) so `grant-passwords` fails
// loudly instead of 404ing, since roster members with no phone number yet — the case this
// existed for — still have no login path; that replacement is a product decision for the team,
// not something to improvise here.
const grantPasswordsCmd = defineCommand({
  meta: {
    description:
      'REMOVED: email/password sign-in no longer exists (Twilio OTP auth replaced it). ' +
      'Roster members without a phone number on file have no login method — decide how to ' +
      'collect one before re-enabling anything here.',
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
  async run() {
    throw new Error(
      'grant-passwords is retired: email/password sign-in was removed when Twilio OTP auth ' +
        'landed, so a granted password can no longer be used to sign in. Members with no phone ' +
        'number on file currently have no login method — see packages/auth/src/index.ts.',
    )
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
