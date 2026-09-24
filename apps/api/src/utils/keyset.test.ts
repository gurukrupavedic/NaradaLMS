import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { describe, expect, it, vi, type Mock } from 'vitest'

import { findNullsLastPage } from './keyset'

const item = pgTable('item', { id: text('id').primaryKey(), startedAt: timestamp('startedAt') })

type Fetch = Mock<
  (query: { where: unknown; orderBy: unknown[]; limit: number }) => Promise<{ id: string }[]>
>

function page(fetch: Fetch, cursor?: { sortValue: unknown; id: string }, limit = 2) {
  return findNullsLastPage({
    sortColumn: item.startedAt,
    idColumn: item.id,
    idOrder: 'asc',
    conditions: [],
    cursor,
    limit,
    fetch,
  })
}

describe('findNullsLastPage', () => {
  it('does not touch the null phase when the dated rows already fill the page', async () => {
    const fetch: Fetch = vi.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }])

    const rows = await page(fetch)

    expect(rows).toHaveLength(3)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0]![0]).toMatchObject({ limit: 3 })
  })

  it('tops a short page up from the null rows, asking only for what is left', async () => {
    const fetch: Fetch = vi
      .fn()
      .mockResolvedValueOnce([{ id: 'a' }])
      .mockResolvedValueOnce([{ id: 'n1' }, { id: 'n2' }])

    const rows = await page(fetch)

    expect(rows).toEqual([{ id: 'a' }, { id: 'n1' }, { id: 'n2' }])
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls[1]![0]).toMatchObject({ limit: 2 })
  })

  it('goes straight to the null phase once the cursor is on a null sort value', async () => {
    const fetch: Fetch = vi.fn().mockResolvedValue([{ id: 'n3' }])

    await page(fetch, { sortValue: null, id: 'n2' })

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0]![0]).toMatchObject({ limit: 3 })
    expect(fetch.mock.calls[0]![0].orderBy).toHaveLength(1)
  })
})
