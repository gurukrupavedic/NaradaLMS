/**
 * Where a course lives in the URL: `slmts.naradas.app/<course>/<route…>` — the school comes from the
 * address (Vercel routes `slmts.naradas.app` to this app), and the course is always the first path
 * segment after it, `/vedam/dashboard`, `/vedam/admin/batches`, `/vedam/register`.
 *
 * The URL is the *only* place the course lives, so a tab can never be in a different course from the
 * one it shows: no cookie, no shared state, nothing to drift. The API client derives `x-course-slug`
 * from it on every request (`lib/api/client.ts`).
 *
 * Pure and dependency-free (no `window`, no Next) so the proxy, the client and the tests share it.
 */

/**
 * Top-level paths that are NOT a course. A course slug can't be one of these (the database refuses it:
 * `packages/db/src/courseSlug.ts`), which is what keeps `/login` and `/vedam` from ever colliding.
 * `course-path.test.ts` checks this list against that one and against the routes under `app/`, so a new
 * top-level route can't be added without reserving its word.
 */
export const RESERVED_TOP_LEVEL_SEGMENTS: readonly string[] = [
  'login',
  'link-device',
  'register',
  'coming-soon',
  'dashboard',
  'exams',
  'practice',
  'admin',
  'students',
  'chapters',
  'settings',
  'v1',
  'api',
  '_next',
  'static',
  'assets',
  'public',
]

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function segments(pathname: string): string[] {
  return pathname.split('/').filter(Boolean)
}

/** The course a pathname is in — its first segment — or `null` for a top-level page (`/`, `/login`, `/register`, …). */
export function courseFromPathname(pathname: string): string | null {
  const [first] = segments(pathname)
  if (!first || RESERVED_TOP_LEVEL_SEGMENTS.includes(first) || !SLUG.test(first)) return null
  return first
}

/** `/vedam/dashboard` for (`vedam`, `/dashboard`); `/vedam` for (`vedam`, `/`). `path` keeps any query string. */
export function coursePath(course: string, path: string = '/'): string {
  const rest = path.startsWith('/') ? path : `/${path}`
  return rest === '/' ? `/${course}` : `/${course}${rest}`
}

/** `/vedam/register` — a course's public application form, reachable without an account. */
export function isCourseRegisterPath(pathname: string): boolean {
  const [, second, ...rest] = segments(pathname)
  return courseFromPathname(pathname) !== null && second === 'register' && rest.length === 0
}
