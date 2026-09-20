import '@narada/env/load'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { defineCommand, runMain } from 'citty'

import {
  batch,
  chapter,
  course,
  enrollment,
  evaluation,
  exam,
  examResult,
  getScopedDatabase,
  profile,
  publicDb,
  registration,
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
import {
  CreateEvaluationSchema,
  proficiencyLevelSchema,
} from '@narada/api/src/evaluations/schema'
import { EXAM_MARK_MAX, outcomeForTotal, type ExamOutcome } from '@narada/api/src/exams/grading'
import { CreateRegistrationSchema } from '@narada/api/src/registrations/schema'
import { assertCourseSlug, upsertOrgMember, upsertSchool } from './school-helpers'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// One directory per school, written by parse-excel-to-json.ts: seed-data/<school slug>/.
const SEED_DATA_ROOT = path.join(__dirname, '../../seed-data')
const CHUNK_SIZE = 1000

// Row shapes below are parse-excel-to-json.ts's own output, narrowed to what this file reads.
type CourseRow = { slug: string; name: string }
type TrackRow = { id: string; courseSlug: string; name: string; order: number }
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
type ProfileRow = { id: string; userId: string; name: string; phone: string | null; city: string | null; sourceKey: string }
// One registration-sheet row — what one person filed for one course. Raw strings from the sheet;
// `toRegistrationFields` below is the one place they become typed columns, for the registration row
// and for the profile it is copied onto.
type RegistrationRow = {
  id: string
  courseSlug: string
  profileId: string
  sourceKey: string
  status: 'approved' | 'pending'
  registeredYear: number | null
  firstName: string
  lastName: string
  yearOfBirth: number
  phone: string | null
  email: string | null
  city: string | null
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
type ProficiencyLevel = 'absent' | 'notStarted' | 'practicing' | 'level0' | 'level1' | 'level2' | 'level3' | 'level4'
// The columns `registration` and `profile` share, typed. `profile` is a snapshot of them taken from
// the person's first registration (registrations/service.ts::provisionApprovedApplicant copies the same
// fields on approval).
type RegistrationFields = {
  email: string | null
  yearOfBirth: number
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
type EvaluationRow = {
  id: string
  studentId: string
  chapterId: string
  level: ProficiencyLevel
  evaluatorId: string
}
type ExamRow = {
  id: string
  trackId: string
  studentId: string
  batchId: string
  marks: {
    aksharaShuddhi: number
    swaraShuddhi: number
    niyantranaAnargalata: number
    shraavyata: number
    pratishakyaGrammar: number
  }
  childrenBonus: number
  total: number
  sheetGrade: string
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

// The historical registration sheets asked a differently-worded self-assessment question ("None" /
// "Low" / "Medium" / "High", each with or without a long free-text explanation) than the live
// registration form's Level 1-4 scale (lib/registration-proficiency.ts in apps/web) — there is no
// exact mapping between them. This keeps only the leading keyword's coarse intent: no experience,
// some practice, or meaningfully experienced — kept at the lowest formal tier rather than guessing
// a specific level 1-4 number the data doesn't actually claim. "Medium" (only the newer sheet has
// it) is held at 'practicing' with "Low": claiming a formal level from a self-report would
// over-state it. ('practicing' is what the web app shows as L0.)
function mapSelfReportedProficiency(value: string | null): ProficiencyLevel | null {
  const lower = value?.trim().toLowerCase()
  if (!lower) return null
  if (lower.startsWith('no')) return 'notStarted' // "None. …" and "No Proficiency"
  if (lower.startsWith('low') || lower.startsWith('medium')) return 'practicing'
  if (lower.startsWith('high')) return 'level1'
  return null
}

// The sheets' "COUNTRY TIME ZONE" is a pick-list bucket ("1-INDIA IST"), not the IANA identifier
// `profile.countryTimeZone` holds (see that column's doc comment) — the web app would print the
// bucket text raw. Only the buckets that name a single zone convert; "MST/PST" spans two and
// "OTHER" none, so those stay empty rather than guessed.
const SHEET_TIME_ZONES: Record<string, string> = {
  '1-india ist': 'Asia/Kolkata',
  '2-usa est': 'America/New_York',
  '3-usa cst': 'America/Chicago',
}

function toRegistrationFields(row: RegistrationRow): RegistrationFields {
  return {
    email: row.email,
    yearOfBirth: row.yearOfBirth,
    countryTimeZone: row.countryTimeZone ? (SHEET_TIME_ZONES[row.countryTimeZone.trim().toLowerCase()] ?? null) : null,
    learningGoal: row.learningGoal,
    currentProficiency: mapSelfReportedProficiency(row.currentProficiency),
    spokenLanguages: splitList(row.spokenLanguages),
    readLanguages: splitList(row.readLanguages),
    parentNames: splitList(row.parentNames),
    dressCodeAgreed: parseYesNo(row.dressCodeAgreed),
    noMeatAgreed: parseYesNo(row.noMeatAgreed),
    noAlcoholAgreed: parseYesNo(row.noAlcoholAgreed),
    noSmokingAgreed: parseYesNo(row.noSmokingAgreed),
    comments: row.comments,
  }
}

/**
 * Merges each profile with the details from its first registration (file order — the Vedam sheet
 * before the Puranokta one), the same fields `registrations/service.ts::provisionApprovedApplicant`
 * copies from a live registration approval, so a bulk-imported profile ends up carrying the same
 * kind of detail one approved through the app would. A person's later registrations (the other
 * course) stay on their own `registration` row and don't overwrite it.
 */
function applyRegistrationFields(profiles: ProfileRow[], registrations: RegistrationRow[]) {
  const firstByProfile = new Map<string, RegistrationRow>()
  for (const row of registrations) if (!firstByProfile.has(row.profileId)) firstByProfile.set(row.profileId, row)

  return profiles.map(({ sourceKey: _sourceKey, ...rest }) => {
    const first = firstByProfile.get(rest.id)
    const fields = first ? toRegistrationFields(first) : null
    return {
      ...rest,
      email: fields?.email ?? null,
      yearOfBirth: fields?.yearOfBirth ?? null,
      countryTimeZone: fields?.countryTimeZone ?? null,
      learningGoal: fields?.learningGoal ?? null,
      currentProficiency: fields?.currentProficiency ?? null,
      spokenLanguages: fields?.spokenLanguages ?? [],
      readLanguages: fields?.readLanguages ?? [],
      parentNames: fields?.parentNames ?? [],
      dressCodeAgreed: fields?.dressCodeAgreed ?? false,
      noMeatAgreed: fields?.noMeatAgreed ?? false,
      noAlcoholAgreed: fields?.noAlcoholAgreed ?? false,
      noSmokingAgreed: fields?.noSmokingAgreed ?? false,
      comments: fields?.comments ?? null,
    }
  })
}

// Matches the phoneNumber plugin's validator in packages/auth/src/index.ts — kept in sync
// manually rather than imported, since that's server auth config and this is an offline CLI import.
// The live API refuses a teacher's own evaluation at `level4` (only a graded track exam grants it),
// but a bulk import loads history, not a teacher grading today — the source spreadsheet has chapters
// already marked L4 (72 in the Vedam data). So the imported level is checked against the full
// list of levels rather than the teacher-gradable subset; everything else about the row is still
// checked against the API's own schema.
const createEvaluationSchema = CreateEvaluationSchema.extend({ level: proficiencyLevelSchema })

const E164_PATTERN = /^\+[1-9]\d{7,14}$/

// What the mark sheet's own "Exam Grade" label says an outcome is called, to catch a total and a
// label that disagree. The Puranokta sheet also prints "L1/L2 - Reappear" on a 65-84 total, i.e.
// "passed the level but must sit again" — a nuance the outcome enum has no place for.
const OUTCOME_LABELS: Record<ExamOutcome, RegExp> = {
  athiUttamam: /^athi uttamam/i,
  prathamaSreni: /^prathama sreni/i,
  dwitiyaSreni: /^dwitiya sreni/i,
  level2: /^l2\b/i,
  level1: /^l1\b/i,
  reappear: /reappear/i,
}

type Dataset = {
  courses: CourseRow[]
  tracks: TrackRow[]
  chapters: ChapterRow[]
  batches: BatchRow[]
  users: UserRow[]
  profiles: ProfileRow[]
  registrations: RegistrationRow[]
  enrollments: EnrollmentRow[]
  evaluations: EvaluationRow[]
  exams: ExamRow[]
}

/** Everything wrong with the dataset that would otherwise surface as one opaque error midway through the transaction. */
function validate(data: Dataset): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  for (const c of data.courses) {
    try {
      assertCourseSlug(c.slug)
    } catch (e) {
      errors.push((e as Error).message)
    }
  }

  const ids = (rows: { id: string }[]) => new Set(rows.map(r => r.id))
  const courseSlugs = new Set(data.courses.map(c => c.slug))
  const trackById = new Map(data.tracks.map(t => [t.id, t]))
  const batchById = new Map(data.batches.map(b => [b.id, b]))
  const chapterIds = ids(data.chapters)
  const profileIds = ids(data.profiles)

  // Foreign keys: named here rather than as a bare constraint violation partway through.
  for (const t of data.tracks) if (!courseSlugs.has(t.courseSlug)) errors.push(`track ${t.id}: unknown course "${t.courseSlug}"`)
  for (const c of data.chapters) if (!trackById.has(c.trackId)) errors.push(`chapter ${c.code}: unknown track ${c.trackId}`)
  for (const b of data.batches) if (!trackById.has(b.trackId)) errors.push(`batch ${b.code}: unknown track ${b.trackId}`)
  const userIds = ids(data.users)
  for (const p of data.profiles) if (!userIds.has(p.userId)) errors.push(`profile ${p.sourceKey}: unknown user ${p.userId}`)

  for (const u of data.users) {
    if (u.phoneNumber && !E164_PATTERN.test(u.phoneNumber)) {
      errors.push(`user ${u.id}: phoneNumber "${u.phoneNumber}" is not valid E.164`)
    }
  }

  for (const e of data.enrollments) {
    if (!profileIds.has(e.profileId)) errors.push(`enrollment ${e.profileId}/${e.batchId}: unknown profile`)
    if (!batchById.has(e.batchId)) errors.push(`enrollment ${e.profileId}/${e.batchId}: unknown batch`)
    const result = enrollSchema.safeParse({ profileId: e.profileId, role: e.role })
    if (!result.success) {
      errors.push(`enrollment ${e.profileId}/${e.batchId}: ${result.error.issues.map(i => i.message).join('; ')}`)
    }
  }

  // A student holds at most one active seat per course. The database refuses a violation with a
  // single opaque error midway through the transaction, so name every offender up front.
  const courseOfBatch = (batchId: string) => {
    const b = batchById.get(batchId)
    return b ? trackById.get(b.trackId)?.courseSlug : undefined
  }
  const activeSeats = new Map<string, string[]>()
  for (const e of data.enrollments) {
    if (e.role === 'student' && e.status === 'active') {
      const key = `${e.profileId}|${courseOfBatch(e.batchId)}`
      activeSeats.set(key, [...(activeSeats.get(key) ?? []), e.batchId])
    }
  }
  for (const [key, batchIds] of activeSeats) {
    if (batchIds.length > 1) {
      const [profileId, courseSlug] = key.split('|')
      errors.push(
        `profile ${profileId}: active student in ${batchIds.length} batches of course "${courseSlug}" (${batchIds.join(', ')}) — only one is allowed`,
      )
    }
  }

  // The registration each row would become is checked against the API's own create schema (which
  // wants a valid E.164 phone, a name, a year of birth in range, …).
  for (const r of data.registrations) {
    if (!courseSlugs.has(r.courseSlug)) errors.push(`registration ${r.sourceKey}: unknown course "${r.courseSlug}"`)
    if (!profileIds.has(r.profileId)) errors.push(`registration ${r.sourceKey}: unknown profile`)
    const result = CreateRegistrationSchema.safeParse({
      firstName: r.firstName,
      lastName: r.lastName,
      phone: r.phone,
      city: r.city,
      ...toRegistrationFields(r),
    })
    if (!result.success) {
      errors.push(`registration ${r.sourceKey} (${r.courseSlug}): ${result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
    }
  }

  for (const ev of data.evaluations) {
    if (!profileIds.has(ev.studentId) || !profileIds.has(ev.evaluatorId) || !chapterIds.has(ev.chapterId)) {
      errors.push(`evaluation ${ev.id}: unknown student, evaluator or chapter`)
    }
    const result = createEvaluationSchema.safeParse({
      studentId: ev.studentId,
      chapterId: ev.chapterId,
      level: ev.level,
    })
    if (!result.success) {
      errors.push(`evaluation ${ev.id}: ${result.error.issues.map(i => i.message).join('; ')}`)
    }
  }

  const enrolledIn = new Set(data.enrollments.map(e => `${e.profileId}|${e.batchId}`))
  for (const x of data.exams) {
    const label = `exam ${x.id} (student ${x.studentId})`
    if (!profileIds.has(x.studentId) || !profileIds.has(x.evaluatorId)) errors.push(`${label}: unknown student or evaluator`)
    if (!trackById.has(x.trackId)) errors.push(`${label}: unknown track`)
    if (!enrolledIn.has(`${x.studentId}|${x.batchId}`)) errors.push(`${label}: student is not enrolled in batch ${x.batchId}`)
    for (const [mark, value] of Object.entries(x.marks) as [keyof typeof EXAM_MARK_MAX, number][]) {
      if (!Number.isInteger(value) || value < 0 || value > EXAM_MARK_MAX[mark]) {
        errors.push(`${label}: ${mark} = ${value} is outside 0..${EXAM_MARK_MAX[mark]}`)
      }
    }
    if (![0, 5, 10].includes(x.childrenBonus)) errors.push(`${label}: children's bonus ${x.childrenBonus} is not 0, 5 or 10`)
    const sum = Object.values(x.marks).reduce((a, b) => a + b, 0) + x.childrenBonus
    if (sum !== x.total) errors.push(`${label}: total ${x.total} is not the sum of its marks (${sum})`)
    const outcome = outcomeForTotal(x.total)
    if (!OUTCOME_LABELS[outcome].test(x.sheetGrade)) {
      warnings.push(`${label}: total ${x.total} grades as "${outcome}" under the API's rules, but the sheet says "${x.sheetGrade}"`)
    }
  }

  // The check the importer lacked: can each person reach any content afterwards? A non-admin is
  // "part of" a course only through an enrollment in it or an approved registration that converted
  // to their profile (AccessPolicy#canReadCourseContent) — anyone with neither reads nothing.
  const reachable = new Set(data.enrollments.map(e => e.profileId))
  for (const r of data.registrations) if (r.status === 'approved') reachable.add(r.profileId)
  for (const p of data.profiles) {
    if (!reachable.has(p.id)) errors.push(`profile ${p.sourceKey} (${p.name}): no enrollment and no approved registration — part of no course, would read no content`)
  }

  return { errors, warnings }
}

const dataCmd = defineCommand({
  meta: { description: 'Import parsed spreadsheet data (seed-data/<school>/*.json) into a real school.' },
  args: {
    slug: {
      type: 'string',
      default: 'slmts',
      description: 'School org slug to import into; its data is read from seed-data/<slug>/ unless --dataDir is given.',
    },
    name: { type: 'string', description: 'School display name (defaults to uppercased slug).' },
    dataDir: { type: 'string', description: 'Directory containing the parsed seed-data JSON files (default seed-data/<slug>).' },
    commit: {
      type: 'boolean',
      default: false,
      description: 'Actually write to the database. Without this flag, only validates and reports.',
    },
    'allow-existing': {
      type: 'boolean',
      default: false,
      description:
        'Tolerate rows that already exist (an id or unique key collision). Without it, a table that inserts ' +
        'fewer rows than it loaded aborts the import — a skipped row is otherwise silent.',
    },
  },
  async run({ args }) {
    const dataDir = args.dataDir ?? path.join(SEED_DATA_ROOT, args.slug)

    try {
      const data: Dataset = {
        courses: readJson(dataDir, 'courses.json'),
        tracks: readJson(dataDir, 'tracks.json'),
        chapters: readJson(dataDir, 'chapters.json'),
        batches: readJson(dataDir, 'batches.json'),
        users: readJson(dataDir, 'users.json'),
        profiles: readJson(dataDir, 'profiles.json'),
        registrations: readJson(dataDir, 'registrations.json'),
        enrollments: readJson(dataDir, 'enrollments.json'),
        evaluations: readJson(dataDir, 'evaluations.json'),
        exams: readJson(dataDir, 'exams.json'),
      }
      const { courses, tracks, chapters, batches, users, profiles, registrations, enrollments, evaluations, exams } = data

      console.log(
        `Loaded ${courses.length} courses (${courses.map(c => c.slug).join(', ')}), ${users.length} users, ` +
          `${profiles.length} profiles, ${registrations.length} registrations, ${tracks.length} tracks, ` +
          `${chapters.length} chapters, ${batches.length} batches, ${enrollments.length} enrollments, ` +
          `${evaluations.length} evaluations, ${exams.length} exams from ${dataDir}`,
      )

      const { errors, warnings } = validate(data)
      // Findings the parser could not load around — a row with an impossible mark, a guru who is
      // nobody, … — are the spreadsheet's to fix, not this importer's to skip.
      const report = readJson<{ blocking: { sheet: string; row?: number; key?: string; message: string }[] }>(dataDir, '_report.json')
      errors.unshift(
        ...report.blocking.map(b => `${b.sheet}${b.row ? ` row ${b.row}` : ''}${b.key ? ` [${b.key}]` : ''}: ${b.message}`),
      )
      if (warnings.length > 0) {
        console.warn(`⚠️  ${warnings.length} warning(s) — imported anyway:`)
        for (const w of warnings.slice(0, 10)) console.warn(`  - ${w}`)
        if (warnings.length > 10) console.warn(`  ...and ${warnings.length - 10} more`)
      }
      if (errors.length > 0) {
        console.error(`❌ ${errors.length} problem(s) found before writing anything:`)
        for (const e of errors.slice(0, 20)) console.error(`  - ${e}`)
        if (errors.length > 20) console.error(`  ...and ${errors.length - 20} more`)
        throw new Error(
          'Validation failed — fix the spreadsheet, re-run `pnpm parse:excel`, and check ' +
            `${path.join(dataDir, '_report.json')} for the full list.`,
        )
      }
      console.log('✅ All rows pass validation against the live API schemas, and every person can reach a course.')

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
        if (existing && existing.id !== row.id) idRemap.set(row.id, existing.id)
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
      const remappedProfiles = applyRegistrationFields(
        profiles.map(p => (idRemap.has(p.userId) ? { ...p, userId: idRemap.get(p.userId)! } : p)),
        registrations,
      )

      // publicDb: user, then org membership for every imported user.
      let usersInserted = 0
      for (const rows of chunk(usersToInsert, CHUNK_SIZE)) {
        usersInserted += (
          await publicDb.insert(userTable).values(rows).onConflictDoNothing({ target: userTable.id }).returning({ id: userTable.id })
        ).length
      }
      const memberUserIds = new Set(users.map(u => idRemap.get(u.id) ?? u.id))
      for (const userId of memberUserIds) {
        await upsertOrgMember(school.id, userId, 'member')
      }
      console.log(
        `✅ Imported ${usersInserted} new users (${idRemap.size} reused existing accounts, ` +
          `${usersToInsert.length - usersInserted} already present) + ${memberUserIds.size} org memberships.`,
      )

      // Scoped school DB, in FK dependency order, inside one transaction per school.
      const inserted: Record<string, number> = {}
      await schoolDb.transaction(async tx => {
        // `onConflictDoNothing` makes a re-run safe, but it also makes a collision (a batch code
        // already in use by another course, a track order already taken) drop the row without a
        // word — and the FK errors that follow name the symptom, not the cause. So every table
        // counts what it actually inserted, and a shortfall aborts the whole transaction.
        const record = (label: string, loaded: number, actual: number) => {
          inserted[label] = actual
          if (actual !== loaded && !args['allow-existing']) {
            throw new Error(
              `${label}: loaded ${loaded} rows but inserted ${actual} — the rest already exist or collide ` +
                `on a unique key. Nothing was committed. Rerun with --allow-existing if that is expected.`,
            )
          }
        }

        // Every course gets a row; tracks are stamped with it, and batches and enrollments carry
        // their track's/batch's course (the schema's composite foreign keys refuse anything else).
        await tx
          .insert(course)
          .values(courses.map(c => ({ slug: c.slug, name: c.name })))
          .onConflictDoNothing({ target: course.slug })
        const courseRows = await tx.query.course.findMany()
        const courseIdBySlug = new Map(courseRows.map(c => [c.slug, c.id]))
        for (const c of courses) {
          if (!courseIdBySlug.has(c.slug)) throw new Error(`Course "${c.slug}" missing after insert`)
          console.log(`Importing into course "${c.slug}" (${courseIdBySlug.get(c.slug)})`)
        }

        const courseIdOfTrack = new Map(tracks.map(t => [t.id, courseIdBySlug.get(t.courseSlug)!]))
        const courseIdOfBatch = new Map(batches.map(b => [b.id, courseIdOfTrack.get(b.trackId)!]))

        let n = 0
        for (const rows of chunk(tracks, CHUNK_SIZE)) {
          const values = rows.map(({ courseSlug, ...r }) => ({ ...r, courseId: courseIdBySlug.get(courseSlug)! }))
          n += (await tx.insert(track).values(values).onConflictDoNothing().returning({ id: track.id })).length
        }
        record('track', tracks.length, n)

        n = 0
        for (const rows of chunk(chapters, CHUNK_SIZE)) {
          n += (await tx.insert(chapter).values(rows).onConflictDoNothing().returning({ id: chapter.id })).length
        }
        record('chapter', chapters.length, n)

        n = 0
        for (const rows of chunk(batches, CHUNK_SIZE)) {
          const values = rows.map(r => ({
            ...r,
            courseId: courseIdOfTrack.get(r.trackId)!,
            startDate: r.startDate ? new Date(r.startDate) : null,
          }))
          n += (await tx.insert(batch).values(values).onConflictDoNothing().returning({ id: batch.id })).length
        }
        record('batch', batches.length, n)

        n = 0
        for (const rows of chunk(remappedProfiles, CHUNK_SIZE)) {
          n += (await tx.insert(profile).values(rows).onConflictDoNothing().returning({ id: profile.id })).length
        }
        record('profile', remappedProfiles.length, n)

        // An approved registration per registration-sheet row, linked to the profile it produced —
        // the shape the app itself leaves when an admin approves an application, and what makes a
        // person "part of" the course when they have no batch yet. `createdAt` is Jan 1 of the year
        // the sheet says they registered (it has no finer date).
        n = 0
        for (const rows of chunk(registrations, CHUNK_SIZE)) {
          const values = rows.map(r => ({
            id: r.id,
            status: r.status,
            courseId: courseIdBySlug.get(r.courseSlug)!,
            firstName: r.firstName,
            lastName: r.lastName,
            phone: r.phone!,
            city: r.city,
            ...toRegistrationFields(r),
            convertedProfileId: r.status === 'approved' ? r.profileId : null,
            createdAt: r.registeredYear ? new Date(`${r.registeredYear}-01-01T00:00:00.000Z`) : new Date(),
          }))
          n += (await tx.insert(registration).values(values).onConflictDoNothing().returning({ id: registration.id })).length
        }
        record('registration', registrations.length, n)

        n = 0
        for (const rows of chunk(enrollments, CHUNK_SIZE)) {
          const values = rows.map(r => ({
            ...r,
            courseId: courseIdOfBatch.get(r.batchId)!,
            joinedAt: r.joinedAt ? new Date(r.joinedAt) : null,
            leftDate: r.leftDate ? new Date(r.leftDate) : null,
          }))
          n += (await tx.insert(enrollment).values(values).onConflictDoNothing().returning({ profileId: enrollment.profileId })).length
        }
        record('enrollment', enrollments.length, n)

        n = 0
        for (const rows of chunk(evaluations, CHUNK_SIZE)) {
          n += (await tx.insert(evaluation).values(rows).onConflictDoNothing().returning({ id: evaluation.id })).length
        }
        record('evaluation', evaluations.length, n)

        // A completed sitting and its marks, from the sheets' certification mark sheets. The
        // outcome is the API's own grading of the total, so a later change to the thresholds
        // can't disagree with what the importer wrote (the row is a snapshot, as in the app).
        // The workbooks record no exam date, and `scheduledAt` is NOT NULL, so every imported exam
        // is dated the moment of import — the true date is unknown, not the import's to invent.
        const importedAt = new Date()
        n = 0
        let results = 0
        for (const rows of chunk(exams, CHUNK_SIZE)) {
          const examValues = rows.map(x => ({
            id: x.id,
            trackId: x.trackId,
            studentId: x.studentId,
            batchId: x.batchId,
            scheduledAt: importedAt,
            status: 'completed' as const,
          }))
          n += (await tx.insert(exam).values(examValues).onConflictDoNothing().returning({ id: exam.id })).length
          const resultValues = rows.map(x => ({
            examId: x.id,
            ...x.marks,
            childrenBonus: x.childrenBonus,
            total: x.total,
            outcome: outcomeForTotal(x.total),
            evaluatorId: x.evaluatorId,
            evaluatedAt: importedAt,
          }))
          results += (await tx.insert(examResult).values(resultValues).onConflictDoNothing().returning({ examId: examResult.examId })).length
        }
        record('exam', exams.length, n)
        record('examResult', exams.length, results)
      })

      console.log(
        `✅ Import committed: ${courses.length} courses, ${inserted.track} tracks, ${inserted.chapter} chapters, ` +
          `${inserted.batch} batches, ${inserted.profile} profiles, ${inserted.registration} registrations, ` +
          `${inserted.enrollment} enrollments, ${inserted.evaluation} evaluations, ${inserted.exam} exams with results.`,
      )
    } finally {
      await shutdownPools()
    }
  },
})

runMain(
  defineCommand({
    meta: {
      name: 'import-school',
      description: 'Import a school roster from the parsed spreadsheet data (seed-data/<school>/).',
    },
    subCommands: { data: dataCmd },
  }),
)
