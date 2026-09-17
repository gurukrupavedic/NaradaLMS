import { and, eq } from 'drizzle-orm'

import { batch, chapter, registration, track, type SchoolDb } from '@narada/db'

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

export async function searchBatches(db: SchoolDb, q: string): Promise<BatchSearchRow[]> {
  return db.query.batch.findMany({
    where: tokenMatch(q, [batch.code]),
    columns: { id: true, code: true },
    with: { track: { columns: { name: true } } },
    orderBy: (t, { asc }) => asc(t.code),
    limit: RESULT_LIMIT,
  })
}

export type TrackSearchRow = { id: string; name: string }

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

// Archived is invisible in every view (see `chapters/repository.ts`'s own doc comment on the
// same rule) — a hidden chapter has no admin screen left to land on, so it's excluded here too,
// not just from the student-facing catalog. Draft chapters stay findable: an admin authoring one
// is exactly who this search is for.
export async function searchChapters(db: SchoolDb, q: string): Promise<ChapterSearchRow[]> {
  return db.query.chapter.findMany({
    where: and(eq(chapter.archived, false), tokenMatch(q, [chapter.title, chapter.code])),
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
