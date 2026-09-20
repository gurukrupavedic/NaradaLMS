import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import XLSXModule from 'xlsx'
// Deliberately not `uuidv7` from `@narada/db`: importing anything from that package eagerly opens
// a live Postgres pool and validates the full app env (DB creds, auth secret, OAuth, R2) via
// `@narada/env`. This script only transforms spreadsheets into review-ready JSON — it must run
// standalone, with no DB or environment configured.
import { v5 as uuidv5 } from 'uuid'

// Handle CommonJS / ESM default export compatibility for SheetJS
const XLSX = (XLSXModule as any).default || XLSXModule

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// The source workbooks (seed-data/slmts.xlsx, seed-data/rr.xlsx) and everything parsed from them
// (seed-data/<school>/) live in one folder that is gitignored: it is real people's names, phone
// numbers and emails, and none of it belongs in Git. Both are overridable so the parser can be
// pointed at a scratch copy of the workbooks.
const SEED_DATA_DIR = path.join(__dirname, '../../seed-data')
const DATA_DIR = process.env.SEED_SOURCE_DIR ?? SEED_DATA_DIR
const OUTPUT_DIR = process.env.SEED_OUTPUT_DIR ?? SEED_DATA_DIR

// ==========================================
// Sources. Each workbook is its own school with a single course. Every workbook has the same four
// kinds of sheet:
//   - a registration sheet: one row per admitted person, keyed by a "PRIMARY KEY" of the form
//     `<country code>-<phone>-<year of birth>`;
//   - "ALL-TRACKERS": one row per student currently in a batch, with the batch, the gurus (as
//     PRIMARY KEYs) and one column per chapter, each track closed by an "L4 Cert Status" column;
//   - "TRACK <n>": the certification exam mark sheet for track n (marks, total, grade);
//   - a grading-rules sheet, not read.
// The PRIMARY KEY is the same person across every sheet — that is the whole point of it — so it is
// this importer's only notion of identity within a school. `user`, though, is platform-wide (one
// login per phone number), so the same phone in both workbooks is one user with a profile in each
// school; that is the only thing the two runs share.
//
// Nothing here quietly drops or repairs a row. A row this importer cannot load exactly as written is
// a *blocking finding* in the report (with its Excel row number), and the importer refuses to run
// until the spreadsheet is fixed.
// ==========================================

type SourceConfig = {
  school: { slug: string; name: string }
  course: { slug: string; name: string }
  file: string
  registrationSheet: string
  /** Batch codes look like `<prefix>-<year>-…`. */
  batchPrefix: string
  /**
   * The five graded components of the mark sheet, in DB column order (aksharaShuddhi,
   * swaraShuddhi, niyantranaAnargalata, shraavyata, pratishakyaGrammar), as the start of each
   * header. The two workbooks name the same 50/30/20/5/5 marks differently; they line up by
   * maximum.
   */
  markHeaders: [string, string, string, string, string]
}

// A course slug is a URL segment and the schema's CHECK requires it lower-case.
const SOURCES: SourceConfig[] = [
  {
    school: { slug: 'slmts', name: 'SLMTS' },
    course: { slug: 'ved', name: 'Vedam' },
    file: 'slmts.xlsx',
    registrationSheet: 'Master_Registrations',
    batchPrefix: 'VED',
    markHeaders: ['akshara shuddhi', 'swara shuddhi', 'niyantrana', 'shraavyata', 'pratishakya grammar'],
  },
  {
    school: { slug: 'rr', name: 'RR' },
    course: { slug: 'pur', name: 'Puranokta' },
    file: 'rr.xlsx',
    registrationSheet: 'RRMasterRegistrations',
    batchPrefix: 'PUR',
    markHeaders: ['akshara shuddhi', 'anargalata', 'niyantrana', 'melodious rendering', 'grammar / shastra'],
  },
]

const TRACKER_SHEET = 'ALL-TRACKERS'
const GURU_COLUMNS = ['GURUVU GARU 1', 'GURUVU GARU 2', 'GURUVU GARU 3', 'GURUVU GARU 4']

// ==========================================
// Output row shapes — one field-for-field match per real DB table (packages/db/src/schema/school.ts
// + the `user` table), so the importer can insert these close to as-is. `member.json` is
// deliberately not emitted: every imported person gets the same 'member' org role, so the importer
// derives membership rows straight from users.json once it knows the real organizationId.
//
// Every id is derived from the row's own natural key (`stableId` below), so parsing the same
// spreadsheets twice yields byte-identical JSON, and importing the same JSON twice is a no-op
// rather than a second copy of everyone.
// ==========================================

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
type ProfileRow = {
  id: string
  userId: string
  name: string
  phone: string | null
  city: string | null
  /** The spreadsheet PRIMARY KEY this profile came from — audit only, not a DB column. */
  sourceKey: string
}
type EnrollmentRow = {
  profileId: string
  batchId: string
  role: 'instructor' | 'ta' | 'student'
  status: 'active' | 'break' | 'dropped' | 'inactive'
  joinedAt: string | null
  // No source column gives a departure date — always null today, kept explicit for symmetry with
  // the real enrollment.leftDate column so reviewers see it's an available-but-unfilled field.
  leftDate: null
}
type EvaluationRow = { id: string; studentId: string; chapterId: string; level: string; evaluatorId: string }

/**
 * One registration-sheet row: what one person filed for one course. Values are the sheet's own
 * strings (trimmed) — `import-school.ts` converts them into typed columns, the same conversion for
 * the registration row and for the profile it is copied onto.
 */
type RegistrationRow = {
  id: string
  courseSlug: string
  profileId: string
  sourceKey: string
  /** 'approved' iff the sheet says ADMITTED? = YES. */
  status: 'approved' | 'pending'
  registeredYear: number | null
  firstName: string
  lastName: string
  yearOfBirth: number
  /** E.164, or null when the sheet's country code + number isn't a valid one. */
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

/**
 * A completed certification sitting: one student, one track. `exam` + `examResult` in the DB.
 * `total` and `sheetGrade` are the sheet's own; the importer recomputes the outcome with the API's
 * grading rules and checks it against the label. The workbooks carry no exam date (their YEAR and
 * SEMESTER columns are certificate print details and are not read), so there is none here either.
 */
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

/** A place in a workbook: the sheet, and the Excel row number (1-based, as shown in Excel). */
type Where = { sheet: string; row?: number; key?: string }

type Report = {
  note: string
  school: string
  /**
   * Rows this importer cannot load exactly as written. Nothing is dropped or repaired around them:
   * the importer refuses to run until every one is fixed in the spreadsheet.
   */
  blocking: (Where & { message: string })[]
  /** Judgement calls the parser made and the things it noticed, none of which stops the import. */
  primaryKeyAliases: { sheet: string; row: number; key: string; usedAs: string }[]
  suspectPhones: (Where & { phone: string; name: string; city: string | null; reason: string })[]
  phoneCollisions: { phone: string; userId: string; profiles: { profileId: string; name: string }[] }[]
  /** user.email is unique platform-wide, so a repeat gets a synthetic address on the later user. */
  duplicateRealEmails: { email: string; keptForUserId: string; fellBackToSyntheticFor: string }[]
  resolvedEmailOverrides: { email: string; assignedToPhone: string; fellBackToSyntheticFor: string }[]
  /** Same PRIMARY KEY in both schools' registration sheets, with a different name or email. */
  sharedWithOtherSchool: { key: string; thisRow: number; otherRow: number; name: string[]; email: string[] }[]
  notAdmittedRegistrations: (Where & { admitted: string })[]
  guruDisagreements: { batchCode: string; column: string; values: string[] }[]
  /** A person listed as guru and student of one batch, or in two guru roles — one role kept. */
  enrollmentRoleOverrides: { profileKey: string; batchCode: string; kept: string; dropped: string }[]
  batchCodeAssumptions: { batchCode: string; sheet: string; reason: string }[]
  batchStatusDefaults: { batchCode: string; status: string; reason: string }[]
  duplicateChapterTitles: { track: number; title: string; columns: number[] }[]
  /** Grade cells this importer does not turn into an evaluation, by cell value. */
  ignoredGradeCells: Record<string, number>
  unrecognisedGradeCells: (Where & { column: string; value: string })[]
  /** Mark-sheet rows with a PRIMARY KEY but no marks: an exam not yet sat, not a result. */
  examRowsNotSat: (Where & { total: string; grade: string })[]
  /** People whose mark rows are identical on ≥4 tracks — looks like a fill-down, needs confirming. */
  identicalMarksAcrossTracks: { key: string; tracks: number; marks: string }[]
  registrationsWithoutEnrollment: number
}

// ==========================================
// Pure field helpers
// ==========================================

// Any fixed UUID would do; changing this changes every id, so it must never change.
const ID_NAMESPACE = 'b3c1f0a2-7d54-4e0b-9a6f-2f5f0f8b9c11'
function stableId(...parts: (string | number)[]): string {
  return uuidv5(parts.join('|'), ID_NAMESPACE)
}

const PRIMARY_KEY_PATTERN = /^\d{1,3}-\d{6,15}-\d{4}$/

// Matches the phoneNumberValidator on the OTP-auth `phoneNumber` plugin config
// (packages/auth/src/index.ts) exactly, so nothing this importer writes fails validation at sign-in.
const E164_PATTERN = /^\+[1-9]\d{7,14}$/

function toE164(digitsOnly: string): string | null {
  const candidate = `+${digitsOnly}`
  return E164_PATTERN.test(candidate) ? candidate : null
}

const digits = (value: unknown) => String(value ?? '').replace(/\D/g, '')
const clean = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()
const orNull = (value: unknown) => clean(value) || null

/** Why a syntactically valid number is still probably wrong, or null when it looks fine. */
function suspectPhoneReason(countryCode: string, national: string): string | null {
  if (countryCode === '91' && !/^[6-9]\d{9}$/.test(national)) {
    return `+91 numbers are 10 digits starting 6-9; this is "${national}"`
  }
  if (countryCode === '1' && !/^[2-9]\d{9}$/.test(national)) {
    return `+1 numbers are 10 digits; this is "${national}"`
  }
  return null
}

// The sheet's own scale, as the old importer read it: 1-4 are levels 1-4. Zero and negatives
// (-1 and -2 are by far the commonest values in the data) carry a meaning the schema has no direct
// home for, so they are skipped — and counted in the report, not dropped silently.
function mapScoreToLevel(score: number): 'level1' | 'level2' | 'level3' | 'level4' | 'practicing' | null {
  if (!Number.isInteger(score) || score <= 0) return null
  switch (score) {
    case 1:
      return 'level1'
    case 2:
      return 'level2'
    case 3:
      return 'level3'
    case 4:
      return 'level4'
    default:
      return 'practicing'
  }
}

function syntheticEmail(key: string): string {
  const cleaned = key
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '')
  return `${cleaned}@slmts.seed.local`
}

/** Header comparison key: the tracker sheets disagree on case and embed "\r\n" in titles. */
const normHeader = (header: unknown) => String(header ?? '').replace(/\s+/g, ' ').trim().toLowerCase()

// Known cases where the same real person is in the registration sheet under two different PRIMARY
// KEYs — confirmed by hand against the source rows (same name, city and year of birth; one
// registration superseding the other), not an algorithmic guess. Each entry aliases the older key to
// the one with real batch/assessment history, so both registrations collapse into one profile. Add
// to this list only after checking the raw rows.
const KNOWN_DUPLICATE_KEYS: Record<string, string> = {
  // Sridhar Tadepalli, Frisco, YOB 1973 — registered 2025-11-30 under this number, then again
  // 2026-01-01 under 1-9591989895-1973, which is the one with an actual batch and evaluations.
  '1-5107668743-1973': '1-9591989895-1973',
}
const resolveKey = (key: string) => KNOWN_DUPLICATE_KEYS[key] ?? key

// Known cases where one real email address is entered on several households' registration rows (a
// parent's personal email reused for a child's registration, or a shared family email), where naive
// first-come-first-served claim order gave the real address to the wrong household — confirmed by
// hand against the source spreadsheet, not an algorithmic guess. Maps email -> the phone (country
// code + number, digits only) whose household should keep it; every other household proposing the
// same email always gets a synthetic one instead, regardless of row order.
const PREFERRED_EMAIL_OWNERS: Record<string, string> = {
  // Surya Srinivas Jagarlapudi (adult, Austin) — "J" + "suryasrinivas" is his name almost verbatim.
  'jsuryasrinivas@gmail.com': '17373779389',
  // Venkata Dileep Bommakanti (adult, Hyderabad) — "B" + "V" + "dileep" matches his name exactly.
  'bvdileep@gmail.com': '919885883979',
  // Sashikanth Pochimcherla (adult, Hyderabad) — the email is his exact full name.
  'sashikanth.pochimcharla@gmail.com': '919949054060',
  // Kameswara Rao Mandalika (adult, Visakhapatnam) — "kamesh" is a common short form of "Kameswara".
  'ratnamkamesh4545@gmail.com': '919885774264',
}

// ==========================================
// Sheet reading
// ==========================================

type Sheet = {
  name: string
  /** 0-based index of the header row, so `rowNumber` can turn a data row index into an Excel row. */
  headerRow: number
  /** Normalised headers, by column index. */
  headers: string[]
  /** Headers as written (whitespace collapsed only) — chapter titles come from these. */
  titles: string[]
  rows: unknown[][]
}

function readSheet(workbook: any, name: string, headerRow = 0): Sheet {
  const worksheet = workbook.Sheets[name]
  if (!worksheet) {
    throw new Error(`Could not find "${name}" sheet. Available sheets: ${workbook.SheetNames.join(', ')}`)
  }
  const all: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: true })
  const headerCells = all[headerRow] ?? []
  return {
    name,
    headerRow,
    headers: headerCells.map(normHeader),
    titles: headerCells.map(clean),
    rows: all.slice(headerRow + 1),
  }
}

/** The Excel row number (1-based) of the i-th data row of a sheet. */
const rowNumber = (sheet: Sheet, i: number) => sheet.headerRow + i + 2

/** Column lookup by normalised header (first match), for a sheet whose headers are unique. */
function columns(sheet: Sheet) {
  const index = (name: string): number => {
    const found = sheet.headers.indexOf(normHeader(name))
    if (found < 0) throw new Error(`Sheet "${sheet.name}" has no "${name}" column`)
    return found
  }
  const optionalIndex = (name: string): number => sheet.headers.indexOf(normHeader(name))
  const indexStartingWith = (prefix: string): number => sheet.headers.findIndex(h => h.startsWith(normHeader(prefix)))
  return { index, optionalIndex, indexStartingWith }
}

// ==========================================
// Main
// ==========================================

/** What the two schools share: `user` is platform-wide, so a phone number is one user everywhere. */
type Shared = {
  usersByPhone: Map<string, UserRow>
  emailOwners: Map<string, string>
}

type SchoolResult = {
  source: SourceConfig
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
  report: Report
  registrationByKey: Map<string, RegistrationRow & { row: number }>
}

function parseSchool(source: SourceConfig, workbook: any, shared: Shared): SchoolResult {
  const slug = source.course.slug
  const school = source.school.slug
  const report: Report = {
    note:
      'Findings about the source spreadsheet. "blocking" ones stop the importer until fixed in the ' +
      'spreadsheet; the rest are judgement calls made, or things noticed, that do not.',
    school,
    blocking: [],
    primaryKeyAliases: [],
    suspectPhones: [],
    phoneCollisions: [],
    duplicateRealEmails: [],
    resolvedEmailOverrides: [],
    sharedWithOtherSchool: [],
    notAdmittedRegistrations: [],
    guruDisagreements: [],
    enrollmentRoleOverrides: [],
    batchCodeAssumptions: [],
    batchStatusDefaults: [],
    duplicateChapterTitles: [],
    ignoredGradeCells: {},
    unrecognisedGradeCells: [],
    examRowsNotSat: [],
    identicalMarksAcrossTracks: [],
    registrationsWithoutEnrollment: 0,
  }
  const block = (where: Where, message: string) => report.blocking.push({ ...where, message })

  const tracksMap = new Map<number, TrackRow>()
  const chaptersMap = new Map<string, ChapterRow>()
  const batchesMap = new Map<string, BatchRow>()
  const profilesByKey = new Map<string, ProfileRow>()
  const registrations: RegistrationRow[] = []
  const registrationByKey = new Map<string, RegistrationRow & { row: number }>()
  const enrollmentsByKey = new Map<string, EnrollmentRow>()
  const evaluations: EvaluationRow[] = []
  const exams: ExamRow[] = []
  const usersUsed = new Map<string, UserRow>()

  // user.email is unique+required. `user` is keyed by phone, not email, so two different
  // phone-derived households can legitimately share one real email (e.g. a parent's personal
  // email used to register siblings under two different WhatsApp numbers) — that would collide.
  // First claimant keeps the real email; anyone else falls back to a synthetic one, flagged in
  // the report for manual reconciliation. The claim is platform-wide: both schools draw on it.
  function claimEmail(candidate: string | null, householdKey: string, userId: string): string {
    const { emailOwners } = shared
    if (candidate) {
      const preferredOwnerPhone = PREFERRED_EMAIL_OWNERS[candidate]
      if (preferredOwnerPhone && preferredOwnerPhone !== householdKey) {
        // A specific, hand-verified household owns this email — never let a different household
        // claim it, regardless of which row is processed first. Deliberately not registered in
        // emailOwners, so the real slot stays free whenever the true owner's row is reached.
        const fallback = syntheticEmail(householdKey)
        emailOwners.set(fallback, userId)
        report.resolvedEmailOverrides.push({ email: candidate, assignedToPhone: preferredOwnerPhone, fellBackToSyntheticFor: userId })
        return fallback
      }

      const existingOwner = emailOwners.get(candidate)
      if (!existingOwner || existingOwner === userId) {
        emailOwners.set(candidate, userId)
        return candidate
      }
      const fallback = syntheticEmail(householdKey)
      emailOwners.set(fallback, userId)
      report.duplicateRealEmails.push({ email: candidate, keptForUserId: existingOwner, fellBackToSyntheticFor: userId })
      return fallback
    }
    const synthetic = syntheticEmail(householdKey)
    emailOwners.set(synthetic, userId)
    return synthetic
  }

  // ==========================================
  // PHASE 1: people and registrations. A person is a PRIMARY KEY; a household (one login) is a
  // phone number.
  // ==========================================
  console.log(`📦 [${school}] Processing registrations...`)
  {
    const sheet = readSheet(workbook, source.registrationSheet)
    const col = columns(sheet)
    const at = (row: unknown[], name: string) => {
      const found = col.optionalIndex(name)
      return found < 0 ? '' : row[found]
    }
    const seenKeys = new Map<string, number>()

    sheet.rows.forEach((row, i) => {
      const excelRow = rowNumber(sheet, i)
      const rawKey = clean(row[col.index('PRIMARY KEY')])
      if (!rawKey) return
      const where: Where = { sheet: sheet.name, row: excelRow, key: rawKey }

      if (seenKeys.has(rawKey)) {
        block(where, `PRIMARY KEY repeats row ${seenKeys.get(rawKey)} — one person, two rows`)
        return
      }
      seenKeys.set(rawKey, excelRow)

      const key = resolveKey(rawKey)
      if (key !== rawKey) report.primaryKeyAliases.push({ sheet: sheet.name, row: excelRow, key: rawKey, usedAs: key })

      const firstName = clean(at(row, 'FIRST NAME'))
      const lastName = clean(at(row, 'LAST NAME'))
      const countryCode = digits(at(row, 'WHATSAPP COUNTRY CODE'))
      const national = digits(at(row, 'WHATSAPP PHONE NUMBER'))
      const yearOfBirth = Number(at(row, 'YEAR OF BIRTH'))
      const email = orNull(at(row, 'EMAIL ADDRESS'))?.toLowerCase() ?? null

      const expectedKey = `${countryCode}-${national}-${yearOfBirth}`
      if (rawKey !== expectedKey) block(where, `PRIMARY KEY is not <country code>-<phone>-<year of birth> of this row's own columns (expected ${expectedKey})`)
      if (!firstName || !lastName) block(where, 'FIRST NAME or LAST NAME is empty')
      if (!Number.isInteger(yearOfBirth) || yearOfBirth < 1900) block(where, `YEAR OF BIRTH "${clean(at(row, 'YEAR OF BIRTH'))}" is not a year`)

      const householdKey = `${countryCode}${national}`
      const phoneNumber = countryCode && national ? toE164(householdKey) : null
      if (!phoneNumber) block(where, `WHATSAPP COUNTRY CODE + PHONE NUMBER ("${countryCode}" + "${national}") is not a valid E.164 number`)
      const name = `${firstName} ${lastName}`.trim() || clean(at(row, 'FULL NAME')) || 'Student'

      let profile = profilesByKey.get(key)
      if (!profile) {
        let user = shared.usersByPhone.get(householdKey)
        if (!user) {
          const id = stableId('user', householdKey)
          const reason = phoneNumber ? suspectPhoneReason(countryCode, national) : null
          if (reason) report.suspectPhones.push({ ...where, phone: phoneNumber!, name, city: orNull(at(row, 'CITY')), reason })
          user = {
            id,
            name,
            email: claimEmail(email, householdKey, id),
            isSuperAdmin: false,
            phoneNumber,
            phoneNumberVerified: phoneNumber ? false : null,
          }
          shared.usersByPhone.set(householdKey, user)
        }
        usersUsed.set(user.id, user)

        profile = {
          id: stableId('profile', school, key),
          userId: user.id,
          name,
          phone: householdKey || null,
          city: orNull(at(row, 'CITY')),
          sourceKey: key,
        }
        profilesByKey.set(key, profile)
      }

      const admitted = clean(at(row, 'ADMITTED?')).toUpperCase()
      const approved = admitted === 'YES'
      if (!approved) report.notAdmittedRegistrations.push({ ...where, admitted })
      const registeredYear = Number(at(row, 'REGISTERED YEAR'))

      const registrationRow: RegistrationRow = {
        id: stableId('registration', school, rawKey),
        courseSlug: slug,
        profileId: profile.id,
        sourceKey: key,
        status: approved ? 'approved' : 'pending',
        registeredYear: Number.isInteger(registeredYear) && registeredYear > 1900 ? registeredYear : null,
        firstName,
        lastName,
        yearOfBirth,
        phone: phoneNumber,
        email,
        city: orNull(at(row, 'CITY')),
        countryTimeZone: orNull(at(row, 'COUNTRY TIME ZONE')),
        spokenLanguages: orNull(at(row, 'LANGUAGES SPOKEN')),
        readLanguages: orNull(at(row, 'LANGUAGES READ')),
        parentNames: orNull(at(row, 'PARENT NAMES')),
        learningGoal: orNull(at(row, 'GOAL')),
        currentProficiency: orNull(at(row, 'PROFICIENCY')),
        // The two workbooks ask different consent questions: only the Vedam form has these four.
        dressCodeAgreed: orNull(at(row, 'TRADITIONAL DRESS')),
        noMeatAgreed: orNull(at(row, 'NO MEAT')),
        noAlcoholAgreed: orNull(at(row, 'NO ALCHOHOL')),
        noSmokingAgreed: orNull(at(row, 'NO SMOKING')),
        comments: orNull(at(row, 'COMMENTS')),
      }
      registrations.push(registrationRow)
      registrationByKey.set(key, { ...registrationRow, row: excelRow })
    })
  }

  // ==========================================
  // PHASE 2: curriculum. Chapter columns run from the one after "Time zone" to the end; a
  // "L4 Cert Status" column closes each track. Addressed by column index, never by title: titles
  // repeat and would collapse into one.
  // ==========================================
  const tracker = readSheet(workbook, TRACKER_SHEET)
  const col = columns(tracker)
  const firstChapterColumn = col.index('Time zone') + 1
  const certColumns = tracker.headers.flatMap((h, i) => (h.startsWith('l4 cert status') ? [i] : []))
  if (certColumns.length === 0) throw new Error(`${TRACKER_SHEET} has no "L4 Cert Status" columns`)
  if (certColumns[certColumns.length - 1] !== tracker.headers.length - 1) {
    throw new Error(`${TRACKER_SHEET}: columns after the last "L4 Cert Status" — expected it to close the sheet`)
  }

  const chapterColumns: { index: number; chapterId: string }[] = []
  let start = firstChapterColumn
  certColumns.forEach((certIndex, i) => {
    const order = i + 1
    const track: TrackRow = { id: stableId('track', slug, order), courseSlug: slug, name: `Track ${order}`, order }
    tracksMap.set(order, track)
    const columnsByTitle = new Map<string, number[]>()
    let chapterOrder = 1
    for (let c = start; c < certIndex; c++) {
      const title = tracker.titles[c]
      if (!title) continue
      const code = `${order}.${chapterOrder}`
      chaptersMap.set(code, {
        id: stableId('chapter', slug, code),
        trackId: track.id,
        code,
        title,
        status: 'published',
        order: chapterOrder++,
        script: null,
      })
      chapterColumns.push({ index: c, chapterId: chaptersMap.get(code)!.id })
      columnsByTitle.set(normHeader(title), [...(columnsByTitle.get(normHeader(title)) ?? []), c + 1])
    }
    for (const [, cols] of columnsByTitle) {
      if (cols.length > 1) report.duplicateChapterTitles.push({ track: order, title: tracker.titles[cols[0] - 1], columns: cols })
    }
    start = certIndex + 1
  })
  const lastTrackOrder = certColumns.length

  // ==========================================
  // PHASE 3: batches, enrollments, evaluations
  // ==========================================
  console.log(`👥 [${school}] Mapping batches, enrollments and evaluations...`)
  const batchPattern = new RegExp(`^${source.batchPrefix}-(\\d{4})-(?:[A-Z]{2}-)?([A-Z0-9]+)-(\\d+)(?:-(.+))?$`, 'i')
  const teachPattern = new RegExp(`^${source.batchPrefix}-(\\d{4})-TEACH-(\\d+)$`, 'i')
  const batchYears = new Map<string, number>()
  const batchTrackNumbers = new Map<string, number>()
  const forceCompleted = new Set<string>()
  const guruValuesByBatch = new Map<string, Map<string, Set<string>>>()
  const seatByStudent = new Map<string, { batchId: string; evaluatorId: string; batchCode: string }>()

  function addEnrollment(
    profileKey: string,
    batchCode: string,
    profileId: string,
    batchId: string,
    role: EnrollmentRow['role'],
    status: EnrollmentRow['status'],
    joinedAt: string | null,
  ) {
    // enrollment is one row per (profile, batch), so a person listed as guru *and* student of one
    // batch (a teachers' training batch, a batch whose TAs are its own students) holds one role.
    // Teaching outranks studying: the role decides what they may do in the batch, and their own
    // grades are stored against the profile, not the enrollment, so nothing is lost. Every
    // occurrence is in the report.
    const rank = { instructor: 3, ta: 2, student: 1 } as const
    const enrollmentKey = `${profileId}|${batchId}`
    const existing = enrollmentsByKey.get(enrollmentKey)
    if (!existing) {
      enrollmentsByKey.set(enrollmentKey, { profileId, batchId, role, status, joinedAt, leftDate: null })
      return
    }
    if (existing.role === role) return
    if (rank[role] > rank[existing.role]) {
      report.enrollmentRoleOverrides.push({ profileKey, batchCode, kept: role, dropped: existing.role })
      enrollmentsByKey.set(enrollmentKey, { profileId, batchId, role, status: role === 'student' ? status : 'active', joinedAt, leftDate: null })
    } else {
      report.enrollmentRoleOverrides.push({ profileKey, batchCode, kept: existing.role, dropped: role })
    }
  }

  function parseBatchCode(code: string, where: Where): { year: number; track: number } | null {
    const teach = code.match(teachPattern)
    if (teach) {
      // A teachers' batch has no track in its code. Its students are the school's own teachers,
      // who have completed the whole curriculum — the final track is the only one consistent with
      // their progress. A judgement, recorded in the report.
      report.batchCodeAssumptions.push({ batchCode: code, sheet: tracker.name, reason: `teachers' batch has no track in its code — mapped to the final track (${lastTrackOrder})` })
      return { year: Number(teach[1]), track: lastTrackOrder }
    }
    const match = code.match(batchPattern)
    if (!match) {
      block(where, `BATCH NUMBER "${code}" does not look like ${source.batchPrefix}-<year>-…-<track>-<index>`)
      return null
    }
    const rawTrack = match[2]
    let track = Number(rawTrack)
    if (!Number.isInteger(track)) {
      // "REM"/"ADV" (remedial/advanced): confirmed against the batch's own students' chapter
      // progress, which runs through the final track.
      if (['REM', 'ADV'].includes(rawTrack.toUpperCase())) {
        track = lastTrackOrder
        report.batchCodeAssumptions.push({ batchCode: code, sheet: tracker.name, reason: `non-numeric track token "${rawTrack}" — mapped to the final track (${track})` })
      } else {
        block(where, `BATCH NUMBER "${code}": track "${rawTrack}" is not a number`)
        return null
      }
    } else if (!tracksMap.has(track)) {
      block(where, `BATCH NUMBER "${code}": track ${track} does not exist (the sheet has ${lastTrackOrder})`)
      return null
    }
    if (match[4]) {
      if (/closed/i.test(match[4])) forceCompleted.add(code)
      else report.batchCodeAssumptions.push({ batchCode: code, sheet: tracker.name, reason: `unrecognized trailing suffix "${match[4]}" — ignored` })
    }
    return { year: Number(match[1]), track }
  }

  const seenTrackerKeys = new Map<string, number>()
  tracker.rows.forEach((row, i) => {
    const excelRow = rowNumber(tracker, i)
    const rawKey = clean(row[col.index('PRIMARY KEY')])
    const batchCode = clean(row[col.index('BATCH NUMBER (NARADA LMS)')])
    if (!rawKey && !batchCode) return
    const where: Where = { sheet: tracker.name, row: excelRow, key: rawKey }

    if (seenTrackerKeys.has(rawKey)) {
      block(where, `PRIMARY KEY repeats row ${seenTrackerKeys.get(rawKey)} — one student, two rows`)
      return
    }
    seenTrackerKeys.set(rawKey, excelRow)

    const key = resolveKey(rawKey)
    const profile = profilesByKey.get(key)
    if (!profile) {
      block(where, 'PRIMARY KEY is in no row of the registration sheet')
      return
    }
    if (!batchCode) {
      block(where, 'BATCH NUMBER (NARADA LMS) is empty')
      return
    }
    if (!batchCode.toUpperCase().startsWith(`${source.batchPrefix}-`)) {
      block(where, `BATCH NUMBER "${batchCode}" does not start with "${source.batchPrefix}-"`)
      return
    }

    let batch = batchesMap.get(batchCode)
    if (!batch) {
      const parsed = parseBatchCode(batchCode, where)
      if (!parsed) return
      batch = {
        id: stableId('batch', school, batchCode),
        trackId: tracksMap.get(parsed.track)!.id,
        code: batchCode,
        status: 'upcoming',
        startDate: null,
        meetingUrl: null,
      }
      batchesMap.set(batchCode, batch)
      batchYears.set(batchCode, parsed.year)
      batchTrackNumbers.set(batchCode, parsed.track)
    }
    const joinedAt = batchTrackNumbers.get(batchCode) === 1 ? `${batchYears.get(batchCode)}-01-01` : null

    // student
    const rawStatus = clean(row[col.index('STUDENT STATUS')])
    const lowered = rawStatus.toLowerCase()
    const status: EnrollmentRow['status'] | null = lowered.includes('break')
      ? 'break'
      : lowered.includes('drop')
        ? 'dropped'
        : lowered.includes('inact')
          ? 'inactive'
          : lowered.includes('activ')
            ? 'active'
            : null
    if (!status) {
      block(where, `STUDENT STATUS "${rawStatus}" is not Active, Break, Dropped or Inactive`)
      return
    }
    addEnrollment(key, batchCode, profile.id, batch.id, 'student', status, joinedAt)

    // gurus — PRIMARY KEYs, so the same person as in the registration sheet
    const gurus: { key: string; profileId: string }[] = []
    GURU_COLUMNS.forEach((column, g) => {
      const guruRawKey = clean(row[col.index(column)])
      if (!guruRawKey) return
      const perBatch = guruValuesByBatch.get(batchCode) ?? new Map<string, Set<string>>()
      const values = perBatch.get(column) ?? new Set<string>()
      values.add(guruRawKey)
      perBatch.set(column, values)
      guruValuesByBatch.set(batchCode, perBatch)

      const guruKey = resolveKey(guruRawKey)
      const guru = profilesByKey.get(guruKey)
      if (!guru) {
        const near = [...profilesByKey.keys()].filter(k => k.split('-')[1] === guruKey.split('-')[1])
        block({ ...where, key: guruRawKey }, `${column} of batch ${batchCode} is a PRIMARY KEY in no registration row${near.length ? ` (same phone number: ${near.join(', ')})` : ''}`)
        return
      }
      gurus.push({ key: guruKey, profileId: guru.id })
      addEnrollment(guruKey, batchCode, guru.id, batch!.id, g === 0 ? 'instructor' : 'ta', 'active', joinedAt)
    })
    // Whoever evaluates a student is their batch's first guru — the same convention the
    // spreadsheet's GURUVU GARU 1 column has always carried.
    const evaluatorId = gurus[0]?.profileId
    if (!evaluatorId) {
      block(where, 'no GURUVU GARU column names anyone, so the student\'s grades and exams have no evaluator')
      return
    }
    seatByStudent.set(key, { batchId: batch.id, evaluatorId, batchCode })

    // chapter grades
    for (const { index, chapterId } of chapterColumns) {
      const cell = row[index]
      if (cell === '' || cell == null) continue
      const score = typeof cell === 'number' ? cell : Number(String(cell).trim())
      if (!Number.isFinite(score)) {
        report.unrecognisedGradeCells.push({ ...where, column: tracker.titles[index], value: String(cell) })
        continue
      }
      const level = mapScoreToLevel(score)
      if (!level) {
        report.ignoredGradeCells[String(score)] = (report.ignoredGradeCells[String(score)] ?? 0) + 1
        continue
      }
      evaluations.push({ id: stableId('evaluation', slug, key, chapterId), studentId: profile.id, chapterId, level, evaluatorId })
    }
  })

  for (const [batchCode, byColumn] of guruValuesByBatch) {
    for (const [column, values] of byColumn) {
      if (values.size > 1) report.guruDisagreements.push({ batchCode, column, values: [...values] })
    }
  }

  // ---- batch status: no source column gives this directly, so it's derived (and always flagged
  // for review). Rule (per product decision): a batch is 'active' if any of its student
  // enrollments is itself 'active', OR its own code's year is the current calendar year —
  // 'completed' otherwise. A "-CLOSED" batch code always wins as 'completed'.
  const currentYear = new Date().getFullYear()
  const hasActiveStudent = new Set<string>()
  for (const enr of enrollmentsByKey.values()) {
    if (enr.role === 'student' && enr.status === 'active') hasActiveStudent.add(enr.batchId)
  }
  for (const [batchCode, batch] of batchesMap) {
    if (forceCompleted.has(batchCode)) {
      batch.status = 'completed'
      report.batchStatusDefaults.push({ batchCode, status: 'completed', reason: '"-CLOSED" batch code' })
      continue
    }
    const isCurrentYear = batchYears.get(batchCode) === currentYear
    const active = hasActiveStudent.has(batch.id)
    batch.status = active || isCurrentYear ? 'active' : 'completed'
    report.batchStatusDefaults.push({
      batchCode,
      status: batch.status,
      reason: `year ${batchYears.get(batchCode)}${isCurrentYear ? ' (current)' : ''}, ${active ? 'has' : 'no'} active student enrollment`,
    })
  }

  // ==========================================
  // PHASE 4: exams — the "TRACK <n>" mark sheets
  // ==========================================
  console.log(`📝 [${school}] Reading certification mark sheets...`)
  const marksByPerson = new Map<string, string[]>()
  const seenExamIds = new Map<string, string>()
  const trackSheets: string[] = workbook.SheetNames.filter((n: string) => /^TRACK \d+$/.test(n))
  for (const sheetName of trackSheets) {
    const trackOrder = Number(sheetName.split(' ')[1])
    const track = tracksMap.get(trackOrder)
    // Row 0 of these sheets is a banner; the real header is row 1.
    const marks = readSheet(workbook, sheetName, 1)
    const m = columns(marks)
    const markIndexes = source.markHeaders.map(prefix => {
      const found = m.indexStartingWith(prefix)
      if (found < 0) throw new Error(`sheet "${sheetName}" has no column starting "${prefix}"`)
      return found
    })
    const iKey = m.index('PRIMARY KEY')
    const iBonus = m.indexStartingWith('children bonus')
    const iTotal = m.index('Total')
    const iGrade = m.index('Exam Grade')
    // The sheet's last columns (YEAR, SEMESTER, Telugu names, …) are "certificate details for
    // printing" — deliberately not read, which is why an exam here has no date.
    if (iBonus < 0) throw new Error(`sheet "${sheetName}" is missing its children bonus column`)

    marks.rows.forEach((row, i) => {
      const rawKey = clean(row[iKey])
      // Empty template rows carry "--" (or nothing) in the PRIMARY KEY column.
      if (!PRIMARY_KEY_PATTERN.test(rawKey)) return
      const key = resolveKey(rawKey)
      const where: Where = { sheet: sheetName, row: rowNumber(marks, i), key: rawKey }

      if (!track) {
        block(where, `no track ${trackOrder} in the ${TRACKER_SHEET} columns (it has ${lastTrackOrder})`)
        return
      }
      const rawMarks = markIndexes.map(x => row[x])
      // A row with no marks is an exam not yet sat: the sheet's formulas still print total 0 and
      // "Below 65 — Reappear" on it. That is not a fail, so it is not a result — but it is listed.
      if (!rawMarks.every(v => typeof v === 'number')) {
        report.examRowsNotSat.push({ ...where, total: clean(row[iTotal]), grade: clean(row[iGrade]) })
        return
      }
      const [aksharaShuddhi, swaraShuddhi, niyantranaAnargalata, shraavyata, pratishakyaGrammar] = rawMarks as number[]

      const profile = profilesByKey.get(key)
      if (!profile) {
        block(where, 'PRIMARY KEY is in no row of the registration sheet')
        return
      }
      const seat = seatByStudent.get(key)
      if (!seat) {
        block(where, `has marks, but ${TRACKER_SHEET} has no usable row for this person, so there is no batch to attach the exam to`)
        return
      }

      const childrenBonus = Number(row[iBonus])
      const total = Number(row[iTotal])
      const limits = [50, 30, 20, 5, 5]
      const overMax = [aksharaShuddhi, swaraShuddhi, niyantranaAnargalata, shraavyata, pratishakyaGrammar]
        .map((value, x) => (value < 0 || value > limits[x] || !Number.isInteger(value) ? `${marks.titles[markIndexes[x]]} = ${value} (max ${limits[x]})` : null))
        .filter(Boolean)
      if (overMax.length > 0) {
        block(where, `mark out of range: ${overMax.join(', ')}`)
        return
      }
      if (![0, 5, 10].includes(childrenBonus)) {
        block(where, `Children Bonus ${clean(row[iBonus])} is not 0, 5 or 10`)
        return
      }
      if (total !== aksharaShuddhi + swaraShuddhi + niyantranaAnargalata + shraavyata + pratishakyaGrammar + childrenBonus) {
        block(where, `Total ${clean(row[iTotal])} is not the sum of the marks and bonus`)
        return
      }
      const id = stableId('exam', slug, key, trackOrder)
      if (seenExamIds.has(id)) {
        block(where, `same person and track as ${seenExamIds.get(id)} — one result per person per track`)
        return
      }
      seenExamIds.set(id, `${sheetName} row ${where.row}`)
      exams.push({
        id,
        trackId: track.id,
        studentId: profile.id,
        batchId: seat.batchId,
        marks: { aksharaShuddhi, swaraShuddhi, niyantranaAnargalata, shraavyata, pratishakyaGrammar },
        childrenBonus,
        total,
        sheetGrade: clean(row[iGrade]),
        evaluatorId: seat.evaluatorId,
      })
      const signature = [aksharaShuddhi, swaraShuddhi, niyantranaAnargalata, shraavyata, pratishakyaGrammar, childrenBonus].join('/')
      marksByPerson.set(key, [...(marksByPerson.get(key) ?? []), signature])
    })
  }
  for (const [personKey, signatures] of marksByPerson) {
    if (signatures.length >= 4 && new Set(signatures).size === 1) {
      report.identicalMarksAcrossTracks.push({ key: personKey, tracks: signatures.length, marks: signatures[0] })
    }
  }

  // ---- household collisions: any phone shared by more than one profile — the primary reason `user`
  // and `profile` are split (one household user, one profile per person)
  const profilesByHousehold = new Map<string, { profileId: string; name: string }[]>()
  for (const profile of profilesByKey.values()) {
    if (!profile.phone) continue
    profilesByHousehold.set(profile.phone, [...(profilesByHousehold.get(profile.phone) ?? []), { profileId: profile.id, name: profile.name }])
  }
  for (const [phone, profiles] of profilesByHousehold) {
    if (profiles.length > 1) report.phoneCollisions.push({ phone, userId: shared.usersByPhone.get(phone)!.id, profiles })
  }
  const enrolledProfiles = new Set([...enrollmentsByKey.values()].map(e => e.profileId))
  report.registrationsWithoutEnrollment = new Set(registrations.filter(r => !enrolledProfiles.has(r.profileId)).map(r => r.profileId)).size

  return {
    source,
    courses: [source.course],
    tracks: [...tracksMap.values()],
    chapters: [...chaptersMap.values()],
    batches: [...batchesMap.values()],
    users: [...usersUsed.values()],
    profiles: [...profilesByKey.values()],
    registrations,
    enrollments: [...enrollmentsByKey.values()],
    evaluations,
    exams,
    report,
    registrationByKey,
  }
}

async function run() {
  const shared: Shared = { usersByPhone: new Map(), emailOwners: new Map() }
  const results: SchoolResult[] = []
  for (const source of SOURCES) {
    const file = path.join(DATA_DIR, source.file)
    if (!fs.existsSync(file)) throw new Error(`File not found at: ${file}`)
    console.log(`🚀 Loading ${source.file} → school "${source.school.slug}", course "${source.course.slug}"`)
    results.push(parseSchool(source, XLSX.readFile(file), shared))
  }

  // The same PRIMARY KEY in both schools is one person with a profile in each; note where the two
  // registration rows disagree, since the (shared) `user` takes the first school's name and email.
  const [first, ...others] = results
  for (const other of others) {
    for (const [key, theirs] of other.registrationByKey) {
      const ours = first.registrationByKey.get(key)
      if (!ours) continue
      const nameDiffers = normHeader(`${ours.firstName} ${ours.lastName}`) !== normHeader(`${theirs.firstName} ${theirs.lastName}`)
      const emailDiffers = (ours.email ?? '') !== (theirs.email ?? '')
      if (!nameDiffers && !emailDiffers) continue
      const entry = {
        key,
        name: nameDiffers ? [`${ours.firstName} ${ours.lastName}`, `${theirs.firstName} ${theirs.lastName}`] : [],
        email: emailDiffers ? [ours.email ?? '', theirs.email ?? ''] : [],
      }
      first.report.sharedWithOtherSchool.push({ ...entry, thisRow: ours.row, otherRow: theirs.row })
      other.report.sharedWithOtherSchool.push({ ...entry, thisRow: theirs.row, otherRow: ours.row })
    }
  }

  console.log('💾 Saving JSON seed files...')
  let blocked = 0
  for (const r of results) {
    const dir = path.join(OUTPUT_DIR, r.source.school.slug)
    fs.mkdirSync(dir, { recursive: true })
    const write = (name: string, data: unknown) => fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2))
    write('courses.json', r.courses)
    write('tracks.json', r.tracks)
    write('chapters.json', r.chapters)
    write('batches.json', r.batches)
    write('users.json', r.users)
    write('profiles.json', r.profiles)
    write('registrations.json', r.registrations)
    write('enrollments.json', r.enrollments)
    write('evaluations.json', r.evaluations)
    write('exams.json', r.exams)
    write('_report.json', r.report)
    blocked += r.report.blocking.length

    const rep = r.report
    const n = (list: unknown[]) => list.length
    console.log(`
✅ ${r.source.school.slug} (${r.source.course.slug}) → seed-data/${r.source.school.slug}/
   users: ${r.users.length}  profiles: ${r.profiles.length}  registrations: ${r.registrations.length}  tracks: ${r.tracks.length}  chapters: ${r.chapters.length}
   batches: ${r.batches.length}  enrollments: ${r.enrollments.length}  evaluations: ${r.evaluations.length}  exams (with results): ${r.exams.length}
   ── not blocking, but review in _report.json:
   people with no enrollment (reachable only through their registration): ${rep.registrationsWithoutEnrollment}
   guru/student role conflicts (guru role kept): ${n(rep.enrollmentRoleOverrides)}   guru columns that disagree within a batch: ${n(rep.guruDisagreements)}
   suspect phone numbers: ${n(rep.suspectPhones)}   mark rows with no marks (not sat): ${n(rep.examRowsNotSat)}
   grade cells not imported: ${Object.entries(rep.ignoredGradeCells).map(([v, c]) => `${v}×${c}`).join(' ') || 'none'}   unrecognised grade cells: ${n(rep.unrecognisedGradeCells)}`)
    if (rep.blocking.length > 0) {
      console.log(`\n❌ ${rep.blocking.length} BLOCKING finding(s) in ${r.source.school.slug} — the importer will refuse to run until these are fixed in the spreadsheet:`)
      for (const b of rep.blocking.slice(0, 25)) console.log(`   ${b.sheet}${b.row ? ` row ${b.row}` : ''}${b.key ? ` [${b.key}]` : ''}: ${b.message}`)
      if (rep.blocking.length > 25) console.log(`   …and ${rep.blocking.length - 25} more (see seed-data/${r.source.school.slug}/_report.json)`)
    }
  }
  if (blocked > 0) process.exitCode = 1
}

run().catch(err => {
  console.error('❌ Error parsing Excel data:', err)
  process.exit(1)
})
