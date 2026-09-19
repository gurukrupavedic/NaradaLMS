import { and, asc, desc, eq, gt, lt, or, type SQL } from 'drizzle-orm'

import { member, registration, user, uuidv7, type PublicDb, type SchoolDb } from '@narada/db'

import { paginateResponse } from '../utils/cursor'
import type { CreateRegistrationData, FindRegistrationsData, Registration } from './schema'

/** `createdAt` is never null (unlike `batch.startDate`/`evaluation.evaluatedAt`), so this needs
 * only the single-phase ordered-cursor query, not those domains' null-aware two-phase split. */
export async function findAll(
  db: SchoolDb,
  { status, limit, cursor }: FindRegistrationsData,
): Promise<{ items: Registration[]; nextCursor: string | null }> {
  const conditions: SQL[] = []
  if (status) {
    conditions.push(eq(registration.status, status))
  }

  if (cursor) {
    conditions.push(
      or(
        lt(registration.createdAt, cursor.createdAt),
        and(eq(registration.createdAt, cursor.createdAt), gt(registration.id, cursor.id)),
      )!,
    )
  }

  const rows = await db.query.registration.findMany({
    where: and(...conditions),
    orderBy: [desc(registration.createdAt), asc(registration.id)],
    limit: limit + 1,
  })

  return paginateResponse(rows, limit, item => ({ createdAt: item.createdAt, id: item.id }))
}

export async function findById(db: SchoolDb, id: string): Promise<Registration | undefined> {
  return db.query.registration.findFirst({
    where: (t, { eq: eqCol }) => eqCol(t.id, id),
  })
}

/**
 * Accepts `countryTimeZone` on top of `CreateRegistrationData`'s own fields — never
 * applicant-supplied (see `RegistrationSchema`'s doc comment), but `service.ts::submit` derives
 * and includes it server-side before inserting.
 */
export async function insert(
  db: SchoolDb,
  data: CreateRegistrationData & { courseId: string; countryTimeZone: string | null },
): Promise<Registration | undefined> {
  const rows = await db.insert(registration).values(data).returning()
  return rows.at(0)
}

/** Transitions a still-`pending` registration to `status`, recording who reviewed it and when.
 * The `eq(status, 'pending')` predicate makes a double approve/reject a no-op update (0 rows)
 * rather than silently overwriting an earlier reviewer/timestamp. `convertedProfileId` is only
 * ever set on approval — `reject` always passes `null`. */
export async function transitionStatus(
  db: SchoolDb,
  id: string,
  status: 'approved' | 'rejected',
  reviewedBy: string | null,
  convertedProfileId: string | null,
): Promise<Registration | undefined> {
  const rows = await db
    .update(registration)
    .set({ status, reviewedAt: new Date(), reviewedBy, convertedProfileId })
    .where(and(eq(registration.id, id), eq(registration.status, 'pending')))
    .returning()

  return rows.at(0)
}

// ── Account provisioning (public schema) ────────────────────────────────────
// Approving a registration needs a real `user` (and, for a signed-in account to actually use this
// school, a `member` row) — both live in the public schema, a different Postgres connection pool
// than `SchoolDb` (packages/db/src/index.ts: `publicDb` and each school's `getSchoolDb(...)` are
// separate `pg.Pool`s, even on the same physical database), so none of this can share a
// transaction with the school-schema writes below. Both helpers are find-or-create, which is what
// makes the caller safe to simply retry on partial failure (service.ts's `approve`): a registration
// only flips to 'approved' once every step here has already succeeded.

export type ProvisionedUser = { id: string; isNewUser: boolean }

/**
 * One `user` per phone number (enforced by the column's own unique constraint) — matches how
 * sign-in already works (app/login/page.tsx's phone → OTP → *profile* picker step exists because a
 * household can share one number across several people/profiles). A second registration under a
 * phone that already has an account reuses it rather than failing, so a sibling applying separately
 * ends up as a second profile under the same login, not a blocked registration.
 */
export async function findOrCreateApplicantUser(
  db: PublicDb,
  input: { phone: string; name: string; email: string | null },
): Promise<ProvisionedUser> {
  const existing = await db.query.user.findFirst({
    where: (t, { eq: eqCol }) => eqCol(t.phoneNumber, input.phone),
    columns: { id: true },
  })
  if (existing) return { id: existing.id, isNewUser: false }

  const email = await resolveAvailableEmail(db, input.email, input.phone)
  const id = uuidv7()
  const rows = await db
    .insert(user)
    .values({
      id,
      name: input.name,
      email,
      emailVerified: false,
      phoneNumber: input.phone,
      // Left unverified rather than pre-claimed true: a teacher reviewed the *application*, not a
      // live OTP round trip with this phone. `packages/auth`'s phoneNumber plugin sets this true
      // itself, unconditionally, the first time this person actually completes a real sign-in.
      phoneNumberVerified: false,
      isSuperAdmin: false,
    })
    .returning({ id: user.id })

  const row = rows.at(0)
  if (!row) throw new Error('findOrCreateApplicantUser: insert returned no row')
  return { id: row.id, isNewUser: true }
}

/**
 * `user.email` is NOT NULL + UNIQUE, but a registration's own email is optional and, even when
 * given, might already belong to a different account (e.g. a parent's address reused across
 * siblings who register separately — the same real-world case `tools/src/parse-excel-to-json.ts`
 * had to handle for the historical import). Falls back to a synthetic address keyed on the new
 * user's phone, which is already guaranteed unique by the caller's phone-based find-or-create.
 */
async function resolveAvailableEmail(db: PublicDb, candidate: string | null, phone: string): Promise<string> {
  if (candidate) {
    const taken = await db.query.user.findFirst({
      where: (t, { eq: eqCol }) => eqCol(t.email, candidate),
      columns: { id: true },
    })
    if (!taken) return candidate
  }

  return syntheticEmail(phone)
}

function syntheticEmail(phone: string): string {
  return `student-${phone.replace(/\D/g, '')}@narada.local`
}

/** Grants `userId` school membership if it doesn't already have one — every school-scoped API call
 * requires this (AccessPolicy.load), and a fresh applicant has never had a reason to hold one. */
export async function ensureSchoolMembership(
  db: PublicDb,
  organizationId: string,
  userId: string,
): Promise<void> {
  const existing = await db.query.member.findFirst({
    where: (t, { and: andCols, eq: eqCol }) => andCols(eqCol(t.organizationId, organizationId), eqCol(t.userId, userId)),
    columns: { id: true },
  })
  if (existing) return

  await db.insert(member).values({
    id: uuidv7(),
    organizationId,
    userId,
    role: 'member',
    createdAt: new Date(),
  })
}
