'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'

import { useSelectedProfileId } from '@/lib/auth/profile-store'
import { coursePath } from '@/lib/course-path'
import { myCoursesQuery } from '@/lib/query/options'

/**
 * The course this page is in — the `[course]` segment of the URL. The URL is the only place the course
 * lives (`lib/course-path.ts`), so this can't disagree with what the page shows. Only meaningful under
 * `/<course>/…`; anywhere else it is a mistake worth failing loudly on.
 */
export function useCourseSlug(): string {
  const { course } = useParams<{ course?: string }>()
  if (!course) throw new Error('useCourseSlug was used outside a /<course>/… route')
  return course
}

/** Builds a link that stays in the current course: `cp('/admin')` → `/vedam/admin`. */
export function useCoursePath(): (path?: string) => string {
  const course = useCourseSlug()
  return path => coursePath(course, path)
}

/**
 * The courses the signed-in profile may pick from — every course for an admin, otherwise the ones
 * they are part of. Keyed by profile: a household that shares one login switches between children's
 * profiles, and each has its own list.
 */
export function useMyCourses() {
  const profileId = useSelectedProfileId()
  return useQuery({ ...myCoursesQuery(profileId ?? ''), enabled: profileId !== null })
}
