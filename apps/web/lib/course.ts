'use client'

import { useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'

import { useSelectedProfileId } from '@/lib/auth/profile-store'
import { getSelectedCourseSlug, subscribeSelectedCourse } from '@/lib/course-cookie'
import { myCoursesQuery } from '@/lib/query/options'

export {
  clearSelectedCourse,
  setSelectedCourse,
} from '@/lib/course-cookie'

/** The course this browser is acting in, or `null` for none yet. Re-renders when this tab changes it. */
export function useSelectedCourseSlug(): string | null {
  return useSyncExternalStore(subscribeSelectedCourse, getSelectedCourseSlug, () => null)
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
