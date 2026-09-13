import { z } from 'zod'

export function asCursor<T extends z.ZodObject>(schema: T) {
  return z
    .string()
    .transform((cursor, ctx) => {
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
    .optional()
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

function encodeCursor(data: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url')
}

function decodeCursor(cursor: string): unknown {
  return JSON.parse(Buffer.from(cursor, 'base64url').toString())
}
