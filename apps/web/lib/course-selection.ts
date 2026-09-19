/**
 * Which course the app should act in, given the courses this person may pick from and the one they
 * last picked. Pure and dependency-free on purpose — no `window`, no cookie, no query client — so
 * the decision is unit-tested on its own and the component that acts on it stays a thin shell.
 */

export type CourseChoice = { slug: string; name: string }

export type CourseSelection =
  /** Nothing to pick from (no course yet, or a profile with no course relationship): send no course, and let the API resolve a single-course school itself. */
  | { kind: 'none' }
  /** This is the course — either the one they picked, or the only one there is. */
  | { kind: 'use'; slug: string }
  /** Several to pick from and no valid pick yet: ask. */
  | { kind: 'choose'; options: CourseChoice[] }

export function resolveSelection(
  available: CourseChoice[],
  stored: string | null,
): CourseSelection {
  const [only] = available
  if (!only) return { kind: 'none' }

  // A stored pick only counts if it is still on offer — someone who was moved out of a course, or
  // signed in as a different profile on the same device, must not stay pinned to one they can't see.
  const wanted = stored?.toLowerCase()
  const kept = wanted ? available.find(course => course.slug.toLowerCase() === wanted) : undefined
  if (kept) return { kind: 'use', slug: kept.slug }

  if (available.length === 1) return { kind: 'use', slug: only.slug }
  return { kind: 'choose', options: available }
}
