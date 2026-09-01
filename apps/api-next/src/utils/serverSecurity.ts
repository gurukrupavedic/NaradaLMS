import type { Request } from 'express'
import { ipKeyGenerator, rateLimit } from 'express-rate-limit'

/**
 * `TRUSTED_ORIGINS` entries may contain "*" to match Vercel preview deployments (e.g.
 * "https://web-*-gurukrupa-vedic.vercel.app"), so an origin is matched against each entry as a
 * glob rather than with a plain array (which the `cors` package only matches exactly). Takes the
 * trusted-origin list as a parameter, rather than reading `@narada/env` directly, so this stays
 * pure and unit-testable without pulling in real env validation.
 */
export function isTrustedOrigin(origin: string, trustedOrigins: readonly string[]): boolean {
  return trustedOrigins.some(pattern => {
    if (!pattern.includes('*')) return pattern === origin
    const regex = new RegExp(`^${pattern.split('*').map(escapeRegExp).join('.*')}$`)
    return regex.test(origin)
  })
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Sending a Twilio Verify OTP costs money per message, so IP-based limiting alone isn't enough —
// an attacker can rotate IPs but not phone numbers. Keyed by the phone number in the request body
// (falling back to IP if it's missing/malformed) so repeated sends to the same number are capped
// regardless of source IP.
export function sendOtpRateLimitKey(req: Request): string {
  const phoneNumber = req.body?.phoneNumber
  return typeof phoneNumber === 'string' ? phoneNumber : ipKeyGenerator(req.ip ?? '')
}

/** Factory (not a shared singleton) so tests can exercise a fresh, isolated limit window. */
export function createSendOtpRateLimit() {
  return rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 3,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: sendOtpRateLimitKey,
  })
}
