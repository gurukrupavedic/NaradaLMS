import type { Request, Response } from 'express'
import { describe, expect, it } from 'vitest'

import { AppError } from './error'
import { schoolRoute } from './naradaRoute'

/**
 * Exercises `naradaRoute.ts`'s private `resolveSchool` indirectly through the exported
 * `schoolRoute` wrapper (matrix item 10) — `resolveSchool` itself isn't exported, and exporting it
 * just for this test is unnecessary when `schoolRoute` already gives full black-box coverage of
 * its behavior. No HTTP server is needed: `schoolRoute` returns a plain
 * `(req, res) => Promise<void>` we can call directly with a minimal stub `Request`.
 */
function stubRequest(headers: Record<string, string | undefined>): Request {
  return {
    get: (name: string) => headers[name.toLowerCase()],
    headers,
  } as unknown as Request
}

const stubResponse = {} as Response
const noopNext = () => {}

describe('schoolRoute / resolveSchool (matrix item 10)', () => {
  it('rejects a missing X-School-Slug header with a 400 badRequest', async () => {
    const handler = schoolRoute(async () => {
      throw new Error('handler should not run when school resolution fails')
    })

    let caught: unknown
    try {
      await handler(stubRequest({}), stubResponse, noopNext)
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(AppError)
    expect((caught as AppError).statusCode).toBe(400)
    expect((caught as AppError).message).toMatch(/X-School-Slug/i)
  })

  it('rejects an unknown school slug with a 404 notFound ("school not found") — a 404, not a 400', async () => {
    const handler = schoolRoute(async () => {
      throw new Error('handler should not run when school resolution fails')
    })

    let caught: unknown
    try {
      await handler(
        stubRequest({ 'x-school-slug': `no-such-school-${crypto.randomUUID()}` }),
        stubResponse,
        noopNext,
      )
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(AppError)
    expect((caught as AppError).statusCode).toBe(404)
    expect((caught as AppError).message).toMatch(/school not found/i)
  })
})
