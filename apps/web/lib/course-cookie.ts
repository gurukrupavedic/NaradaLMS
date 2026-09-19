/**
 * Which course this browser is acting in — a plain cookie, the same shape as the selected profile
 * (`lib/auth/profile-store.ts`): read at request time and sent to the API as `x-course-slug`, the way
 * `x-profile-id` is. Kept apart from `lib/course.ts` (which pulls in React and the query client) so
 * `lib/api/client.ts` can read it without an import cycle.
 *
 * Like the profile cookie it is shared by every tab, so choosing a course in one tab is what the
 * next request from another tab sends. The header always shows the course name, so a tab is never
 * ambiguous about which it is showing.
 */

const COURSE_COOKIE = 'narada-course'
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach(listener => listener())
}

export function getSelectedCourseSlug(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COURSE_COOKIE}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function setSelectedCourse(slug: string): void {
  document.cookie = `${COURSE_COOKIE}=${encodeURIComponent(slug)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`
  emit()
}

/** On sign-out: the next person on this device must not inherit the last one's course. */
export function clearSelectedCourse(): void {
  document.cookie = `${COURSE_COOKIE}=; path=/; max-age=0`
  emit()
}

/** For `useSyncExternalStore`: re-render whatever reads the selection when this tab changes it. */
export function subscribeSelectedCourse(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
