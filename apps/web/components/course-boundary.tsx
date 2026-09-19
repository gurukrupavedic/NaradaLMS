'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'

import { ScreenError } from '@/components/screen-error'
import { ScreenSkeleton } from '@/components/skeletons'
import { ApiError } from '@/lib/api/client'
import { useCourseSlug } from '@/lib/course'
import { courseFromPathname } from '@/lib/course-path'
import { courseQuery } from '@/lib/query/options'

function Notice({ label, title, body }: { label: string; title: string; body: string }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center px-6">
      <p className="label text-vermilion">{label}</p>
      <h1 className="display mt-4 text-[2rem]">{title}</h1>
      <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted">{body}</p>
      <Link
        href="/"
        className="label mt-8 w-fit border border-rule px-4 py-2.5 text-ink-muted transition-colors hover:border-vermilion hover:text-vermilion"
      >
        Go to the home page
      </Link>
    </main>
  )
}

/**
 * Answers "is that a course?" once, for everything under `/<course>/…`, before any page below loads
 * data. Two ways it isn't: a segment that can never be a course (the app's old, pre-course addresses —
 * `/dashboard`, `/admin`, … — which now match this route because nothing else does), and a well-formed
 * slug the school doesn't have.
 */
export function CourseBoundary({ children }: { children: React.ReactNode }) {
  const slug = useCourseSlug()
  const isPossibleCourse = courseFromPathname(`/${slug}`) !== null
  const { data: course, error } = useQuery({ ...courseQuery(slug), enabled: isPossibleCourse })

  if (!isPossibleCourse) {
    return (
      <Notice
        label="Moved"
        title="That address has moved."
        body="Pages now live under your course. Start from the home page and it will take you there."
      />
    )
  }

  if (error instanceof ApiError && error.status === 404) {
    return (
      <Notice
        label="Not found"
        title={`There's no course called “${slug}”.`}
        body="Check the address, or start from the home page to see your courses."
      />
    )
  }
  if (error) return <ScreenError error={error} />
  if (!course) return <ScreenSkeleton rows={6} />

  return <>{children}</>
}
