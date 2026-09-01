import type { Request } from 'express'
import { describe, expect, it } from 'vitest'

import { createSendOtpRateLimit, isTrustedOrigin, sendOtpRateLimitKey } from './serverSecurity'

describe('isTrustedOrigin', () => {
  it('matches an exact, glob-free entry', () => {
    expect(isTrustedOrigin('https://app.example.com', ['https://app.example.com'])).toBe(true)
    expect(isTrustedOrigin('https://other.example.com', ['https://app.example.com'])).toBe(false)
  })

  it('matches a "*" glob entry, e.g. Vercel preview deployments', () => {
    const trustedOrigins = ['https://web-*-gurukrupa-vedic.vercel.app']
    expect(isTrustedOrigin('https://web-abc123-gurukrupa-vedic.vercel.app', trustedOrigins)).toBe(true)
    expect(isTrustedOrigin('https://web--gurukrupa-vedic.vercel.app', trustedOrigins)).toBe(true)
    expect(isTrustedOrigin('https://evil.com', trustedOrigins)).toBe(false)
  })

  it('anchors the glob so a suffix/prefix cannot sneak past it', () => {
    const trustedOrigins = ['https://web-*-gurukrupa-vedic.vercel.app']
    expect(isTrustedOrigin('https://web-abc-gurukrupa-vedic.vercel.app.evil.com', trustedOrigins)).toBe(false)
    expect(isTrustedOrigin('evil.comhttps://web-abc-gurukrupa-vedic.vercel.app', trustedOrigins)).toBe(false)
  })

  it('escapes regex metacharacters in the non-glob portion of a pattern', () => {
    // A literal "." must not act as a regex wildcard once the pattern is compiled.
    expect(isTrustedOrigin('https://appXexample.com', ['https://app.example.com'])).toBe(false)
    expect(isTrustedOrigin('https://app.example.com', ['https://app.example.com'])).toBe(true)
  })

  it('rejects when no configured origin matches at all', () => {
    expect(isTrustedOrigin('https://app.example.com', [])).toBe(false)
  })
})

describe('sendOtpRateLimitKey', () => {
  function stubRequest(overrides: { body?: unknown; ip?: string }): Request {
    return { body: overrides.body, ip: overrides.ip } as unknown as Request
  }

  it('keys by the exact phone number string when present', () => {
    expect(sendOtpRateLimitKey(stubRequest({ body: { phoneNumber: '+15551234567' } }))).toBe(
      '+15551234567',
    )
  })

  it('falls back to a normalized IP key when phoneNumber is missing', () => {
    expect(sendOtpRateLimitKey(stubRequest({ body: {}, ip: '203.0.113.5' }))).toBe('203.0.113.5')
  })

  it('falls back to IP when phoneNumber is present but not a string', () => {
    expect(sendOtpRateLimitKey(stubRequest({ body: { phoneNumber: 12345 }, ip: '203.0.113.5' }))).toBe(
      '203.0.113.5',
    )
  })

  it('falls back to IP when body is entirely absent', () => {
    expect(sendOtpRateLimitKey(stubRequest({ body: undefined, ip: '203.0.113.5' }))).toBe('203.0.113.5')
  })

  it('two different IPs sending the same phone number share one limit key', () => {
    const keyA = sendOtpRateLimitKey(stubRequest({ body: { phoneNumber: '+15551234567' }, ip: '1.1.1.1' }))
    const keyB = sendOtpRateLimitKey(stubRequest({ body: { phoneNumber: '+15551234567' }, ip: '2.2.2.2' }))
    expect(keyA).toBe(keyB)
  })
})

describe('the send-OTP rate limiter (3 per 10 minutes, keyed by phone)', () => {
  /** Drives an express-rate-limit middleware directly, without a full server. */
  function runMiddleware(
    middleware: ReturnType<typeof createSendOtpRateLimit>,
    req: Request,
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      let statusCode = 200
      const res = {
        setHeader: () => res,
        getHeader: () => undefined,
        removeHeader: () => res,
        append: () => res,
        status(code: number) {
          statusCode = code
          return res
        },
        send: () => resolve(statusCode),
        json: () => resolve(statusCode),
        end: () => resolve(statusCode),
      }

      // A `next(error)` call (as opposed to a plain `next()` continuing the chain) must fail the
      // test loudly rather than silently resolving 200 — that would make every assertion here
      // vacuously true regardless of what the middleware actually decided.
      middleware(req, res as never, (error?: unknown) => (error ? reject(error) : resolve(statusCode)))
    })
  }

  function stubRequest(phoneNumber: string): Request {
    return { body: { phoneNumber }, ip: '203.0.113.9' } as unknown as Request
  }

  it('allows the first 3 requests for a phone number and blocks the 4th with 429', async () => {
    const middleware = createSendOtpRateLimit()
    const phone = `+1555${Date.now()}`

    expect(await runMiddleware(middleware, stubRequest(phone))).toBe(200)
    expect(await runMiddleware(middleware, stubRequest(phone))).toBe(200)
    expect(await runMiddleware(middleware, stubRequest(phone))).toBe(200)
    expect(await runMiddleware(middleware, stubRequest(phone))).toBe(429)
  })

  it('tracks separate phone numbers independently — one number hitting the limit does not affect another', async () => {
    const middleware = createSendOtpRateLimit()
    const phoneA = `+1555a${Date.now()}`
    const phoneB = `+1555b${Date.now()}`

    await runMiddleware(middleware, stubRequest(phoneA))
    await runMiddleware(middleware, stubRequest(phoneA))
    await runMiddleware(middleware, stubRequest(phoneA))
    expect(await runMiddleware(middleware, stubRequest(phoneA))).toBe(429)

    expect(await runMiddleware(middleware, stubRequest(phoneB))).toBe(200)
  })
})
