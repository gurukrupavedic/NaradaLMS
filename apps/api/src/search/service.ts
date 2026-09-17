import type { organization, SchoolDbClient } from '@narada/db'

import type { User } from '../session'
import { searchProfiles } from '../profiles/service'
import * as repository from './repository'
import type { SearchQuery, SearchResult } from './schema'

type School = typeof organization.$inferSelect

type SearchServiceContext = { db: SchoolDbClient; school: School; user: User }

// Matches `repository.ts`'s own per-category cap — `searchProfiles` doesn't take a limit (its
// `SEARCH_LIMIT` is 25, tuned for the "enroll a student" flow's own bigger candidate list), so this
// is where the command palette's tighter per-category cap is actually enforced for students.
const RESULT_LIMIT = 6

/**
 * Fans out across every entity the command palette can jump to, in parallel — one round trip from
 * the caller's perspective instead of five. Each category is capped independently
 * (`repository.ts`'s `RESULT_LIMIT` / this file's own `RESULT_LIMIT`), so a query that's popular
 * across categories (e.g. a common first name) doesn't let one category crowd out the rest.
 */
export async function search(
  context: SearchServiceContext,
  query: SearchQuery,
): Promise<SearchResult[]> {
  const [students, batches, tracks, chapters, registrations] = await Promise.all([
    searchProfiles(context, { query: query.q }),
    repository.searchBatches(context.db, query.q),
    repository.searchTracks(context.db, query.q),
    repository.searchChapters(context.db, query.q),
    repository.searchRegistrations(context.db, query.q),
  ])

  return [
    ...students.slice(0, RESULT_LIMIT).map(
      (profile): SearchResult => ({
        kind: 'student',
        id: profile.id,
        code: null,
        title: profile.name,
        subtitle: profile.city,
      }),
    ),
    ...batches.map(
      (row): SearchResult => ({
        kind: 'batch',
        id: row.id,
        code: row.code,
        title: row.code,
        subtitle: row.track.name,
      }),
    ),
    ...tracks.map(
      (row): SearchResult => ({
        kind: 'track',
        id: row.id,
        code: null,
        title: row.name,
        subtitle: null,
      }),
    ),
    ...chapters.map(
      (row): SearchResult => ({
        kind: 'chapter',
        id: row.id,
        code: row.code,
        title: row.title,
        subtitle: row.track.name,
      }),
    ),
    ...registrations.map(
      (row): SearchResult => ({
        kind: 'registration',
        id: row.id,
        code: null,
        title: `${row.firstName} ${row.lastName}`,
        subtitle: row.status,
      }),
    ),
  ]
}
