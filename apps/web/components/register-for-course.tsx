'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'

import { RegistrationForm } from '@/components/registration-form'
import { ScreenError } from '@/components/screen-error'
import { ScreenSkeleton } from '@/components/skeletons'
import { courseQuery, coursesQuery } from '@/lib/query/options'

/** `/register/vedam` — the application form for the course the link names. A slug that isn't a course says so, rather than showing a form that would be refused. */
export function RegisterForCourse({ slug }: { slug: string }) {
  const { data: course, error } = useQuery(courseQuery(slug))

  if (error) {
    return <ScreenError error={error} backHref="/register" backLabel="← See the courses" />
  }
  if (!course) return <ScreenSkeleton rows={6} />

  return <RegistrationForm course={course} />
}

/**
 * `/register` with no course named. A school with one course has nothing to ask — that is the form.
 * With several, applying without saying which would file the application under a guess, so the
 * visitor chooses first; each choice is its own shareable link.
 */
export function RegisterCourseChooser() {
  const { data: courses, error } = useQuery(coursesQuery())

  if (error) return <ScreenError error={error} />
  if (!courses) return <ScreenSkeleton rows={4} />

  const [only] = courses
  if (only && courses.length === 1) return <RegistrationForm course={only} />

  if (courses.length === 0) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center px-6">
        <p className="label text-vermilion">Registration</p>
        <h1 className="display mt-4 text-[2rem]">Registration isn&apos;t open yet.</h1>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted">
          There are no courses to apply to at the moment. Please check back soon.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center px-6">
      <p className="label text-vermilion">Registration</p>
      <h1 className="display mt-4 text-[2rem]">Which course would you like to join?</h1>
      <ol className="sheet mt-8">
        {courses.map(course => (
          <li key={course.slug} className="border-b border-rule-soft last:border-0">
            <Link
              href={`/register/${course.slug}`}
              className="group flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-ink/[0.03]"
            >
              <span className="text-[0.9375rem]">{course.name}</span>
              <span
                aria-hidden
                className="text-ink-muted/60 transition-colors group-hover:text-vermilion"
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  )
}
