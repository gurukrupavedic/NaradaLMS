'use client'

import type { CourseChoice } from '@/lib/course-selection'

/**
 * Asked once, when someone belongs to several courses and hasn't picked one on this browser. It
 * stands in for the page they were about to see — nothing course-scoped has loaded behind it — and
 * the header's course switcher is how they change their mind later.
 */
export function CourseChooser({
  options,
  onChoose,
}: {
  options: CourseChoice[]
  onChoose: (slug: string) => void
}) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center px-6">
      <p className="label text-vermilion">Choose a course</p>
      <h1 className="display mt-4 text-[2rem]">Which course are you here for?</h1>
      <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted">
        You&apos;re part of more than one. You can switch from the header at any time.
      </p>
      <ol className="sheet mt-8">
        {options.map(course => (
          <li key={course.slug} className="border-b border-rule-soft last:border-0">
            <button
              type="button"
              onClick={() => onChoose(course.slug)}
              className="group flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-ink/[0.03]"
            >
              <span className="text-[0.9375rem]">{course.name}</span>
              <span
                aria-hidden
                className="text-ink-muted/60 transition-colors group-hover:text-vermilion"
              >
                →
              </span>
            </button>
          </li>
        ))}
      </ol>
    </main>
  )
}
