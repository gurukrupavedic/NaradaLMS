/**
 * Which school a tab is on, read from the address: `slmts.naradas.app` is the `slmts` school,
 * `rr.naradas.app` is `rr`. One deployment serves every school, so the school can't be baked in at
 * build time (a `NEXT_PUBLIC_*` value is inlined into the bundle) — it is whatever the tab's host says.
 *
 * Pure and dependency-free (no `window`, no Next) so the API client and the tests share it.
 */

/** The apex domain schools are subdomains of. */
export const SCHOOL_ROOT_DOMAIN = 'naradas.app'

/** Subdomains that are never a school, so `www.naradas.app` can't be mistaken for one. */
const NON_SCHOOL_SUBDOMAINS: readonly string[] = ['www']

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * The school a hostname names, or `null` when it names none: the bare apex, `localhost`, a
 * `*.vercel.app` preview, an ngrok tunnel. Only a single label directly under the root domain
 * counts — `a.b.naradas.app` is not school `a` — except that one leading `www.` is ignored, so
 * `www.rr.naradas.app` is the same school as `rr.naradas.app`.
 */
export function schoolFromHostname(hostname: string): string | null {
  const host = hostname.toLowerCase().replace(/^www\./, '')
  const suffix = `.${SCHOOL_ROOT_DOMAIN}`
  if (!host.endsWith(suffix)) return null

  const label = host.slice(0, -suffix.length)
  if (!SLUG.test(label) || NON_SCHOOL_SUBDOMAINS.includes(label)) return null
  return label
}

/**
 * The school for a hostname: what the address says, else `fallback` — `NEXT_PUBLIC_SCHOOL_SLUG`, which
 * is how local dev, previews and tunnels (no school subdomain) pick one. `null` when neither names one.
 */
export function resolveSchoolSlug(hostname: string, fallback: string | undefined): string | null {
  return schoolFromHostname(hostname) ?? (fallback || null)
}
