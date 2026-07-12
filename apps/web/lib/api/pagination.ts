import 'server-only'

import type { ApiPage } from '@/lib/types'

export async function fetchAllPages<T>(
  fetchPage: (cursor?: string) => Promise<ApiPage<T>>,
): Promise<T[]> {
  const items: T[] = []
  let cursor: string | undefined

  do {
    const page = await fetchPage(cursor)
    items.push(...page.items)
    cursor = page.nextCursor ?? undefined
  } while (cursor)

  return items
}
