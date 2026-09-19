import type { BetterAuthOptions } from 'better-auth'

/**
 * better-auth's `advanced` option for sharing the login across every course address
 * (vedam.slmts.naradas.app, smartam.slmts.naradas.app, ...). `domain` is the parent domain with a
 * leading dot; without it the session cookie stays host-only — one login per address — which is
 * what local dev, Vercel preview URLs and any single-host deployment want.
 */
export function advancedOptions(cookieDomain: string | undefined): BetterAuthOptions['advanced'] {
  if (!cookieDomain) {
    return undefined
  }

  return { crossSubDomainCookies: { enabled: true, domain: cookieDomain } }
}
