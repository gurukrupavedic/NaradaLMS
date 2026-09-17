import { and, eq, inArray, isNull, notInArray } from 'drizzle-orm'

import { enrollment, profile, type PublicDb, type SchoolDb } from '@narada/db'

import type { BatchReadScope } from '../utils/accessPolicy'
import { tokenMatch } from '../utils/search'
import type { CreateProfileData, Profile, SearchProfilesQuery, UpdateProfileData } from './schema'

const SEARCH_LIMIT = 25

/**
 * Explicit projection matching `Profile` exactly. `profile.deletedAt` is an internal lifecycle
 * column (DD-011) and is deliberately never returned to API consumers, which serialize these
 * rows directly.
 */
const profileColumns = {
  id: profile.id,
  userId: profile.userId,
  name: profile.name,
  phone: profile.phone,
  city: profile.city,
  email: profile.email,
  yearOfBirth: profile.yearOfBirth,
  state: profile.state,
  country: profile.country,
  countryTimeZone: profile.countryTimeZone,
  learningGoal: profile.learningGoal,
  currentProficiency: profile.currentProficiency,
  spokenLanguages: profile.spokenLanguages,
  readLanguages: profile.readLanguages,
  parentNames: profile.parentNames,
  dressCodeAgreed: profile.dressCodeAgreed,
  noMeatAgreed: profile.noMeatAgreed,
  noAlcoholAgreed: profile.noAlcoholAgreed,
  noSmokingAgreed: profile.noSmokingAgreed,
  comments: profile.comments,
  updatedAt: profile.updatedAt,
  createdAt: profile.createdAt,
}

/** Lists only active profiles; a soft-deleted profile (DD-011) is invisible to its own owner. */
export async function findByUserId(db: SchoolDb, userId: string): Promise<Profile[]> {
  return db.query.profile.findMany({
    where: (t, { and, eq, isNull }) => and(eq(t.userId, userId), isNull(t.deletedAt)),
    columns: { deletedAt: false },
  })
}

export async function findById(db: SchoolDb, id: string): Promise<Profile | undefined> {
  return db.query.profile.findFirst({
    where: (t, { and, eq, isNull }) => and(eq(t.id, id), isNull(t.deletedAt)),
    columns: { deletedAt: false },
  })
}

/**
 * Backs both the admin "enroll a student" search and the command-palette global search
 * (`search/service.ts`) — the only two reasons to search across more than one's own profile
 * (`findByUserId`). `excludeBatchId` filters out profiles who already hold a *live* (`'active'`)
 * seat in that batch at the query level, so `SEARCH_LIMIT` still returns useful candidates rather
 * than being eaten by already-enrolled matches — a profile on a break there
 * (`enrollment/service.ts::putOnBreak`) is deliberately left findable, since `enroll`'s own
 * conflict check (`enrollment/service.ts::enroll`) reactivates a non-active row instead of
 * rejecting it, and an admin can't do that for someone this search hides from them.
 *
 * `scope` reuses `AccessPolicy#getBatchVisibility`'s vocabulary rather than inventing a parallel
 * one: an admin (`{kind: 'all'}`) can search every profile in the school, exactly like they can
 * list every batch; anyone else (`{kind: 'enrolled', profileId}`) can only search profiles who
 * share at least one *live* batch with them — the same roster a batch's own `GET /batches/:id`
 * already shows to every member of it (every batch role holds `enrollment:read`), so this isn't a
 * new disclosure, just the same information reachable a second way.
 */
export async function search(
  db: SchoolDb,
  options: SearchProfilesQuery,
  scope: BatchReadScope,
): Promise<Profile[]> {
  return db.query.profile.findMany({
    where: (t, { and, isNull: isNullCol }) => {
      const conditions = [isNullCol(t.deletedAt)]
      if (options.query) {
        const match = tokenMatch(options.query, [t.name])
        if (match) conditions.push(match)
      }

      if (options.excludeBatchId) {
        conditions.push(
          notInArray(
            t.id,
            db
              .select({ profileId: enrollment.profileId })
              .from(enrollment)
              .where(
                and(
                  eq(enrollment.batchId, options.excludeBatchId),
                  eq(enrollment.status, 'active'),
                ),
              ),
          ),
        )
      }

      if (scope.kind === 'enrolled') {
        conditions.push(
          inArray(
            t.id,
            db
              .select({ profileId: enrollment.profileId })
              .from(enrollment)
              .where(
                inArray(
                  enrollment.batchId,
                  db
                    .select({ batchId: enrollment.batchId })
                    .from(enrollment)
                    .where(
                      and(
                        eq(enrollment.profileId, scope.profileId),
                        eq(enrollment.status, 'active'),
                      ),
                    ),
                ),
              ),
          ),
        )
      }

      return and(...conditions)
    },
    orderBy: (t, { asc }) => asc(t.name),
    limit: SEARCH_LIMIT,
    columns: { deletedAt: false },
  })
}

/** Public-schema lookup: does `userId` have any organization membership at all? */
export async function findMembership(
  db: PublicDb,
  organizationId: string,
  userId: string,
): Promise<{ id: string } | undefined> {
  return db.query.member.findFirst({
    where: (t, { and, eq }) => and(eq(t.organizationId, organizationId), eq(t.userId, userId)),
    columns: { id: true },
  })
}

// The registration-derived fields (see `ProfileSchema`'s own doc comment) are always optional here
// — `registrations/service.ts::provisionApprovedApplicant` passes them all, while the plain
// self-serve `createProfile` (no registration behind it) passes none and leaves them at their
// column defaults.
type ProfileRegistrationFields = Partial<
  Omit<Profile, 'id' | 'userId' | 'name' | 'phone' | 'city' | 'updatedAt' | 'createdAt'>
>

export async function insert(
  db: SchoolDb,
  values: CreateProfileData & {
    userId: string
    phone: string | null
    city: string | null
  } & ProfileRegistrationFields,
): Promise<Profile | undefined> {
  const rows = await db.insert(profile).values(values).returning(profileColumns)
  return rows.at(0)
}

/**
 * The current city/state/country for an owned profile, read before an update that touches any of
 * them — `service.ts::updateProfile` needs the *effective* (patch-merged-onto-current) location to
 * re-derive `countryTimeZone` even when a patch only changes one of the three fields. The `userId`
 * predicate enforces ownership on this read too, consistent with `updateOwned` below: a
 * foreign-owned profile matches zero rows rather than leaking its location to the caller.
 */
export async function findOwnedLocationFields(
  db: SchoolDb,
  id: string,
  userId: string,
): Promise<{ city: string | null; state: string | null; country: string | null } | undefined> {
  return db.query.profile.findFirst({
    where: (t, { and, eq }) => and(eq(t.id, id), eq(t.userId, userId)),
    columns: { city: true, state: true, country: true },
  })
}

/**
 * The `userId` predicate enforces ownership in SQL; a foreign-owned profile matches zero rows
 * rather than being fetched and checked afterward. Accepts `countryTimeZone` on top of
 * `UpdateProfileData`'s own fields — that column is never client-writable (see
 * `UpdateProfileSchema`'s doc comment), but `service.ts::updateProfile` re-derives and includes it
 * server-side whenever the location changes.
 */
export async function updateOwned(
  db: SchoolDb,
  id: string,
  userId: string,
  data: UpdateProfileData & { countryTimeZone?: string | null },
): Promise<Profile | undefined> {
  const rows = await db
    .update(profile)
    .set(data)
    .where(and(eq(profile.id, id), eq(profile.userId, userId)))
    .returning(profileColumns)

  return rows.at(0)
}

/**
 * Deactivates an owned profile (DD-011): stamps `deletedAt` only. Every other column — name,
 * phone, city — and every `enrollment`/`exam`/`evaluation` row referencing this profile stay
 * exactly as they were, so historical queries ("which batches was this user in", "what did they
 * score there") keep working after deactivation. The `deletedAt IS NULL` predicate makes a
 * repeat call match zero rows, so the service's 404 covers missing, foreign-owned, and
 * already-deactivated alike.
 */
export async function softDeleteOwned(
  db: SchoolDb,
  id: string,
  userId: string,
): Promise<{ id: string }[]> {
  return db
    .update(profile)
    .set({ deletedAt: new Date() })
    .where(and(eq(profile.id, id), eq(profile.userId, userId), isNull(profile.deletedAt)))
    .returning({ id: profile.id })
}

/**
 * Admin-deactivation (DD-011 §9): identical to `softDeleteOwned` minus the `userId` predicate,
 * since here the actor is a school admin acting on someone else's profile, not the owner. The
 * `deletedAt IS NULL` predicate keeps the same idempotent-safe contract — a repeat call or an
 * unknown id both match zero rows.
 */
export async function softDeleteById(db: SchoolDb, id: string): Promise<{ id: string }[]> {
  return db
    .update(profile)
    .set({ deletedAt: new Date() })
    .where(and(eq(profile.id, id), isNull(profile.deletedAt)))
    .returning({ id: profile.id })
}
