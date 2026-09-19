'use client'

import { ChevronDown } from 'lucide-react'

import { courseHref, useCourses, useCurrentCourseSlug } from '@/lib/course'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * Which course this address is for, set beside the wordmark — and, when the school has more than
 * one, a way to hop to another. A course lives at its own address (`vedam.slmts.naradas.app`), so
 * switching is just navigating there; the shared session cookie keeps the person signed in.
 *
 * Renders nothing off the course domain (local dev, a preview URL, any single-host deployment),
 * which is why a one-course school that hasn't set up its subdomains looks exactly as it did.
 */
export function CourseSwitcher() {
  const slug = useCurrentCourseSlug()
  const { data: courses } = useCourses(slug !== null)

  if (!slug) return null

  const current = courses?.find(course => course.slug === slug)
  // Loaded, and this address names a course that isn't there — the API 404s every read for it, so
  // say why rather than leaving a page of errors unexplained.
  const unknown = courses !== undefined && !current
  const label = current?.name ?? slug.charAt(0).toUpperCase() + slug.slice(1)
  const others = (courses ?? []).filter(course => course.slug !== slug)

  const mark = (
    <span
      className={
        unknown
          ? 'label text-vermilion'
          : 'label text-ink-muted transition-colors group-hover:text-ink'
      }
    >
      {unknown ? `${label} — no such course` : label}
    </span>
  )

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
        {others.map(course => {
          const href = courseHref(course.slug)
          return (
            <DropdownMenuItem
              key={course.id}
              render={href ? <a href={href} /> : undefined}
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
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
