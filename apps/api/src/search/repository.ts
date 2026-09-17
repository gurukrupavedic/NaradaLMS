import { and, eq, inArray } from 'drizzle-orm'

import { batch, chapter, enrollment, registration, track, type SchoolDb } from '@narada/db'

import type { BatchReadScope, ContentReadView } from '../utils/accessPolicy'
import { tokenMatch } from '../utils/search'

// Small and fixed rather than paginated — this backs a command palette, not a list screen; a
// query with more than a handful of matches per category is a query the reader should narrow, not
// one that needs a "load more".
const RESULT_LIMIT = 6

export type BatchSearchRow = {
  id: string
  code: string
  track: { name: string }
}

/**
 * `scope` mirrors `AccessPolicy#getBatchVisibility`: an admin (`{kind: 'all'}`) can match any
 * batch by code, exactly as `GET /batches` lists every batch for them; anyone else
 * (`{kind: 'enrolled', profileId}`) can only match a batch they hold a live seat in — the same
 * scoping `GET /batches` itself already applies, so search surfaces nothing a member couldn't
 * already find by browsing.
 */
export async function searchBatches(
  db: SchoolDb,
  q: string,
  scope: BatchReadScope,
): Promise<BatchSearchRow[]> {
  return db.query.batch.findMany({
    where: and(
      tokenMatch(q, [batch.code]),
      scope.kind === 'enrolled'
        ? inArray(
            batch.id,
            db
              .select({ batchId: enrollment.batchId })
              .from(enrollment)
              .where(
                and(eq(enrollment.profileId, scope.profileId), eq(enrollment.status, 'active')),
              ),
          )
        : undefined,
    ),
    columns: { id: true, code: true },
    with: { track: { columns: { name: true } } },
    orderBy: (t, { asc }) => asc(t.code),
    limit: RESULT_LIMIT,
  })
}

export type TrackSearchRow = { id: string; name: string }

// Unscoped — a track's name isn't secret (every signed-in member's own dashboard already lists
// every track in the school, enrolled or not; only a track's *unpublished chapters* are hidden,
// which `searchChapters` below handles), so there's no per-caller visibility question here.
export async function searchTracks(db: SchoolDb, q: string): Promise<TrackSearchRow[]> {
  return db.query.track.findMany({
    where: tokenMatch(q, [track.name]),
    columns: { id: true, name: true },
    orderBy: (t, { asc }) => asc(t.name),
    limit: RESULT_LIMIT,
  })
}

export type ChapterSearchRow = {
  id: string
  code: string
  title: string
  track: { name: string }
}

/**
 * Archived is invisible in every view (see `chapters/repository.ts`'s own doc comment on the same
 * rule) — a hidden chapter has no screen left to land on, so it's excluded here too. `view`
 * mirrors `chapters/repository.ts::findAll`'s own filter exactly: an authoring view (content:update
 * — owner/admin) sees draft and published chapters alike; a learner-preview view (every other
 * school member) only ever matches a published one.
 */
export async function searchChapters(
  db: SchoolDb,
  q: string,
  view: ContentReadView,
): Promise<ChapterSearchRow[]> {
  return db.query.chapter.findMany({
    where: and(
      eq(chapter.archived, false),
      view.kind === 'authoring' ? undefined : eq(chapter.status, 'published'),
      tokenMatch(q, [chapter.title, chapter.code]),
    ),
    columns: { id: true, code: true, title: true },
    with: { track: { columns: { name: true } } },
    orderBy: (t, { asc }) => asc(t.title),
    limit: RESULT_LIMIT,
  })
}

export type RegistrationSearchRow = {
  id: string
  firstName: string
  lastName: string
  status: string
  city: string | null
}

// No scope parameter — a prospective student's application is never visible to anyone but a
// school admin (`AccessPolicy#requireCanReviewRegistrations`'s own doc comment), so
// `search/service.ts` simply never calls this for a non-admin caller rather than this function
// having to re-derive that boundary itself.
export async function searchRegistrations(
  db: SchoolDb,
  q: string,
): Promise<RegistrationSearchRow[]> {
  return db.query.registration.findMany({
    where: tokenMatch(q, [
      registration.firstName,
      registration.lastName,
      registration.email,
      registration.phone,
    ]),
    columns: { id: true, firstName: true, lastName: true, status: true, city: true },
    orderBy: (t, { desc }) => desc(t.createdAt),
    limit: RESULT_LIMIT,
  })
}
