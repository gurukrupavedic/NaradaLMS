import * as z from 'zod'

export type SearchQuery = z.infer<typeof SearchQuerySchema>
export const SearchQuerySchema = z.object({
  q: z.string().trim().min(1),
})

export const searchResultKindSchema = z.enum([
  'student',
  'batch',
  'track',
  'chapter',
  'registration',
])

// A flat shape across every kind rather than a discriminated union — the command palette that
// consumes this only ever needs to render a row and build a route from it, and `code` is the only
// field that varies by kind (populated for batch/chapter, since those are the two entities this
// app links to by code rather than id — see `apps/web`'s `/admin/batches/[batchCode]` and
// `/chapters/[chapterId]` routes).
export type SearchResult = z.infer<typeof SearchResultSchema>
export const SearchResultSchema = z.object({
  kind: searchResultKindSchema,
  id: z.uuid(),
  code: z.string().nullable(),
  title: z.string(),
  subtitle: z.string().nullable(),
})
