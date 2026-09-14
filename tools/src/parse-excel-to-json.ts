import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import XLSXModule from 'xlsx'
// Deliberately not `uuidv7` from `@narada/db`: importing anything from that package eagerly opens
// a live Postgres pool and validates the full app env (DB creds, auth secret, OAuth, R2) via
// `@narada/env`. This script only transforms a spreadsheet into review-ready JSON — it must run
// standalone, with no DB or environment configured. `uuidv7` there is a thin wrapper over exactly
// this `uuid` import; calling it directly here generates the identical id format without the
// side effect.
import { v7 as uuidv7 } from 'uuid'

// Handle CommonJS / ESM default export compatibility for SheetJS
const XLSX = (XLSXModule as any).default || XLSXModule

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const EXCEL_FILE = path.join(
  __dirname,
  '../../data/SLMTS - ALL REGISTRATIONS - ALL TRACKERS - UPDATED 09-12-2026.xlsx',
)
const OUTPUT_DIR = path.join(__dirname, '../../seed-data')

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

// ==========================================
// Output row shapes — one field-for-field match per real DB table (packages/db/src/schema/school.ts
// + the `user`/`member` tables), so the importer can insert these close to as-is. `member.json` is
// deliberately not emitted: every imported person gets the same 'member' org role, so the importer
// derives membership rows straight from users.json once it knows the real organizationId.
//
// Registration-sheet metadata that has no column anywhere in the schema (qualified status,
// upanayanam, parent info, consent flags, free-text comments, etc.) is intentionally dropped here,
// not stuffed into a metadata blob — the schema has no metadata column, and only enrollment
// status/leftDate were added as a migration for this pass. See _report.json's `droppedMetadata`
// note.
// ==========================================

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
  // No source column gives a departure date — always null today, kept explicit for symmetry with
  // the real enrollment.leftDate column so reviewers see it's an available-but-unfilled field.
  leftDate: null
}
type EvaluationRow = { id: string; studentId: string; chapterId: string; level: string; evaluatorId: string }
// A track's certification result — previously a fake `chapter` row (title matching
// "TRACK N CERTIFICATION...") with an ordinary evaluation against it, which made a track's
// certification indistinguishable from its real syllabus. Given its own row/table instead
// (packages/db/src/schema/school.ts::trackCertification), keyed on the track, not a chapter.
type TrackCertificationRow = { id: string; trackId: string; studentId: string; level: string; evaluatorId: string }

// Registration-sheet columns, identity-matched to a profileId (one entry per profile, captured
// from whichever registration row first established that profile's identity). Most of these have
// a real column on `profile` now (packages/db/src/schema/school.ts, mirroring `registration`'s own
// columns) and `import-school.ts`'s `data` command backfills them onto the imported profile —
// see that file's `applyRegistrationMetadata` for the raw-string -> typed-column conversion. The
// rest (registeredYear through vedaShaka/jobOccupation/parentStudying/priorityLevel below) still
// have no home in the schema and stay import-only, kept here for whenever that changes.
type RegistrationMetadataRow = {
  profileId: string
  registeredYear: string | null
  registrationTimestamp: string | null
  qualifiedStatus: string | null
  emailSent: string | null
  whatsappSent: string | null
  joinedCommGroup: string | null
  category: string | null
  upanayanamYear: string | null
  // `profile.email`/`profile.yearOfBirth` — read here from the same spreadsheet columns already
  // used elsewhere in this file (EMAIL ADDRESS feeds `user.email` via `claimEmail`; YEAR OF BIRTH
  // feeds `identityKey`'s dedup matching) rather than reusing those computed values directly,
  // since this function only ever sees the raw `row`.
  email: string | null
  yearOfBirth: number | null
  countryTimeZone: string | null
  // Raw "PRIMARY KEY" column from the source spreadsheet's own prior dedup pass — some rows show
  // "#NAME?" (an Excel formula error already present in the source), kept as-is rather than
  // cleaned up since this is a passthrough of their data, not ours.
  sourcePrimaryKey: string | null
  referenceName: string | null
  // Source column is labeled "REFERENCE PHONE" but actually contains names, not phone numbers —
  // a pre-existing mislabel in the spreadsheet itself, passed through unchanged.
  referencePhone: string | null
  gruhasta: string | null
  brahmachari: string | null
  vedaShaka: string | null
  spokenLanguages: string | null
  readLanguages: string | null
  parentNames: string | null
  jobOccupation: string | null
  parentStudying: string | null
  learningGoal: string | null
  currentProficiency: string | null
  priorityLevel: string | null
  dressCodeAgreed: string | null
  noMeatAgreed: string | null
  noAlcoholAgreed: string | null
  noSmokingAgreed: string | null
  comments: string | null
}

type Report = {
  droppedMetadata: string
  phoneCollisions: { phone: string; userId: string; profiles: { profileId: string; name: string }[] }[]
  missingPhoneProfiles: { profileId: string; name: string; identityKey: string }[]
  invalidE164Phones: { userId: string; rawDigits: string; name: string }[]
  ambiguousStudentStatus: { rawValue: string; mappedTo: string; profileId: string; batchCode: string }[]
  // Batch codes ("BATCH NUMBER (NARADA LMS)", e.g. "VED-2026-GR-2-1") that didn't cleanly parse as
  // <year>-<GR|BR>-<numeric track>-<index> — either a non-numeric track token ("REM", "ADV", falls
  // back to track 1) or a trailing suffix like "-CLOSED" (forces the batch to `completed`
  // regardless of the active-student/current-year rule). Flagged for manual review, not guessed
  // silently — see parseBatchCode.
  batchCodeAnomalies: { batchCode: string; sheet: string; reason: string }[]
  enrollmentRoleSkips: {
    profileId: string
    batchId: string
    existingRole: string
    skippedRole: string
  }[]
  duplicateRealEmails: { email: string; keptForUserId: string; fellBackToSyntheticFor: string }[]
  resolvedEmailOverrides: { email: string; assignedToPhone: string; fellBackToSyntheticFor: string }[]
  batchStatusDefaults: { batchCode: string; status: string; reason: string }[]
  droppedRowsMissingIdentity: { sheet: string; reason: string }[]
  // A "GURUVU GARU" column name that exact-matched an already-registered profile's own name —
  // that registrant's real (phone-bearing) identity was reused for the teacher role instead of
  // minting a second, disconnected, phone-less one. See getOrCreateTeacher's own doc comment.
  teacherIdentityMerges: { teacherName: string; profileId: string }[]
}

// ==========================================
// Pure field helpers
// ==========================================

function mapScoreToLevel(scoreVal: unknown): 'level1' | 'level2' | 'level3' | 'level4' | 'practicing' | null {
  const val = parseInt(String(scoreVal ?? '').trim(), 10)
  if (isNaN(val) || val <= 0) return null
  switch (val) {
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

// A bare 10-digit local number never already contains a country code, no matter what its own
// leading digits happen to look like — treating `startsWith(cleanCode)` as proof of "already
// prefixed" for a 10-digit number was the bug: a local number like 9182062337 starts with "91" by
// coincidence, not because a country code is embedded, so it was returned un-prefixed (and 2
// digits short of a valid number). Only numbers long enough to plausibly already carry a country
// code (i.e. more than a bare local number) get the "already prefixed" treatment.
function sanitizePhone(code: unknown, phone: unknown): string {
  const cleanCode = String(code || '').replace(/\D/g, '')
  const cleanPhone = String(phone || '').replace(/\D/g, '')

  if (!cleanPhone) return ''

  if (cleanPhone.length === 10) {
    const inferredCode = cleanCode || (/^[6-9]/.test(cleanPhone) ? '91' : '1')
    return `${inferredCode}${cleanPhone}`
  }

  if (cleanCode && cleanPhone.startsWith(cleanCode) && cleanPhone.length > cleanCode.length + 6) {
    return cleanPhone
  }

  if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) return cleanPhone
  if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) return cleanPhone

  return `${cleanCode}${cleanPhone}`
}

// Known cases where the same real person registered twice under two different phone numbers —
// confirmed by hand against the source spreadsheet (matching YOB/city, one registration
// superseding the other), not an algorithmic guess. Each entry aliases the older/superseded
// number to the one with real batch/assessment history, so both registrations collapse into one
// user+profile instead of two disconnected accounts. Add to this list only after checking the
// raw rows — a shared name alone (e.g. "Abhiram Remella", different YOB and different countries
// in that case) is not enough evidence on its own.
const KNOWN_DUPLICATE_PHONES: Record<string, string> = {
  // Sridhar Tadepalli, Frisco, YOB 1973 — registered 2025-11-30 under this number, then again
  // 2026-01-01 under 919591989895 (aliased below), which is the one with an actual batch
  // assignment (VED-01-2025-GR-12) and evaluations attached.
  '15107668743': '19591989895',
}

function resolvePhone(phone: string): string {
  return KNOWN_DUPLICATE_PHONES[phone] ?? phone
}

// Known cases where one real email address is entered on multiple households' registration rows
// (a parent's personal email reused for a child's registration, or a shared family email), where
// naive first-come-first-served claim order gave the real address to the wrong household —
// confirmed by hand against the source spreadsheet (name-vs-email match, ages, city/parent-name
// fields), not an algorithmic guess. Maps email -> the phone whose household should keep it;
// every other household proposing the same email always gets a synthetic one instead, regardless
// of row order.
const PREFERRED_EMAIL_OWNERS: Record<string, string> = {
  // Surya Srinivas Jagarlapudi (adult, Austin) — "J" + "suryasrinivas" is his name almost
  // verbatim. The other claimant is a child in Hyderabad with a different parent on file
  // (likely a different branch of the same extended family reusing the email).
  'jsuryasrinivas@gmail.com': '17373779389',
  // Venkata Dileep Bommakanti (adult, Hyderabad) — "B" + "V" + "dileep" matches his name
  // exactly. He and his son Pavan already share this phone (merged as one household); a third
  // child, Adithya, is registered under a different number (likely the mother's) but lists the
  // same parents and had ended up with the real email instead of Dileep himself.
  'bvdileep@gmail.com': '919885883979',
  // Sashikanth Pochimcharla (adult, Hyderabad) — the email is his exact full name. The other
  // claimant, "Vedant Pochimcharla" (same surname, ~30 years younger), is plausibly his son.
  'sashikanth.pochimcharla@gmail.com': '919949054060',
  // Kameswara Rao Mandalika (adult, Visakhapatnam) — "kamesh" is a common short form of
  // "Kameswara." Weaker signal than the others (no exact match, and the two claimants don't
  // obviously look like parent/child), but "kamesh" has real overlap with his name and the
  // other claimant ("Sriram Mandalika") has none at all.
  'ratnamkamesh4545@gmail.com': '919885774264',
}

// Matches the phoneNumberValidator on the OTP-auth `phoneNumber` plugin config
// (packages/auth/src/index.ts) exactly, so nothing this importer writes fails validation at sign-in.
const E164_PATTERN = /^\+[1-9]\d{7,14}$/

function toE164(digitsOnly: string): string | null {
  const candidate = `+${digitsOnly}`
  return E164_PATTERN.test(candidate) ? candidate : null
}

// "BATCH NUMBER (NARADA LMS)" is the new format's only source of a batch's track and year (the old
// flat sheet's "Track Number"/"Joining Year"/"LAST Batch Year" columns don't exist anymore) — e.g.
// "VED-2026-GR-2-1" is track 2, year 2026. "GR"/"BR" is the age-group split (Gruhasta/Brahmachari),
// not part of the numbering. A handful of codes don't fit cleanly:
//   - "VED-2026-GR-REM-1" / "VED-2024-GR-ADV-1": "REM"/"ADV" ("remedial"/"advanced") aren't track
//     numbers — confirmed against the two batches' own student rows (chapter scores populated all
//     the way through track 7 and into track 8's own chapters/certifications), these are track 8.
//     Any other non-numeric token still falls back to track 1, flagged rather than guessed at.
//   - "VED-2026-GR-3-2-CLOSED": a trailing suffix — parses normally but forces `completed` status
//     regardless of the active-student/current-year rule (see batch-status derivation below).
const BATCH_CODE_PATTERN = /^VED-(\d{4})-(?:GR|BR)-([A-Za-z0-9]+)-\d+(?:-(.+))?$/i
const NON_NUMERIC_TRACK_TOKENS: Record<string, number> = { REM: 8, ADV: 8 }

function parseBatchCode(
  batchCode: string,
  sheetName: string,
  report: Report,
): { year: number; track: number; forceCompleted: boolean } {
  const match = batchCode.match(BATCH_CODE_PATTERN)
  if (!match) {
    report.batchCodeAnomalies.push({ batchCode, sheet: sheetName, reason: 'does not match VED-<year>-GR|BR-<track>-<index> — defaulting to track 1, current year' })
    return { year: new Date().getFullYear(), track: 1, forceCompleted: false }
  }

  const year = parseInt(match[1], 10)
  const rawTrack = match[2]
  const parsedTrack = parseInt(rawTrack, 10)
  let track = 1
  if (!isNaN(parsedTrack) && parsedTrack > 0) {
    track = parsedTrack
  } else if (NON_NUMERIC_TRACK_TOKENS[rawTrack.toUpperCase()]) {
    track = NON_NUMERIC_TRACK_TOKENS[rawTrack.toUpperCase()]
    report.batchCodeAnomalies.push({
      batchCode,
      sheet: sheetName,
      reason: `non-numeric track token "${rawTrack}" — mapped to track ${track} (confirmed via student progress data)`,
    })
  } else {
    report.batchCodeAnomalies.push({
      batchCode,
      sheet: sheetName,
      reason: `non-numeric track token "${rawTrack}" — defaulting to track 1`,
    })
  }

  const suffix = match[3]
  const forceCompleted = !!suffix && /closed/i.test(suffix)
  if (suffix && !forceCompleted) {
    report.batchCodeAnomalies.push({ batchCode, sheet: sheetName, reason: `unrecognized trailing suffix "${suffix}" — ignored` })
  }

  return { year, track, forceCompleted }
}

function sanitizeStudentStatus(rawStatus: unknown): {
  status: 'active' | 'break' | 'dropped' | 'inactive'
  matched: boolean
} {
  const raw = String(rawStatus ?? '').trim()
  const val = raw.toLowerCase()
  if (val.includes('break')) return { status: 'break', matched: true }
  if (val.includes('drop')) return { status: 'dropped', matched: true }
  if (val.includes('inact')) return { status: 'inactive', matched: true }
  const looksActive = val === '' || val.includes('activ')
  return { status: 'active', matched: looksActive }
}

function formatExcelTimestamp(excelDate: unknown): string | null {
  if (!excelDate || isNaN(Number(excelDate))) {
    return excelDate ? String(excelDate) : null
  }

  const serial = Number(excelDate)
  const utcDays = Math.floor(serial - 25569)
  const utcValue = utcDays * 86400

  const dateInfo = new Date(utcValue * 1000)
  const fractionalDay = serial - Math.floor(serial) + 0.0000001

  let totalSeconds = Math.floor(86400 * fractionalDay)
  const seconds = totalSeconds % 60
  totalSeconds = Math.floor(totalSeconds / 60)
  const minutes = totalSeconds % 60
  const hours = Math.floor(totalSeconds / 60)

  dateInfo.setUTCHours(hours, minutes, seconds)
  return dateInfo.toISOString()
}

function syntheticEmail(key: string): string {
  const clean = key
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '')
  return `${clean}@slmts.seed.local`
}

function identityKey(phone: string, yob: unknown, firstName: unknown, lastName: unknown): string {
  const cleanYob = String(yob ?? '').trim()
  const cleanFirst = String(firstName ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  const cleanLast = String(lastName ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  return `${phone}_${cleanYob}_${cleanFirst}_${cleanLast}`
}

/** Case/whitespace-insensitive full-name key — used to recognize the same real person across the
 * registration sheet's (first name, last name) fields and the assessment sheet's bare "GURUVU
 * GARU" name column, which has no phone/YOB to run through identityKey above. */
function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

// The new tracker sheets (BR-TRACK N / GR-TRACK N / ALL-INACTIVE) don't share one consistent
// header spelling for the same real column — e.g. "FULL NAME" vs "Full Name", or a chapter title
// with an embedded "\r\n" in one sheet and a plain space in another ("Nakshatreshti\r\n 1" vs
// "Nakshatreshti\r\n1"). Collapsing whitespace and case before comparing makes every sheet's row
// object look up the same regardless of which sheet it came from.
function normHeader(header: string): string {
  return header.replace(/\s+/g, ' ').trim().toLowerCase()
}

/** Builds a case/whitespace-insensitive field getter for one row, keyed off `normHeader`. */
function fieldGetter(row: Record<string, any>): (canonicalHeader: string) => any {
  const byNormalized = new Map(Object.entries(row).map(([k, v]) => [normHeader(k), v]))
  return (canonicalHeader: string) => byNormalized.get(normHeader(canonicalHeader))
}

async function run() {
  console.log(`🚀 Loading Excel file: ${EXCEL_FILE}`)

  if (!fs.existsSync(EXCEL_FILE)) {
    throw new Error(`File not found at: ${EXCEL_FILE}`)
  }

  const workbook = XLSX.readFile(EXCEL_FILE)

  const regSheet = workbook.Sheets['Master_Registrations']
  if (!regSheet) {
    throw new Error(
      `Could not find "Master_Registrations" sheet in Excel file. Available sheets: ${workbook.SheetNames.join(', ')}`,
    )
  }

  // The new export splits what used to be one flat "Assessments-Master" sheet into one sheet per
  // (age-group, track) pair — "BR"/"GR" being the Brahmachari (<18)/Gruhasta (>=18) age split, not
  // an extra track — plus "ALL-INACTIVE" for students no longer active in any batch. Each sheet
  // carries the full cumulative curriculum up to its own reach (a track-8 sheet has all 8 tracks'
  // columns; a track-1 sheet only has tracks 1-2), so processing every sheet and de-duping chapters
  // by (normalized) column name reconstructs the same curriculum the old flat sheet had. "PROCESS"
  // (a rating-scale legend) and "T1C".."T8C" (a redundant per-track certification roster) carry no
  // data this importer needs and are intentionally not read.
  const TRACKER_SHEETS: { name: string; forcedStatus?: EnrollmentRow['status'] }[] = [
    { name: 'BR-TRACK 1' },
    { name: 'GR-TRACK 1' },
    { name: 'GR-TRACK 2' },
    { name: 'BR-TRACK 3' },
    { name: 'GR-TRACK 3' },
    { name: 'GR-TRACK 4' },
    { name: 'GR-TRACK 5' },
    { name: 'GR-TRACK 6' },
    { name: 'BR-TRACK 7' },
    { name: 'GR-TRACK 7' },
    { name: 'GR-TRACK 8' },
    // Every row here gets enrollment.status = 'inactive' outright, regardless of its own
    // "STUDENT STATUS" column value — this sheet's whole reason for existing is "no longer active
    // in any batch", confirmed against the source data rather than assumed.
    { name: 'ALL-INACTIVE', forcedStatus: 'inactive' },
  ]
  for (const sheet of TRACKER_SHEETS) {
    if (!workbook.Sheets[sheet.name]) {
      throw new Error(
        `Could not find "${sheet.name}" sheet in Excel file. Available sheets: ${workbook.SheetNames.join(', ')}`,
      )
    }
  }
  // "ALL-INACTIVE" carries the deepest cumulative column set (all 8 tracks) of any single sheet —
  // used below as the canonical source for chapter/track/certification-column ordering, the same
  // role the old flat "Assessments-Master" sheet used to play alone.
  const CANONICAL_CURRICULUM_SHEET = 'ALL-INACTIVE'

  const regRows: Record<string, any>[] = XLSX.utils.sheet_to_json(regSheet, { defval: '' })

  const report: Report = {
    droppedMetadata:
      'Registration-sheet metadata is identity-matched to a profileId in registration-metadata.json. ' +
      "Most of it (contact/background/agreements) has a real column on `profile` now and " +
      "import-school.ts's `data` command backfills it there. The rest (qualified status, upanayanam, " +
      'reference contacts, consent flags, etc.) still has no home in the schema and is dropped by the ' +
      "importer, kept here only for whenever that changes. Also dropped: each tracker sheet's " +
      '"L3 Aavarthi Status" columns (a revision-round marker with no home on `evaluation` either) — ' +
      'only the paired "L4 Cert Status (Auto Update)" column feeds track-certifications.json.',
    phoneCollisions: [],
    missingPhoneProfiles: [],
    invalidE164Phones: [],
    ambiguousStudentStatus: [],
    batchCodeAnomalies: [],
    enrollmentRoleSkips: [],
    duplicateRealEmails: [],
    resolvedEmailOverrides: [],
    batchStatusDefaults: [],
    droppedRowsMissingIdentity: [],
    teacherIdentityMerges: [],
  }

  // ==========================================
  // Tracks: 1-8 structural tracks. No "Graduated" pseudo-track anymore — the new export has no
  // "GRAD" batch codes at all (confirmed against the full 91-batch-code set), so that concept
  // doesn't apply to this data.
  // ==========================================
  const tracksMap = new Map<number, TrackRow>()
  for (let i = 1; i <= 8; i++) {
    tracksMap.set(i, { id: uuidv7(), name: `Track ${i}`, order: i })
  }

  const usersByPhone = new Map<string, UserRow>()
  // Every created user, by id — lets getOrCreateTeacher below resolve a matched registrant's
  // profile.userId back to its UserRow without needing usersByPhone's own (phone-or-synthetic-key)
  // indexing scheme.
  const usersById = new Map<string, UserRow>()
  const profilesByIdentity = new Map<string, ProfileRow>()
  const profilesByPhone = new Map<string, { profileId: string; name: string }[]>()
  // Every registrant's profile, by normalized full name — lets getOrCreateTeacher below recognize
  // when a "GURUVU GARU" column names someone who already registered as a student (see that
  // function's own doc comment), instead of minting a second, disconnected, phone-less identity
  // for the same real person.
  const profilesByName = new Map<string, ProfileRow>()
  const teachersByName = new Map<string, { user: UserRow; profile: ProfileRow }>()
  const chaptersMap = new Map<string, ChapterRow>()
  const batchesMap = new Map<string, BatchRow>()
  // Year/track parsed from each batch's own code (e.g. "VED-2026-GR-2-1" -> year 2026, track 2) —
  // every row for a given batch code carries the same value by construction, so this is set once
  // per batch, not per row.
  const batchYears = new Map<string, number>()
  const batchTrackNumbers = new Map<string, number>()
  // Batch codes with a "-CLOSED" suffix (see parseBatchCode) — always `completed`, regardless of
  // the active-student/current-year rule below.
  const forceCompletedBatches = new Set<string>()
  const enrollmentsByKey = new Map<string, EnrollmentRow>()
  const evaluations: EvaluationRow[] = []
  const trackCertifications: TrackCertificationRow[] = []
  // Certification columns (e.g. "TRACK 8 CERTIFICATION EXAM STATUS") don't become chapters — this
  // maps each such column name straight to the track it certifies, so the per-row evaluation loop
  // below knows to route its values into `trackCertifications` instead of `evaluations`.
  const certificationColumnTrackIds = new Map<string, string>()
  const registrationMetadata: RegistrationMetadataRow[] = []

  function buildRegistrationMetadata(profileId: string, row: Record<string, any>): RegistrationMetadataRow {
    const asString = (value: unknown): string | null => {
      const trimmed = String(value ?? '').trim()
      return trimmed || null
    }

    const rawEmail = asString(row['EMAIL ADDRESS'])
    const rawYearOfBirth = Number(row['YEAR OF BIRTH'])

    return {
      profileId,
      registeredYear: asString(row['REGISTERED']),
      registrationTimestamp: formatExcelTimestamp(row['Timestamp']),
      qualifiedStatus: asString(row['QUALIFIED?']),
      emailSent: asString(row['EMAIL SENT?']),
      whatsappSent: asString(row['WHATSAPP SENT?']),
      joinedCommGroup: asString(row['JOINED COMM GROUP?']),
      category: asString(row['CATEGORY']),
      upanayanamYear: asString(row['UPANAYANAM']),
      email: rawEmail ? rawEmail.toLowerCase() : null,
      yearOfBirth: Number.isFinite(rawYearOfBirth) && rawYearOfBirth > 1900 ? rawYearOfBirth : null,
      countryTimeZone: asString(row['COUNTRY TIME ZONE']),
      sourcePrimaryKey: asString(row['PRIMARY KEY']),
      referenceName: asString(row['REFERENCE NAME']),
      referencePhone: asString(row['REFERENCE PHONE']),
      gruhasta: asString(row['GRUHASTA']),
      brahmachari: asString(row['BRAHMACHARI']),
      vedaShaka: asString(row['VEDA SHAKA']),
      spokenLanguages: asString(row['SPOKEN']),
      readLanguages: asString(row['READ']),
      parentNames: asString(row['PARENT NAMES']),
      jobOccupation: asString(row['JOB']),
      parentStudying: asString(row['PARENT STUDYING']),
      learningGoal: asString(row['GOAL']),
      currentProficiency: asString(row['PROFICIENCY']),
      priorityLevel: asString(row['PRIORITY']),
      dressCodeAgreed: asString(row['DRESS CODE']),
      noMeatAgreed: asString(row['NO MEAT']),
      noAlcoholAgreed: asString(row['NO ALCHOHOL']),
      noSmokingAgreed: asString(row['NO SMOKING']),
      comments: asString(row['COMMENTS']),
    }
  }

  // user.email is unique+required. `user` is keyed by phone, not email, so two different
  // phone-derived households can legitimately share one real email (e.g. a parent's personal
  // email used to register siblings under two different WhatsApp numbers) — that would collide.
  // First claimant keeps the real email; anyone else falls back to a synthetic one, flagged in
  // the report for manual reconciliation.
  const emailOwners = new Map<string, string>()
  function claimEmail(candidate: string | undefined, fallbackKey: string, userId: string): string {
    if (candidate) {
      const preferredOwnerPhone = PREFERRED_EMAIL_OWNERS[candidate]
      if (preferredOwnerPhone && preferredOwnerPhone !== fallbackKey) {
        // A specific, hand-verified household owns this email — never let a different household
        // claim it, regardless of which row is processed first. Deliberately not registered in
        // emailOwners, so the real slot stays free whenever the true owner's row is reached.
        const fallback = syntheticEmail(fallbackKey)
        emailOwners.set(fallback, userId)
        report.resolvedEmailOverrides.push({
          email: candidate,
          assignedToPhone: preferredOwnerPhone,
          fellBackToSyntheticFor: userId,
        })
        return fallback
      }

      const existingOwner = emailOwners.get(candidate)
      if (!existingOwner || existingOwner === userId) {
        emailOwners.set(candidate, userId)
        return candidate
      }
      const fallback = syntheticEmail(fallbackKey)
      emailOwners.set(fallback, userId)
      report.duplicateRealEmails.push({ email: candidate, keptForUserId: existingOwner, fellBackToSyntheticFor: userId })
      return fallback
    }
    const synthetic = syntheticEmail(fallbackKey)
    emailOwners.set(synthetic, userId)
    return synthetic
  }

  // Gets (creating if needed) the individual `profile` row for this person, and the household
  // `user` row for their phone number — every person gets exactly one profile, and every distinct
  // phone number gets exactly one user, even when only one person ever uses that number.
  function getOrCreateProfile(params: {
    phone: string
    yob: unknown
    firstName: unknown
    lastName: unknown
    city?: unknown
    fallbackFullName?: unknown
    realEmail?: string
  }): ProfileRow {
    const key = identityKey(params.phone, params.yob, params.firstName, params.lastName)
    const existing = profilesByIdentity.get(key)
    if (existing) return existing

    const computedName =
      `${params.firstName ?? ''} ${params.lastName ?? ''}`.trim() ||
      String(params.fallbackFullName || '') ||
      'Student'

    const userKey = params.phone || `noPhone:${key}`
    let user = usersByPhone.get(userKey)
    if (!user) {
      const id = uuidv7()
      const phoneNumber = params.phone ? toE164(params.phone) : null
      if (params.phone && !phoneNumber) {
        report.invalidE164Phones.push({ userId: id, rawDigits: params.phone, name: computedName })
      }
      user = {
        id,
        name: computedName,
        email: claimEmail(params.realEmail, userKey, id),
        isSuperAdmin: false,
        phoneNumber,
        phoneNumberVerified: phoneNumber ? false : null,
      }
      usersByPhone.set(userKey, user)
      usersById.set(user.id, user)
    }

    const profile: ProfileRow = {
      id: uuidv7(),
      userId: user.id,
      name: computedName,
      phone: params.phone || null,
      city: (params.city as string) || null,
    }
    profilesByIdentity.set(key, profile)
    // First registrant with a given name wins the name-index (same tie-break as claimEmail above)
    // — two different real people sharing an exact name is an inherent ambiguity exact-string
    // matching can't resolve, not a bug to chase further here.
    const nameKey = normalizeName(computedName)
    if (!profilesByName.has(nameKey)) {
      profilesByName.set(nameKey, profile)
    }

    if (params.phone) {
      const siblings = profilesByPhone.get(params.phone) ?? []
      siblings.push({ profileId: profile.id, name: computedName })
      profilesByPhone.set(params.phone, siblings)
    } else {
      report.missingPhoneProfiles.push({ profileId: profile.id, name: computedName, identityKey: key })
    }

    return profile
  }

  /**
   * A "GURUVU GARU" column has only a bare name — no phone, no YOB — so it can't run through
   * identityKey the way a registration row does. Run against the name of every profile the
   * registration sheet already produced first: an exact match means this teacher is the same real
   * person as an existing (phone-bearing) registrant, and reuses their identity outright rather
   * than minting a second, disconnected, phone-less one for the same person — the bug that used to
   * leave every teacher with no way to sign in even when they'd separately registered as a
   * student. Falls back to a fresh phone-less identity only when no registrant matches.
   */
  function getOrCreateTeacher(teacherName: unknown): { user: UserRow; profile: ProfileRow } | null {
    const trimmedName = String(teacherName || '').trim()
    if (!trimmedName || trimmedName.toLowerCase() === 'na' || trimmedName.toLowerCase() === 'none') {
      return null
    }

    const existing = teachersByName.get(trimmedName)
    if (existing) return existing

    const matchedProfile = profilesByName.get(normalizeName(trimmedName))
    if (matchedProfile) {
      const matchedUser = usersById.get(matchedProfile.userId)
      if (!matchedUser) throw new Error(`getOrCreateTeacher: no user found for matched profile ${matchedProfile.id}`)
      const teacher = { user: matchedUser, profile: matchedProfile }
      teachersByName.set(trimmedName, teacher)
      report.teacherIdentityMerges.push({ teacherName: trimmedName, profileId: matchedProfile.id })
      return teacher
    }

    const teacherId = uuidv7()
    // No phone column exists for teachers in either sheet (only GURUVU GARU name columns) — stays
    // null until that data is collected some other way.
    const user: UserRow = {
      id: teacherId,
      name: trimmedName,
      email: claimEmail(undefined, trimmedName, teacherId),
      isSuperAdmin: false,
      phoneNumber: null,
      phoneNumberVerified: null,
    }
    usersById.set(user.id, user)
    const profile: ProfileRow = {
      id: uuidv7(),
      userId: user.id,
      name: trimmedName,
      phone: null,
      city: null,
    }

    const teacher = { user, profile }
    teachersByName.set(trimmedName, teacher)
    return teacher
  }

  // ==========================================
  // PHASE 1: Registrations
  // ==========================================
  console.log('📦 Processing registrations...')

  for (const row of regRows) {
    const phone = resolvePhone(sanitizePhone(row['COUNTRY CODE'], row['WHATSAPP']))
    const firstName = row['FIRST NAME'] || ''
    const lastName = row['LAST NAME'] || ''
    const yob = row['YEAR OF BIRTH'] || ''
    const realEmail = String(row['EMAIL ADDRESS'] || '')
      .toLowerCase()
      .trim()

    const profileCountBefore = profilesByIdentity.size
    const profile = getOrCreateProfile({
      phone,
      yob,
      firstName,
      lastName,
      city: row['CITY'],
      fallbackFullName: row['FULL NAME'],
      realEmail: realEmail || undefined,
    })

    // Only the row that actually established this profile's identity — a second registration row
    // for the same person (e.g. the Tadepalli re-registration, aliased above) doesn't overwrite it.
    if (profilesByIdentity.size > profileCountBefore) {
      registrationMetadata.push(buildRegistrationMetadata(profile.id, row))
    }
  }

  // ==========================================
  // PHASE 2: Chapters & tracks from the canonical tracker sheet's columns
  // ==========================================
  console.log('📊 Mapping chapters to tracks...')

  // Metadata columns shared by every tracker sheet (BR-TRACK N / GR-TRACK N / ALL-INACTIVE) —
  // matched case/whitespace-insensitively via normHeader, since sheets don't agree on casing
  // ("FULL NAME" vs "Full Name") or embedded "\r\n"s.
  const trackerMetadataColumns = new Set(
    [
      'Primary Key',
      'COUNTRY CODE',
      'Phone Number',
      'YOB',
      'Last Name',
      'First Name',
      'BATCH NUMBER (NARADA LMS)',
      'GURUVU GARU 1',
      'GURUVU GARU 2',
      'GURUVU GARU 3',
      'STUDENT STATUS (ACTIVE / BREAK)',
      'LAST 4-WEEKS ATTENDANCE',
      'OVERALL AKSHARA / SWARA JNANAM',
      'OVERALL EXAM BACKLOG',
      'Roll Number (Sorted by Last Name)',
      'FULL NAME',
      'Time zone',
    ].map(normHeader),
  )
  // Stray columns with no student data behind them anywhere in the workbook — a blank-header
  // artifact ("__EMPTY", "__EMPTY_1", ...) or a leftover formula-helper column ("XLOOKUP"), neither
  // of which is a real chapter.
  const isJunkColumn = (col: string) => /^__EMPTY(_\d+)?$/.test(col) || normHeader(col) === 'xlookup'
  // The new format's replacement for the old single "TRACK N CERTIFICATION EXAM STATUS" column: a
  // pair of columns closing out each track's chapters — "L3 Aavarthi Status" (a revision-round
  // marker, dropped — see droppedMetadata above) and "L4 Cert Status (Auto Update)" (the actual
  // certification result, feeding track-certifications.json exactly like the old single column
  // did). SheetJS suffixes repeated header names ("_1", "_2", ...), so match by prefix.
  const isAavarthiColumn = (col: string) => normHeader(col).startsWith('l3 aavarthi status')
  const isCertColumn = (col: string) => normHeader(col).startsWith('l4 cert status')

  const canonicalRows: Record<string, any>[] = XLSX.utils.sheet_to_json(
    workbook.Sheets[CANONICAL_CURRICULUM_SHEET],
    { defval: '' },
  )
  if (canonicalRows.length > 0) {
    const allHeaders = Object.keys(canonicalRows[0])
    const curriculumColumns = allHeaders.filter(
      col => !trackerMetadataColumns.has(normHeader(col)) && !isJunkColumn(col),
    )

    let currentTrackNum = 1
    let orderInTrack = 1

    for (const colName of curriculumColumns) {
      if (isAavarthiColumn(colName)) continue

      const trackObj = tracksMap.get(currentTrackNum)!

      if (isCertColumn(colName)) {
        // The certification result belongs to the track this column is closing out, not the one
        // about to start — record it before `currentTrackNum` advances below.
        certificationColumnTrackIds.set(colName, trackObj.id)
        if (currentTrackNum < 8) {
          currentTrackNum++
          orderInTrack = 1
        }
      } else if (!chaptersMap.has(colName)) {
        chaptersMap.set(colName, {
          id: uuidv7(),
          trackId: trackObj.id,
          code: `${currentTrackNum}.${orderInTrack}`,
          title: colName,
          status: 'published',
          order: orderInTrack++,
          script: null,
        })
      }
    }
  }

  // ==========================================
  // PHASE 3: Batches, enrollments, evaluations
  // ==========================================
  console.log('👥 Mapping batches, enrollments, and evaluations...')

  for (const sheet of TRACKER_SHEETS) {
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheet.name], { defval: '' })

    for (const row of rows) {
      const get = fieldGetter(row)
      const rawBatchCode = String(get('BATCH NUMBER (NARADA LMS)') ?? '').trim()
      if (!rawBatchCode) {
        report.droppedRowsMissingIdentity.push({ sheet: sheet.name, reason: 'no BATCH NUMBER (NARADA LMS) value' })
        continue
      }

      let batchRecord = batchesMap.get(rawBatchCode)
      if (!batchRecord) {
        const { year, track: parsedTrackNumber, forceCompleted } = parseBatchCode(rawBatchCode, sheet.name, report)
        const trackObj = tracksMap.get(parsedTrackNumber) ?? tracksMap.get(1)!
        batchRecord = {
          id: uuidv7(),
          trackId: trackObj.id,
          code: rawBatchCode,
          status: 'upcoming',
          startDate: null,
          meetingUrl: null,
        }
        batchesMap.set(rawBatchCode, batchRecord)
        batchYears.set(rawBatchCode, year)
        batchTrackNumbers.set(rawBatchCode, parsedTrackNumber)
        if (forceCompleted) forceCompletedBatches.add(rawBatchCode)
      }

      const phone = resolvePhone(sanitizePhone(get('COUNTRY CODE'), get('Phone Number')))
      const firstName = get('First Name') || ''
      const lastName = get('Last Name') || ''
      const yob = get('YOB') || ''

      const studentProfile = getOrCreateProfile({
        phone,
        yob,
        firstName,
        lastName,
        fallbackFullName: get('FULL NAME'),
      })

      const batchYear = batchYears.get(rawBatchCode)!
      const calculatedJoinedAt = batchTrackNumbers.get(rawBatchCode) === 1 ? `${batchYear}-01-01` : null

      const { status: parsedStudentStatus, matched } = sheet.forcedStatus
        ? { status: sheet.forcedStatus, matched: true }
        : sanitizeStudentStatus(get('STUDENT STATUS (ACTIVE / BREAK)'))
      if (!matched) {
        report.ambiguousStudentStatus.push({
          rawValue: String(get('STUDENT STATUS (ACTIVE / BREAK)') ?? ''),
          mappedTo: parsedStudentStatus,
          profileId: studentProfile.id,
          batchCode: rawBatchCode,
        })
      }

      addEnrollment(studentProfile.id, batchRecord.id, 'student', parsedStudentStatus, calculatedJoinedAt)

      const guru1 = getOrCreateTeacher(get('GURUVU GARU 1'))
      if (guru1) addEnrollment(guru1.profile.id, batchRecord.id, 'instructor', 'active', calculatedJoinedAt)

      const guru2 = getOrCreateTeacher(get('GURUVU GARU 2'))
      if (guru2) addEnrollment(guru2.profile.id, batchRecord.id, 'ta', 'active', calculatedJoinedAt)

      const guru3 = getOrCreateTeacher(get('GURUVU GARU 3'))
      if (guru3) addEnrollment(guru3.profile.id, batchRecord.id, 'ta', 'active', calculatedJoinedAt)

      const evaluator = guru1 ?? getOrCreateTeacher('Teacher')!

      for (const [chapterTitle, chapterData] of chaptersMap.entries()) {
        const level = mapScoreToLevel(get(chapterTitle))
        if (level) {
          evaluations.push({
            id: uuidv7(),
            studentId: studentProfile.id,
            chapterId: chapterData.id,
            level,
            evaluatorId: evaluator.profile.id,
          })
        }
      }

      for (const [columnName, trackId] of certificationColumnTrackIds.entries()) {
        const level = mapScoreToLevel(get(columnName))
        if (level) {
          trackCertifications.push({
            id: uuidv7(),
            trackId,
            studentId: studentProfile.id,
            level,
            evaluatorId: evaluator.profile.id,
          })
        }
      }
    }
  }

  function addEnrollment(
    profileId: string,
    batchId: string,
    role: EnrollmentRow['role'],
    status: EnrollmentRow['status'],
    joinedAt: string | null,
  ) {
    const key = `${profileId}|${batchId}`
    const existing = enrollmentsByKey.get(key)
    if (existing) {
      if (existing.role !== role) {
        report.enrollmentRoleSkips.push({
          profileId,
          batchId,
          existingRole: existing.role,
          skippedRole: role,
        })
      }
      return
    }
    enrollmentsByKey.set(key, { profileId, batchId, role, status, joinedAt, leftDate: null })
  }

  // Phone collisions: any phone shared by more than one profile — the primary reason `user` and
  // `profile` are split (one household user, one profile per person).
  for (const [phone, profiles] of profilesByPhone.entries()) {
    if (profiles.length > 1) {
      const userId = usersByPhone.get(phone)!.id
      report.phoneCollisions.push({ phone, userId, profiles })
    }
  }

  // Batch status: no source column gives this directly, so it's derived (and always flagged for
  // review). Rule (per product decision): a batch is 'active' if any of its student enrollments is
  // itself 'active', OR its own code's year is the current calendar year — 'completed' otherwise. A
  // "-CLOSED" batch code (see parseBatchCode) always wins as 'completed', regardless of the above.
  const currentYear = new Date().getFullYear()
  const hasActiveStudentByBatch = new Map<string, boolean>()
  for (const enr of enrollmentsByKey.values()) {
    if (enr.role === 'student' && enr.status === 'active') {
      hasActiveStudentByBatch.set(enr.batchId, true)
    }
  }
  for (const [batchCode, batchRow] of batchesMap.entries()) {
    if (forceCompletedBatches.has(batchCode)) {
      batchRow.status = 'completed'
      report.batchStatusDefaults.push({ batchCode, status: 'completed', reason: '"-CLOSED" batch code' })
      continue
    }

    const batchYear = batchYears.get(batchCode)!
    const hasActiveStudent = hasActiveStudentByBatch.get(batchRow.id) ?? false
    const isCurrentYear = batchYear === currentYear
    batchRow.status = hasActiveStudent || isCurrentYear ? 'active' : 'completed'
    report.batchStatusDefaults.push({
      batchCode,
      status: batchRow.status,
      reason:
        `year ${batchYear}${isCurrentYear ? ' (current)' : ''}, ` +
        `${hasActiveStudent ? 'has' : 'no'} active student enrollment`,
    })
  }

  // ==========================================
  // PHASE 4: Save outputs
  // ==========================================
  console.log('💾 Saving JSON seed files...')

  // Deduped by id, not concatenated: a merged teacher (getOrCreateTeacher's identity-match path,
  // see report.teacherIdentityMerges) reuses an existing registrant's user/profile object rather
  // than creating a new one, so teachersByName and usersByPhone/profilesByIdentity can legitimately
  // both contain the exact same row for that person — concatenating would emit it twice.
  const allUsersById = new Map<string, UserRow>()
  for (const u of usersByPhone.values()) allUsersById.set(u.id, u)
  for (const t of teachersByName.values()) allUsersById.set(t.user.id, t.user)
  const allUsers = [...allUsersById.values()]

  const allProfilesById = new Map<string, ProfileRow>()
  for (const p of profilesByIdentity.values()) allProfilesById.set(p.id, p)
  for (const t of teachersByName.values()) allProfilesById.set(t.profile.id, t.profile)
  const allProfiles = [...allProfilesById.values()]

  const enrollments = Array.from(enrollmentsByKey.values())

  const write = (name: string, data: unknown) =>
    fs.writeFileSync(path.join(OUTPUT_DIR, name), JSON.stringify(data, null, 2))

  write('tracks.json', Array.from(tracksMap.values()))
  write('chapters.json', Array.from(chaptersMap.values()))
  write('batches.json', Array.from(batchesMap.values()))
  write('users.json', allUsers)
  write('profiles.json', allProfiles)
  write('enrollments.json', enrollments)
  write('evaluations.json', evaluations)
  write('track-certifications.json', trackCertifications)
  write('registration-metadata.json', registrationMetadata)
  write('_report.json', report)

  console.log(`
✅ Done.
   users: ${allUsers.length}  profiles: ${allProfiles.length}  tracks: ${tracksMap.size}
   chapters: ${chaptersMap.size}  batches: ${batchesMap.size}  enrollments: ${enrollments.length}  evaluations: ${evaluations.length}
   track certifications: ${trackCertifications.length}
   phone collisions (shared accounts): ${report.phoneCollisions.length}
   teacher identities merged into an existing registrant (same person, one identity): ${report.teacherIdentityMerges.length}
   invalid E.164 phone numbers (no login capability yet): ${report.invalidE164Phones.length}
   ambiguous student-status values: ${report.ambiguousStudentStatus.length}
   batch code anomalies (non-numeric track / unrecognized suffix): ${report.batchCodeAnomalies.length}
   registration-metadata.json: ${registrationMetadata.length} rows (import-school.ts backfills most fields onto profile)
   review seed-data/_report.json before running the importer.
  `)
}

run().catch(err => {
  console.error('❌ Error parsing Excel data:', err)
  process.exit(1)
})
