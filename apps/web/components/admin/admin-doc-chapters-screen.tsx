'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { ScreenError } from '@/components/screen-error'
import { ScreenSkeleton } from '@/components/skeletons'
import { Section } from '@/components/section'
import { Standing } from '@/components/standing'
import { useCoursePath, useCourseSlug } from '@/lib/course'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { courseQuery, docChaptersQuery } from '@/lib/query/options'
import type { ApiDocChapterListItem, ApiScriptKey } from '@/lib/api/api-types'
import { pluralize } from '@/lib/pluralize'
import { cn } from '@/lib/utils'

const SEARCH_DEBOUNCE_MS = 300

const SCRIPTS: { key: ApiScriptKey; label: string }[] = [
  { key: 'sa', label: 'SA' },
  { key: 'te', label: 'TE' },
  { key: 'en', label: 'EN' },
]

/**
 * The doc-chapter search screen — every heading parsed out of an uploaded source document set,
 * searchable by title or track, each opening onto its own cleanup/assignment workspace
 * (`/admin/doc-chapters/:id`, not part of this screen).
 */
export function AdminDocChaptersScreen() {
  const cp = useCoursePath()
  const slug = useCourseSlug()
  const { data: course, error: courseError } = useQuery(courseQuery(slug))
  const [query, setQuery] = useState('')
  const [script, setScript] = useState<ApiScriptKey>('sa')
  const debounced = useDebouncedValue(query, SEARCH_DEBOUNCE_MS)
  const { data: docChapters, error: docChaptersError } = useQuery(
    docChaptersQuery(course?.id ?? '', debounced),
  )

  // No hooks below this point, so the early return is safe.
  if (courseError || docChaptersError) return <ScreenError error={courseError ?? docChaptersError} />
  if (!course || !docChapters) return <ScreenSkeleton rows={6} />

  return (
    <>
      <Standing
        eyebrow="Administration"
        headline="Doc chapters"
        meta="Parsed headings from an uploaded source document set — clean up and assign each to a real chapter."
        action={
          <Link
            href={cp('/admin/doc-chapters/upload')}
            className="label shrink-0 bg-vermilion px-3.5 py-1.5 text-paper transition-colors hover:bg-vermilion/90"
          >
            + Upload source documents
          </Link>
        }
      />

      <div className="mx-auto max-w-5xl space-y-6 px-5 py-9">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by title or track…"
            aria-label="Search doc chapters"
            className="min-w-0 flex-1 border-b border-ink/25 bg-transparent py-1.5 text-[0.9375rem] placeholder:text-ink-muted/40 focus:border-vermilion focus:outline-none"
          />

          {/* Titles are stored per script just like verse text — this picks which one the list
              below shows, independent of what language the search text itself happens to be in. */}
          <div className="flex shrink-0 items-center gap-px border border-rule">
            {SCRIPTS.map(s => (
              <button
                key={s.key}
                type="button"
                onClick={() => setScript(s.key)}
                aria-pressed={s.key === script}
                className={cn(
                  'label px-2.5 py-1.5 transition-colors',
                  s.key === script ? 'bg-ink text-paper' : 'text-ink-muted hover:bg-ink/[0.04] hover:text-ink',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <Section title="Results" count={pluralize(docChapters.length, 'doc chapter')}>
          {docChapters.length === 0 ? (
            <p className="sheet px-4 py-7 text-center text-[0.875rem] text-ink-muted">
              {query.trim()
                ? 'No doc chapters match this search.'
                : 'No doc chapters yet — upload a source document set to get started.'}
            </p>
          ) : (
            <ol className="sheet">
              {docChapters.map(item => (
                <DocChapterRow key={item.id} item={item} script={script} />
              ))}
            </ol>
          )}
        </Section>
      </div>
    </>
  )
}

function DocChapterRow({ item, script }: { item: ApiDocChapterListItem; script: ApiScriptKey }) {
  const cp = useCoursePath()
  return (
    <li className="border-b border-rule-soft last:border-0">
      <Link
        href={cp(`/admin/doc-chapters/${item.id}`)}
        className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-ink/[0.03]"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.9375rem]">{item.titles[script] ?? item.titles.sa}</span>
          <span className="label mt-0.5 block text-ink-muted">{item.track}</span>
        </span>
        <span className="label shrink-0 text-ink-muted">
          {item.assignedCount}/{item.verseCount} assigned
        </span>
      </Link>
    </li>
  )
}
