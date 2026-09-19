'use client'

import { ChevronDown } from 'lucide-react'

import { useCourseSlug, useMyCourses } from '@/lib/course'
import { coursePath } from '@/lib/course-path'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * The course this page is in, set beside the wordmark — and, when the person may pick from more than
 * one, a dropdown to switch. What it offers is `GET /me/courses`: an admin sees every course, anyone
 * else only the ones they are part of.
 *
 * Switching is a full page load to that course's dashboard: the address is the course, and every
 * cached query is for the course whose address it was fetched under, so a fresh load is the simple way
 * to guarantee nothing from the old course lingers on screen.
 *
 * Shows no dropdown for a one-course person, so a school with a single course looks as it always did.
 */
export function CourseSwitcher() {
  const slug = useCourseSlug()
  const { data: courses } = useMyCourses()

  const current = courses?.find(course => course.slug === slug)
  if (!courses || !current) return null

  const others = courses.filter(course => course.slug !== slug)

  const mark = <span className="label text-ink-muted transition-colors group-hover:text-ink">{current.name}</span>

  if (others.length === 0) {
    return <span className="border-l border-rule pl-4">{mark}</span>
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex items-center gap-1.5 border-l border-rule pl-4 outline-none">
        {mark}
        <ChevronDown
          aria-hidden
          className="size-3 text-ink-muted/70 transition-colors group-data-[popup-open]:text-vermilion"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={10}
        className="min-w-40 rounded-none border border-rule bg-card p-0 shadow-none ring-0"
      >
        {others.map(course => (
          <DropdownMenuItem
            key={course.slug}
            onClick={() => window.location.assign(coursePath(course.slug, '/dashboard'))}
            className="group/row flex items-center justify-between gap-4 rounded-none border-b border-rule-soft px-4 py-2.5 text-[0.8125rem] text-ink-muted last:border-0 focus:bg-ink/[0.03] focus:text-ink"
          >
            {course.name}
            <span
              aria-hidden
              className="text-ink-muted/60 transition-colors group-focus/row:text-vermilion"
            >
              →
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
