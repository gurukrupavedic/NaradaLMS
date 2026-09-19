'use client'

import Link from 'next/link'

import { ScreenError } from '@/components/screen-error'
import { ScreenSkeleton } from '@/components/skeletons'
import { useSelectedProfileId } from '@/lib/auth/profile-store'
import { useCourseSlug, useMyCourses } from '@/lib/course'
import { coursePath } from '@/lib/course-path'

/**
 * For the signed-in pages under `/<course>/…`: if this person isn't part of the course in the address
 * — a student who typed `/smartam/dashboard`, a link that was forwarded — say so plainly, with a way to
 * their own courses, rather than showing an empty dashboard for a course they have no place in.
 *
 * "Part of" is `GET /me/courses`: an admin is part of every course, anyone else of the ones their
 * profile has an enrollment in (any status) or applied to. The API enforces the same rule on a
 * course's content (tracks, chapters, the dashboard), so this is the friendly face of a real check,
 * not the check itself.
 */
export function CourseAccess({ children }: { children: React.ReactNode }) {
  const slug = useCourseSlug()
  const profileId = useSelectedProfileId()
  const { data: courses, error } = useMyCourses()

  // The selected profile reads as `null` on the very first (hydration) render even when one is set —
  // it lives in a cookie the server can't see — so wait rather than judge yet. (A genuinely missing
  // profile can't reach these pages: proxy.ts sends it back to sign in.)
  if (!profileId) return <ScreenSkeleton rows={6} />
  if (error) return <ScreenError error={error} />
  if (!courses) return <ScreenSkeleton rows={6} />

  if (!courses.some(course => course.slug === slug)) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center px-6">
        <p className="label text-vermilion">Not your course</p>
        <h1 className="display mt-4 text-[2rem]">You&apos;re not part of this course.</h1>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted">
          {courses.length > 0
            ? 'Here are the ones you are part of.'
            : 'You are not part of any course yet. Once you are enrolled, it will show up here.'}
        </p>
        {courses.length > 0 && (
          <ol className="sheet mt-8">
            {courses.map(course => (
              <li key={course.slug} className="border-b border-rule-soft last:border-0">
                <a
                  href={coursePath(course.slug, '/dashboard')}
                  className="group flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-ink/[0.03]"
                >
                  <span className="text-[0.9375rem]">{course.name}</span>
                  <span
                    aria-hidden
                    className="text-ink-muted/60 transition-colors group-hover:text-vermilion"
                  >
                    →
                  </span>
                </a>
              </li>
            ))}
          </ol>
        )}
        <Link
          href="/"
          className="label mt-8 w-fit border border-rule px-4 py-2.5 text-ink-muted transition-colors hover:border-vermilion hover:text-vermilion"
        >
          Go to the home page
        </Link>
      </main>
    )
  }

  return <>{children}</>
}
