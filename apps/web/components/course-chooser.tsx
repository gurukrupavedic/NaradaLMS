import { coursePath } from '@/lib/course-path'
import type { CourseChoice } from '@/lib/course-destination'

/**
 * Asked at the front door when someone belongs to several courses. Each choice is a plain link to that
 * course's dashboard — a full page load on purpose, so nothing cached for one course can show under
 * another — and the header's course switcher is how they move later.
 */
export function CourseChooser({ options }: { options: CourseChoice[] }) {
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
    </main>
  )
}
