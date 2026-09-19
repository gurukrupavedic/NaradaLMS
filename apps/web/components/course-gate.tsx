'use client'

import { useEffect } from 'react'

import { ScreenError } from '@/components/screen-error'
import { ScreenSkeleton } from '@/components/skeletons'
import { CourseChooser } from '@/components/course-chooser'
import {
  clearSelectedCourse,
  setSelectedCourse,
  useMyCourses,
  useSelectedCourseSlug,
} from '@/lib/course'
import { resolveSelection } from '@/lib/course-selection'
import { useSelectedProfileId } from '@/lib/auth/profile-store'

/**
 * Makes sure the app knows which course it is acting in *before* anything course-scoped loads —
 * every request carries the selected course, and a school with several answers 422 to one that
 * carries none, so children must not mount (and fire their queries) until this has settled.
 *
 * What it does is `resolveSelection`'s call (lib/course-selection.ts): use the course they picked,
 * or the only one they have; ask if there are several and none is picked; step aside when there is
 * nothing to pick from. The choice is a cookie, so it lasts across visits and tabs.
 *
 * A one-course person never sees a choice, so a school that hasn't grown a second course looks
 * exactly as it always did.
 */
export function CourseGate({ children }: { children: React.ReactNode }) {
  const profileId = useSelectedProfileId()
  const { data: courses, error } = useMyCourses()
  const stored = useSelectedCourseSlug()

  const selection = courses ? resolveSelection(courses, stored) : null

  // Keep the cookie in step with what was decided (auto-selecting the only course, dropping a stale
  // pick). It writes to an external store, not React state, so this doesn't cascade a render.
  useEffect(() => {
    if (!selection) return
    if (selection.kind === 'use' && stored !== selection.slug) setSelectedCourse(selection.slug)
    if (selection.kind === 'none' && stored !== null) clearSelectedCourse()
  }, [selection, stored])

  // The selected profile reads as `null` on the very first (hydration) render even when one is set,
  // because it lives in a cookie the server can't see. Letting children through then would mount them
  // — and fire their requests — before the course is settled, so wait. (A genuinely missing profile
  // can't reach these pages: proxy.ts sends it back to sign in.)
  if (!profileId) return <ScreenSkeleton rows={6} />
  if (error) return <ScreenError error={error} />
  if (!selection) return <ScreenSkeleton rows={6} />

  if (selection.kind === 'choose') {
    return <CourseChooser options={selection.options} onChoose={setSelectedCourse} />
  }

  // The cookie is about to change to match (or be cleared): hold children back for that one beat, so
  // their first requests already carry the right course.
  if (selection.kind === 'use' && stored !== selection.slug) return <ScreenSkeleton rows={6} />
  if (selection.kind === 'none' && stored !== null) return <ScreenSkeleton rows={6} />

  return <>{children}</>
}
