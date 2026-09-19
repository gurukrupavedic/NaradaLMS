'use client'

import { useEffect } from 'react'

import { CourseChooser } from '@/components/course-chooser'
import { ScreenError } from '@/components/screen-error'
import { ScreenSkeleton } from '@/components/skeletons'
import { useSelectedProfileId } from '@/lib/auth/profile-store'
import { useSignOut } from '@/lib/auth/use-sign-out'
import { useMyCourses } from '@/lib/course'
import { rootDestination } from '@/lib/course-destination'
import { coursePath } from '@/lib/course-path'

/**
 * `/`: into the person's course. One course goes straight in; several get a choice; none is told so.
 * The move into a course is a full page load (`location.replace`) rather than a client-side
 * navigation, so no cached data from another course can be shown under the new one.
 */
export function RootRedirect() {
  const profileId = useSelectedProfileId()
  const { data: courses, error } = useMyCourses()
  const signOut = useSignOut()

  const destination = courses ? rootDestination(courses) : null
  const goTo = destination?.kind === 'go' ? coursePath(destination.slug, '/dashboard') : null

  useEffect(() => {
    if (goTo) window.location.replace(goTo)
  }, [goTo])

  // The selected profile reads as `null` on the first (hydration) render even when one is set.
  if (!profileId) return <ScreenSkeleton rows={4} />
  if (error) return <ScreenError error={error} />
  if (!destination || destination.kind === 'go') return <ScreenSkeleton rows={4} />

  if (destination.kind === 'choose') return <CourseChooser options={destination.options} />

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center px-6">
      <p className="label text-vermilion">No course yet</p>
      <h1 className="display mt-4 text-[2rem]">You&apos;re not part of a course yet.</h1>
      <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted">
        Once you&apos;re enrolled in a batch, your course will show up here.
      </p>
      <button
        type="button"
        onClick={signOut}
        className="label mt-8 w-fit border border-rule px-4 py-2.5 text-ink-muted transition-colors hover:border-vermilion hover:text-vermilion"
      >
        Sign out
      </button>
    </main>
  )
}
