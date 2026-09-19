'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { RegistrationForm } from '@/components/registration-form'
import { ScreenError } from '@/components/screen-error'
import { ScreenSkeleton } from '@/components/skeletons'
import { useCourseSlug } from '@/lib/course'
import { coursePath } from '@/lib/course-path'
import { courseQuery, coursesQuery } from '@/lib/query/options'

/**
 * `/vedam/register` — the application form for the course in the URL. Its layout has already checked
 * the course exists (`CourseBoundary`), so this just needs its name for the form.
 */
export function RegisterForCourse() {
  const slug = useCourseSlug()
  const { data: course, error } = useQuery(courseQuery(slug))

  if (error) return <ScreenError error={error} />
  if (!course) return <ScreenSkeleton rows={6} />

  return <RegistrationForm course={course} />
}

/**
 * `/register` with no course in the address. A school with one course has nothing to ask: it goes
 * straight to that course's form, so every application has a course in its URL. With several, applying
 * without saying which would file the application under a guess, so the visitor chooses first; each
 * choice is its own shareable link.
 */
export function RegisterCourseChooser() {
  const router = useRouter()
  const { data: courses, error } = useQuery(coursesQuery())

  const [only] = courses ?? []
  const soleCourse = courses?.length === 1 ? only : undefined

  useEffect(() => {
    if (soleCourse) router.replace(coursePath(soleCourse.slug, '/register'))
  }, [soleCourse, router])

  if (error) return <ScreenError error={error} />
  if (!courses || soleCourse) return <ScreenSkeleton rows={4} />

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
              href={coursePath(course.slug, '/register')}
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
