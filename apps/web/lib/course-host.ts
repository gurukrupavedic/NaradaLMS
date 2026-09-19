/**
 * Which course a hostname is for. A course lives at `<course>.<base domain>` —
 * `vedam.slmts.naradas.app` for the base domain `slmts.naradas.app` — and this is the one place
 * that reads that convention, so the proxy (server) and the header (browser) can't drift.
 *
 * Deliberately strict: exactly one DNS label in front of the base domain, lower-cased, and nothing
 * else counts. The proxy turns the result into a header the API trusts as "the course this page is
 * for", so a hostname that merely *contains* the base domain (`evil.com/slmts.naradas.app`,
 * `a.b.slmts.naradas.app`) or the bare base domain itself is no course at all.
 *
 * Pure and dependency-free on purpose: no env, no `window`, so it runs anywhere and is unit-tested.
 */

const DNS_LABEL = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

function normalise(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, '')
}

/** `vedam` for `vedam.slmts.naradas.app` (base `slmts.naradas.app`); `undefined` for anything else, including no base domain being configured. */
export function courseSlugFromHost(
  host: string,
  baseDomain: string | undefined,
): string | undefined {
  const base = baseDomain ? normalise(baseDomain).replace(/^\./, '') : ''
  if (!base) return undefined

  const hostname = normalise(host)
  const suffix = `.${base}`
  if (!hostname.endsWith(suffix)) return undefined

  const label = hostname.slice(0, -suffix.length)
  return DNS_LABEL.test(label) ? label : undefined
}

/**
 * The `Domain` to put on a cookie that should be shared by every course address (`.slmts.naradas.app`),
 * or `undefined` when this host is outside that domain — local dev, a Vercel preview — where the
 * browser would reject a foreign Domain outright and the cookie must stay host-only.
 */
export function cookieDomainFor(host: string, baseDomain: string | undefined): string | undefined {
  const base = baseDomain ? normalise(baseDomain).replace(/^\./, '') : ''
  if (!base) return undefined

  const hostname = normalise(host)
  return hostname === base || hostname.endsWith(`.${base}`) ? `.${base}` : undefined
}

/** Where another course lives, keeping the current protocol and port (so it works in dev on `vedam.localhost:3001` too). `undefined` outside the course domain. */
export function courseOrigin(
  current: { protocol: string; hostname: string; port: string },
  slug: string,
  baseDomain: string | undefined,
): string | undefined {
  if (
    !courseSlugFromHost(current.hostname, baseDomain) &&
    cookieDomainFor(current.hostname, baseDomain) === undefined
  ) {
    return undefined
  }

  const base = baseDomain ? normalise(baseDomain).replace(/^\./, '') : ''
  const port = current.port ? `:${current.port}` : ''
  return `${current.protocol}//${slug}.${base}${port}`
}
