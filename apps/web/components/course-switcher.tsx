'use client'

import { ChevronDown } from 'lucide-react'

import { setSelectedCourse, useMyCourses, useSelectedCourseSlug } from '@/lib/course'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * The course this browser is acting in, set beside the wordmark — and, when the person may pick from
 * more than one, a dropdown to switch. What it offers is `GET /me/courses`: an admin sees every
 * course, anyone else only the ones they are part of.
 *
 * Switching reloads the app rather than patching state in place. Every cached query is for the
 * course that was selected when it was fetched (the cache keys don't carry it), so a reload is the
 * simple way to guarantee nothing from the old course lingers on screen.
 *
 * Renders nothing until there is a course to name, and shows no dropdown for a one-course person,
 * so a school with a single course looks exactly as it did.
 */
export function CourseSwitcher() {
  const selected = useSelectedCourseSlug()
  const { data: courses } = useMyCourses()

  if (!selected || !courses) return null

  const current = courses.find(course => course.slug === selected)
  if (!current) return null

  const others = courses.filter(course => course.slug !== selected)

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
            onClick={() => {
              setSelectedCourse(course.slug)
              window.location.assign('/dashboard')
            }}
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
