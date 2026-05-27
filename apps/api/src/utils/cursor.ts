import { z } from 'zod'

export function encodeCursor(data: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url')
}

function decodeCursor(cursor: string): unknown {
  return JSON.parse(Buffer.from(cursor, 'base64url').toString())
}

/**
 * A schema factory that converts an existing Zod schema into one
 * capable of decoding base64-encoded JSON cursors.
 */
export function asCursor<T>(schema: z.ZodType<T>) {
  return z.string().transform((cursor, ctx) => {
    try {
      const result = schema.safeParse(decodeCursor(cursor))
      if (!result.success) {
        ctx.addIssue({ code: 'custom', message: 'invalid cursor' })
        return z.NEVER
      }

      return result.data
    } catch {
      ctx.addIssue({ code: 'custom', message: 'invalid cursor' })
      return z.NEVER
    }
  })
}

export function compoundCursor<T extends z.ZodRawShape>(shape: T) {
  return asCursor(z.object(shape))
}

export function paginateResponse<T>(
  items: T[],
  limit: number,
  getCursor: (item: T) => Record<string, unknown>,
): { items: T[]; nextCursor: string | null } {
  const hasMore = items.length > limit
  const page = hasMore ? items.slice(0, limit) : items
  const nextCursor = hasMore ? encodeCursor(getCursor(page[page.length - 1])) : null
  return { items: page, nextCursor }
}

export function dateCursorField() {
  return z.coerce.date()
}

export function nullableDateCursorField() {
  return z.coerce.date().nullable()
}
