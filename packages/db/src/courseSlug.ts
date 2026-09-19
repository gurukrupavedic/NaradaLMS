/**
 * What a course slug may be. A course lives in the URL — `slmts.naradas.app/vedam/dashboard` — as the
 * first path segment, so its slug has to be a safe, lower-case URL segment, and it must never be a word
 * the web app already uses at the top level (`/login`, `/register`, …): a course called `login` would
 * be shadowed by the sign-in page and unreachable.
 *
 * Dependency-free on purpose: the schema builds its CHECK constraint from these, the importer validates
 * with them before inserting, and the web app's tests read this file to make sure its own list of
 * top-level routes is reserved here (`apps/web/lib/course-path.test.ts`). Add a top-level route to the
 * web app and that test fails until the word is added below.
 */

/** Lower-case letters and digits, with single hyphens between — `vedam`, `smartam-2`. */
export const COURSE_SLUG_PATTERN = '^[a-z0-9]+(-[a-z0-9]+)*$'

export const RESERVED_COURSE_SLUGS = [
  // Top-level routes that are not a course.
  'login',
  'link-device',
  'register',
  'coming-soon',
  // The pre-course URLs (`/dashboard`, `/admin`, …): never a course, so an old link can't be mistaken for one.
  'dashboard',
  'exams',
  'practice',
  'admin',
  'students',
  'chapters',
  'settings',
  // Infrastructure paths.
  'v1',
  'api',
  '_next',
  'static',
  'assets',
  'public',
] as const

export function isValidCourseSlug(slug: string): boolean {
  return (
    new RegExp(COURSE_SLUG_PATTERN).test(slug) &&
    !(RESERVED_COURSE_SLUGS as readonly string[]).includes(slug)
  )
}
