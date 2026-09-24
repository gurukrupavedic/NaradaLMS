import { and, ilike, or, type Column, type SQL } from 'drizzle-orm'

/**
 * Splits `query` on whitespace and requires every token to match, case-insensitively, somewhere
 * across `columns` — each token is OR'd across the columns, and the per-token results are AND'd
 * together. A single-token query (the common case) reduces to a plain `ilike` over these columns,
 * so this is a drop-in replacement for that.
 *
 * A single literal `ilike(column, '%' + query + '%')` only matches when the query is a contiguous
 * substring of the target text in the same order it was typed — a track literally named "Track 1"
 * never matches a search for "1 track", even though every word the reader typed is right there.
 * Splitting into tokens and requiring each one to appear (in any order, anywhere across the
 * relevant columns) is what actual multi-word search means to someone typing into a box, and is
 * exactly what a plain `ilike` doesn't give you.
 */
export function tokenMatch(query: string, columns: Column[]): SQL | undefined {
  const tokens = query.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0 || columns.length === 0) {
    return undefined
  }

  return and(...tokens.map(token => or(...columns.map(column => ilike(column, `%${escapeLike(token)}%`)))))
}

/** Escapes `\`, `%` and `_` so a user's search text is matched literally rather than as `LIKE` wildcards. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}
