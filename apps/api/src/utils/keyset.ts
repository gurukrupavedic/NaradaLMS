import {
  and,
  asc,
  desc,
  eq,
  gt,
  isNotNull,
  isNull,
  lt,
  or,
  sql,
  type AnyColumn,
  type SQL,
} from 'drizzle-orm'

type Direction = 'asc' | 'desc'

/**
 * The `WHERE` half of keyset pagination: rows strictly after `cursor` in `(sortColumn, idColumn)`
 * order, where `order` gives each column's direction. Ties on the sort column fall through to the id.
 */
export function keysetAfter(
  sortColumn: AnyColumn,
  idColumn: AnyColumn,
  cursor: { sortValue: unknown; id: string },
  order: { sort: Direction; id: Direction },
): SQL {
  const pastSort = order.sort === 'asc' ? gt : lt
  const pastId = order.id === 'asc' ? gt : lt
  // `or()` is only typed as possibly-undefined for a zero-argument call.
  return or(
    pastSort(sortColumn, cursor.sortValue),
    and(eq(sortColumn, cursor.sortValue), pastId(idColumn, cursor.id)),
  )!
}

type NullsLastQuery = { where: SQL | undefined; orderBy: SQL[]; limit: number }

/**
 * One page (up to `limit + 1` rows, ready for `paginateResponse`) of a list ordered
 * `(sortColumn desc nulls last, idColumn <idOrder>)` — for a nullable sort column, which one
 * keyset comparison can't express: nulls compare as neither less nor greater. So it's two phases,
 * the non-null rows first, topped up from the null rows, which are themselves ordered by id alone.
 * A cursor whose `sortValue` is `null` has already entered the second phase.
 *
 * `fetch` runs the caller's own query with the `where`/`orderBy`/`limit` it's handed, so each
 * domain keeps its own table, relations and row shape.
 */
export async function findNullsLastPage<T>({
  sortColumn,
  idColumn,
  idOrder,
  conditions,
  cursor,
  limit,
  fetch,
}: {
  sortColumn: AnyColumn
  idColumn: AnyColumn
  idOrder: Direction
  conditions: SQL[]
  cursor: { sortValue: unknown; id: string } | undefined
  limit: number
  fetch: (query: NullsLastQuery) => Promise<T[]>
}): Promise<T[]> {
  const idAsc = idOrder === 'asc'
  const nullPhase = (extra: SQL[], take: number) =>
    fetch({
      where: and(...conditions, isNull(sortColumn), ...extra),
      orderBy: [idAsc ? asc(idColumn) : desc(idColumn)],
      limit: take,
    })

  if (cursor && cursor.sortValue === null) {
    return nullPhase([(idAsc ? gt : lt)(idColumn, cursor.id)], limit + 1)
  }

  const nonNullConditions = [...conditions, isNotNull(sortColumn)]
  if (cursor) {
    nonNullConditions.push(keysetAfter(sortColumn, idColumn, cursor, { sort: 'desc', id: idOrder }))
  }

  const rows = await fetch({
    where: and(...nonNullConditions),
    orderBy: [sql`${sortColumn} desc nulls last`, idAsc ? asc(idColumn) : desc(idColumn)],
    limit: limit + 1,
  })

  if (rows.length <= limit) {
    rows.push(...(await nullPhase([], limit + 1 - rows.length)))
  }

  return rows
}
