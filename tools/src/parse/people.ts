import type { PersonFields, ProficiencyLevel, ProfileRow, RegistrationRow, UserRow } from '../seed-types'
import { clean, columns, digits, normHeader, orNull, readSheet, rowNumber, stableId, type Ctx } from './sheet'

/** What the schools share: `user` is platform-wide, so one phone number is one user in every school. */
export type SharedUsers = { byPhone: Map<string, UserRow>; emailOwners: Map<string, string> }

// Matches the phoneNumberValidator on the OTP-auth `phoneNumber` plugin config
// (packages/auth/src/index.ts) exactly, so nothing written here fails validation at sign-in.
const E164_PATTERN = /^\+[1-9]\d{7,14}$/

const syntheticEmail = (key: string) =>
  `${key.replace(/[^a-z0-9]/gi, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '').toLowerCase()}@slmts.seed.local`

// user.email is unique platform-wide and required. A phone number is one user, so two households can
// legitimately share one real address (a parent's email on a child's row) — the first keeps it and the
// rest get a placeholder. Sign-in is by phone; each profile and registration keeps its own real email.
function claimEmail(shared: SharedUsers, candidate: string | null, householdKey: string, userId: string): string {
  const owner = candidate ? shared.emailOwners.get(candidate) : undefined
  const email = candidate && (!owner || owner === userId) ? candidate : syntheticEmail(householdKey)
  shared.emailOwners.set(email, userId)
  return email
}

// ---- the sheets' free text → typed columns (the same conversion `registration` and `profile` need)

const parseYesNo = (value: string | null) => value?.toLowerCase() === 'yes'

// Free-text lists mix comma-separated ("Telugu, Hindi") and space-separated ("telugu English")
// entries; splitting on commas handles nearly all of them. "Not applicable" placeholders in their many
// spellings ("N/A", "N.A.", "n/a") are dropped rather than kept as a fake language or parent name.
const LIST_JUNK = new Set(['na', 'none', 'no', 'notapplicable', '0'])
function splitList(value: string | null): string[] {
  return (value ?? '')
    .split(',')
    .map(entry => entry.trim())
    .filter(entry => entry && !LIST_JUNK.has(entry.toLowerCase().replace(/[^a-z0-9]/g, '')))
}

// The sheets ask a differently-worded self-assessment ("None" / "Low" / "Medium" / "High", with or
// without an explanation) than the live form's Level 1-4 scale, so there is no exact mapping. Only the
// leading keyword's coarse intent is kept, at the lowest formal tier: claiming a level from a
// self-report would over-state it. ('practicing' is what the web app shows as L0.)
function proficiency(value: string | null): ProficiencyLevel | null {
  const lower = value?.toLowerCase()
  if (!lower) return null
  if (lower.startsWith('no')) return 'notStarted' // "None. …" and "No Proficiency"
  if (lower.startsWith('low') || lower.startsWith('medium')) return 'practicing'
  if (lower.startsWith('high')) return 'level1'
  return null
}

// The sheets' "COUNTRY TIME ZONE" is a pick-list bucket ("1-INDIA IST"), not the IANA identifier
// `profile.countryTimeZone` holds. Only the buckets that name a single zone convert; "MST/PST" spans
// two and "OTHER" none, so those stay empty rather than guessed.
const TIME_ZONES: Record<string, string> = {
  '1-india ist': 'Asia/Kolkata',
  '2-usa est': 'America/New_York',
  '3-usa cst': 'America/Chicago',
}

/** Reads the registration sheet: one user per phone number, one profile and one registration per row. */
export function parsePeople(ctx: Ctx, sheetName: string, shared: SharedUsers) {
  const { school, course, block } = ctx
  const sheet = readSheet(ctx.workbook, sheetName)
  const col = columns(sheet)
  const users = new Map<string, UserRow>()
  const profiles = new Map<string, ProfileRow>() // by PRIMARY KEY
  const registrations: RegistrationRow[] = []
  const seenKeys = new Map<string, number>()

  sheet.rows.forEach((row, i) => {
    const at = (name: string) => {
      const found = col.optional(name)
      return found < 0 ? '' : row[found]
    }
    const key = clean(row[col.index('PRIMARY KEY')])
    if (!key) return
    const where = { sheet: sheet.name, row: rowNumber(sheet, i), key }

    if (seenKeys.has(key)) return block(where, `PRIMARY KEY repeats row ${seenKeys.get(key)} — one person, two rows`)
    seenKeys.set(key, where.row)

    const firstName = clean(at('FIRST NAME'))
    const lastName = clean(at('LAST NAME'))
    const countryCode = digits(at('WHATSAPP COUNTRY CODE'))
    const national = digits(at('WHATSAPP PHONE NUMBER'))
    const yearOfBirth = Number(at('YEAR OF BIRTH'))
    const household = `${countryCode}${national}` // one login
    const phone = `+${household}`

    // Anything wrong with the row itself: report every problem, create nothing from it.
    const problems = [
      key !== `${countryCode}-${national}-${yearOfBirth}` &&
        `PRIMARY KEY is not <country code>-<phone>-<year of birth> of this row's own columns (expected ${countryCode}-${national}-${yearOfBirth})`,
      (!firstName || !lastName) && 'FIRST NAME or LAST NAME is empty',
      (!Number.isInteger(yearOfBirth) || yearOfBirth < 1900) && `YEAR OF BIRTH "${clean(at('YEAR OF BIRTH'))}" is not a year`,
      !E164_PATTERN.test(phone) &&
        `WHATSAPP COUNTRY CODE + PHONE NUMBER ("${countryCode}" + "${national}") is not a valid E.164 number`,
      clean(at('ADMITTED?')).toUpperCase() !== 'YES' && `ADMITTED? is "${clean(at('ADMITTED?'))}", not YES`,
    ].filter(Boolean) as string[]
    if (problems.length) return problems.forEach(problem => block(where, problem))

    const email = orNull(at('EMAIL ADDRESS'))?.toLowerCase() ?? null
    const name = `${firstName} ${lastName}`
    const city = orNull(at('CITY'))
    const registeredYear = Number(at('REGISTERED YEAR'))

    let user = shared.byPhone.get(household)
    if (!user) {
      const id = stableId('user', household)
      user = {
        id,
        name,
        email: claimEmail(shared, email, household, id),
        isSuperAdmin: false,
        phoneNumber: phone,
        phoneNumberVerified: false,
      }
      shared.byPhone.set(household, user)
    }
    users.set(user.id, user)

    // A profile is its registration's snapshot (as when an admin approves an application in the app),
    // so both carry the same converted fields.
    const person: PersonFields = {
      email,
      yearOfBirth,
      countryTimeZone: TIME_ZONES[normHeader(at('COUNTRY TIME ZONE'))] ?? null,
      learningGoal: orNull(at('GOAL')),
      currentProficiency: proficiency(orNull(at('PROFICIENCY'))),
      spokenLanguages: splitList(orNull(at('LANGUAGES SPOKEN'))),
      readLanguages: splitList(orNull(at('LANGUAGES READ'))),
      parentNames: splitList(orNull(at('PARENT NAMES'))),
      // The two workbooks ask different consent questions: only the Vedam form has these four.
      dressCodeAgreed: parseYesNo(orNull(at('TRADITIONAL DRESS'))),
      noMeatAgreed: parseYesNo(orNull(at('NO MEAT'))),
      noAlcoholAgreed: parseYesNo(orNull(at('NO ALCHOHOL'))),
      noSmokingAgreed: parseYesNo(orNull(at('NO SMOKING'))),
      comments: orNull(at('COMMENTS')),
    }

    const profileId = stableId('profile', school, key)
    profiles.set(key, { ...person, id: profileId, userId: user.id, name, phone, city, sourceKey: key })
    registrations.push({
      ...person,
      id: stableId('registration', school, key),
      courseSlug: course,
      profileId,
      sourceKey: key,
      registeredYear: Number.isInteger(registeredYear) && registeredYear > 1900 ? registeredYear : null,
      firstName,
      lastName,
      phone,
      city,
    })
  })

  return { users: [...users.values()], profiles, registrations }
}
