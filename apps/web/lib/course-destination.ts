/**
 * Where to send someone who lands on the root (`/`) or has just signed in, given the courses they are
 * part of: straight into their only course, a choice if they have several, and a plain "nothing here"
 * if they have none. Pure, so the decision is tested apart from the page that acts on it.
 */

export type CourseChoice = { slug: string; name: string }

export type RootDestination =
  | { kind: 'none' }
  | { kind: 'go'; slug: string }
  | { kind: 'choose'; options: CourseChoice[] }

export function rootDestination(available: CourseChoice[]): RootDestination {
  const [only] = available
  if (!only) return { kind: 'none' }
  if (available.length === 1) return { kind: 'go', slug: only.slug }
  return { kind: 'choose', options: available }
}
