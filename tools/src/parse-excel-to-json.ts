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
  '../../data/SLMTS - ASSESSMENTS - REGISTRATIONS - DE-DUPLICATED 07-10-2026.xlsx',
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

// Registration-sheet columns with no home in the current schema — not written by import-school.ts
// and never touches the DB. Kept identity-matched to a profile now (rather than left only in the
// raw spreadsheet) so whoever adds real columns for this later can join on profileId instead of
// re-deriving the phone/YOB/name matching from scratch. One entry per profile, captured from
// whichever registration row first established that profile's identity.
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
  graduatedBatches: { batchCode: string; batchId: string }[]
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

function isGraduatedBatch(batchCode: string, rawTrackNum: unknown): boolean {
  const code = String(batchCode ?? '').toUpperCase()
  const trackStr = String(rawTrackNum ?? '').toUpperCase()
  return code.includes('GRAD') || trackStr.includes('GRAD')
}

function parseTrackNumber(rawTrackNum: unknown, batchCode: string): number {
  const parsedFromColumn = parseInt(String(rawTrackNum ?? '').trim(), 10)
  if (!isNaN(parsedFromColumn) && parsedFromColumn > 0) {
    return parsedFromColumn
  }
  const match = batchCode.match(/(?:VED|TRACK)-0*(\d+)/i)
  if (match && match[1]) {
    return parseInt(match[1], 10)
  }
  return 1
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

async function run() {
  console.log(`🚀 Loading Excel file: ${EXCEL_FILE}`)

  if (!fs.existsSync(EXCEL_FILE)) {
    throw new Error(`File not found at: ${EXCEL_FILE}`)
  }

  const workbook = XLSX.readFile(EXCEL_FILE)

  const regSheet = workbook.Sheets['Master_Registrations']
  const assessSheet = workbook.Sheets['Assessments-Master']

  if (!regSheet || !assessSheet) {
    throw new Error(
      `Could not find required sheets in Excel file. Available sheets: ${workbook.SheetNames.join(', ')}`,
    )
  }

  const regRows: Record<string, any>[] = XLSX.utils.sheet_to_json(regSheet, { defval: '' })
  const assessRows: Record<string, any>[] = XLSX.utils.sheet_to_json(assessSheet, { defval: '' })

  const report: Report = {
    droppedMetadata:
      'Registration-sheet columns with no home in the current schema (qualified status, upanayanam, ' +
      'parent info, consent flags, comments, etc.) are not part of the DB-shaped output and are ' +
      'never written by the importer. Preserved, identity-matched to a profileId, in ' +
      'registration-metadata.json for whenever real columns exist for this data.',
    phoneCollisions: [],
    missingPhoneProfiles: [],
    invalidE164Phones: [],
    ambiguousStudentStatus: [],
    graduatedBatches: [],
    enrollmentRoleSkips: [],
    duplicateRealEmails: [],
    resolvedEmailOverrides: [],
    batchStatusDefaults: [],
    droppedRowsMissingIdentity: [],
  }

  // ==========================================
  // Tracks: 1-8 structural tracks + one synthetic "Graduated" pseudo-track so graduated cohorts'
  // batch.trackId can stay NOT NULL without a schema change.
  // ==========================================
  const tracksMap = new Map<number, TrackRow>()
  for (let i = 1; i <= 8; i++) {
    tracksMap.set(i, { id: uuidv7(), name: `Track ${i}`, order: i })
  }
  const GRADUATED_TRACK_NUM = 9
  tracksMap.set(GRADUATED_TRACK_NUM, { id: uuidv7(), name: 'Graduated', order: GRADUATED_TRACK_NUM })

  const usersByPhone = new Map<string, UserRow>()
  const profilesByIdentity = new Map<string, ProfileRow>()
  const profilesByPhone = new Map<string, { profileId: string; name: string }[]>()
  const teachersByName = new Map<string, { user: UserRow; profile: ProfileRow }>()
  const chaptersMap = new Map<string, ChapterRow>()
  const batchesMap = new Map<string, BatchRow>()
  const batchTrackNumbers = new Map<string, number | null>()
  // Max "LAST Batch Year" seen across each batch's own students — verified clean (zero batches
  // have students disagreeing on this value), and a far better active/completed signal than
  // enrollment presence alone (every batch has at least one enrollment by construction).
  const batchLastYears = new Map<string, number>()
  let maxDataYear = 0
  const enrollmentsByKey = new Map<string, EnrollmentRow>()
  const evaluations: EvaluationRow[] = []
  const registrationMetadata: RegistrationMetadataRow[] = []

  function buildRegistrationMetadata(profileId: string, row: Record<string, any>): RegistrationMetadataRow {
    const asString = (value: unknown): string | null => {
      const trimmed = String(value ?? '').trim()
      return trimmed || null
    }

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
    }

    const profile: ProfileRow = {
      id: uuidv7(),
      userId: user.id,
      name: computedName,
      phone: params.phone || null,
      city: (params.city as string) || null,
    }
    profilesByIdentity.set(key, profile)

    if (params.phone) {
      const siblings = profilesByPhone.get(params.phone) ?? []
      siblings.push({ profileId: profile.id, name: computedName })
      profilesByPhone.set(params.phone, siblings)
    } else {
      report.missingPhoneProfiles.push({ profileId: profile.id, name: computedName, identityKey: key })
    }

    return profile
  }

  function getOrCreateTeacher(teacherName: unknown): { user: UserRow; profile: ProfileRow } | null {
    const trimmedName = String(teacherName || '').trim()
    if (!trimmedName || trimmedName.toLowerCase() === 'na' || trimmedName.toLowerCase() === 'none') {
      return null
    }

    const existing = teachersByName.get(trimmedName)
    if (existing) return existing

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
  // PHASE 2: Chapters & tracks from assessment columns
  // ==========================================
  console.log('📊 Mapping chapters to tracks...')

  const metadataColumns = new Set([
    'Joining Year',
    'Track Number',
    'LAST Batch Year',
    'Category',
    'Batch Number',
    'WhatsApp Batch Name',
    'GURUVU GARU 1',
    'GURUVU GARU 2 / TA',
    'GURUVU GARU 3 / TA',
    'Student Status',
    'LAST 4-WEEKS ATTENDANCE',
    'OVERALL AKSHARA / SWARA JNANAM',
    'OVERALL EXAM BACKLOG',
    'Roll Number',
    'Last Name',
    'First Name',
    'Full Name',
    'Country Code',
    'Phone Number',
    'Time zone',
    'YOB',
  ])

  if (assessRows.length > 0) {
    const allHeaders = Object.keys(assessRows[0])
    const assessmentColumns = allHeaders.filter(col => !metadataColumns.has(col))

    let currentTrackNum = 1
    let orderInTrack = 1

    for (const colName of assessmentColumns) {
      const trackObj = tracksMap.get(currentTrackNum)!

      if (!chaptersMap.has(colName)) {
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

      if (/TRACK\s*\d+\s*CERTIFICATION/i.test(colName)) {
        if (currentTrackNum < 8) {
          currentTrackNum++
          orderInTrack = 1
        }
      }
    }

    // ==========================================
    // PHASE 3: Batches, enrollments, evaluations
    // ==========================================
    console.log('👥 Mapping batches, enrollments, and evaluations...')

    for (const row of assessRows) {
      const rawBatchCode =
        row['WhatsApp Batch Name'] || `TRACK-${row['Track Number']}-BATCH-${row['Batch Number']}`
      const isGrad = isGraduatedBatch(rawBatchCode, row['Track Number'])
      const parsedTrackNumber = isGrad ? GRADUATED_TRACK_NUM : parseTrackNumber(row['Track Number'], rawBatchCode)
      const trackObj = tracksMap.get(parsedTrackNumber) ?? tracksMap.get(1)!

      let batchRecord = batchesMap.get(rawBatchCode)
      if (!batchRecord) {
        batchRecord = {
          id: uuidv7(),
          trackId: trackObj.id,
          code: rawBatchCode,
          status: 'upcoming',
          startDate: null,
          meetingUrl: null,
        }
        batchesMap.set(rawBatchCode, batchRecord)
        batchTrackNumbers.set(rawBatchCode, isGrad ? null : parsedTrackNumber)
        if (isGrad) report.graduatedBatches.push({ batchCode: rawBatchCode, batchId: batchRecord.id })
      }

      const lastBatchYear = parseInt(String(row['LAST Batch Year'] ?? '').trim(), 10)
      if (!isNaN(lastBatchYear)) {
        batchLastYears.set(rawBatchCode, Math.max(batchLastYears.get(rawBatchCode) ?? 0, lastBatchYear))
        maxDataYear = Math.max(maxDataYear, lastBatchYear)
      }

      const phone = resolvePhone(sanitizePhone(row['Country Code'], row['Phone Number']))
      const firstName = row['First Name'] || ''
      const lastName = row['Last Name'] || ''
      const yob = row['YOB'] || ''

      const studentProfile = getOrCreateProfile({
        phone,
        yob,
        firstName,
        lastName,
        fallbackFullName: row['Full Name'],
      })

      const trackNumberForJoin = batchTrackNumbers.get(rawBatchCode)
      const joiningYear = row['Joining Year'] || '2024'
      const calculatedJoinedAt = trackNumberForJoin === 1 ? `${joiningYear}-01-01` : null
      const { status: parsedStudentStatus, matched } = sanitizeStudentStatus(row['Student Status'])
      if (!matched) {
        report.ambiguousStudentStatus.push({
          rawValue: String(row['Student Status'] ?? ''),
          mappedTo: parsedStudentStatus,
          profileId: studentProfile.id,
          batchCode: rawBatchCode,
        })
      }

      addEnrollment(studentProfile.id, batchRecord.id, 'student', parsedStudentStatus, calculatedJoinedAt)

      const guru1 = getOrCreateTeacher(row['GURUVU GARU 1'])
      if (guru1) addEnrollment(guru1.profile.id, batchRecord.id, 'instructor', 'active', calculatedJoinedAt)

      const guru2 = getOrCreateTeacher(row['GURUVU GARU 2 / TA'])
      if (guru2) addEnrollment(guru2.profile.id, batchRecord.id, 'ta', 'active', calculatedJoinedAt)

      const guru3 = getOrCreateTeacher(row['GURUVU GARU 3 / TA'])
      if (guru3) addEnrollment(guru3.profile.id, batchRecord.id, 'ta', 'active', calculatedJoinedAt)

      const evaluator = guru1 ?? getOrCreateTeacher('Teacher')!

      for (const [chapterTitle, chapterData] of chaptersMap.entries()) {
        const level = mapScoreToLevel(row[chapterTitle])
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
  // review). Primary signal is "LAST Batch Year" — verified consistent within every batch — a
  // batch is 'active' if its students' most recent batch year matches the newest year seen
  // anywhere in the dataset, 'completed' otherwise. Falls back to "has a student enrollment" only
  // for the rare batch with no year data at all (none exist in the current spreadsheet, but the
  // fallback is kept and flagged distinctly in case future data has gaps).
  const studentEnrollmentCountByBatch = new Map<string, number>()
  for (const enr of enrollmentsByKey.values()) {
    if (enr.role === 'student') {
      studentEnrollmentCountByBatch.set(enr.batchId, (studentEnrollmentCountByBatch.get(enr.batchId) ?? 0) + 1)
    }
  }
  for (const [batchCode, batchRow] of batchesMap.entries()) {
    const lastYear = batchLastYears.get(batchCode)
    if (lastYear !== undefined && maxDataYear > 0) {
      batchRow.status = lastYear >= maxDataYear ? 'active' : 'completed'
      report.batchStatusDefaults.push({
        batchCode: batchRow.code,
        status: batchRow.status,
        reason: `LAST Batch Year ${lastYear} (newest in dataset: ${maxDataYear})`,
      })
      continue
    }

    const hasStudents = (studentEnrollmentCountByBatch.get(batchRow.id) ?? 0) > 0
    batchRow.status = hasStudents ? 'active' : 'completed'
    report.batchStatusDefaults.push({
      batchCode: batchRow.code,
      status: batchRow.status,
      reason: `no LAST Batch Year data — fell back to enrollment presence (${hasStudents ? 'has' : 'no'} active student enrollments)`,
    })
  }

  // ==========================================
  // PHASE 4: Save outputs
  // ==========================================
  console.log('💾 Saving JSON seed files...')

  const allUsers = [...usersByPhone.values(), ...[...teachersByName.values()].map(t => t.user)]
  const allProfiles = [...profilesByIdentity.values(), ...[...teachersByName.values()].map(t => t.profile)]
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
  write('registration-metadata.json', registrationMetadata)
  write('_report.json', report)

  console.log(`
✅ Done.
   users: ${allUsers.length}  profiles: ${allProfiles.length}  tracks: ${tracksMap.size}
   chapters: ${chaptersMap.size}  batches: ${batchesMap.size}  enrollments: ${enrollments.length}  evaluations: ${evaluations.length}
   phone collisions (shared accounts): ${report.phoneCollisions.length}
   invalid E.164 phone numbers (no login capability yet): ${report.invalidE164Phones.length}
   ambiguous student-status values: ${report.ambiguousStudentStatus.length}
   registration-metadata.json: ${registrationMetadata.length} rows (not imported — for future schema work)
   review seed-data/_report.json before running the importer.
  `)
}

run().catch(err => {
  console.error('❌ Error parsing Excel data:', err)
  process.exit(1)
})
