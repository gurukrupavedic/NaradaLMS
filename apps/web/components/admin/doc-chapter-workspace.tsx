'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'

import { ScreenError } from '@/components/screen-error'
import { ScreenSkeleton } from '@/components/skeletons'
import { Standing } from '@/components/standing'
import type { ApiDocChapterDetail, ApiDocChapterSegment, ApiScriptKey } from '@/lib/api/api-types'
import { useCoursePath } from '@/lib/course'
import { pluralize } from '@/lib/pluralize'
import { docChapterDetailQuery } from '@/lib/query/options'
import {
  useDeleteSegment,
  useMergeSegmentWithNext,
  useSplitSegment,
} from '@/lib/query/use-doc-chapter-segment-mutations'
import { cn } from '@/lib/utils'

const SCRIPTS: { key: ApiScriptKey; label: string; fontClass: string }[] = [
  { key: 'sa', label: 'SA', fontClass: 'font-deva' },
  { key: 'te', label: 'TE', fontClass: 'font-telugu' },
  { key: 'en', label: 'EN', fontClass: '' },
]

/**
 * The doc-chapter workspace — currently just the cleanup stage (split/merge/delete a doc
 * chapter's segments). The assign-to-chapters stage lands in a later PR as a second, explicit
 * step alongside this one, not a mode toggle on it.
 *
 * Split into a container that resolves the query and a view that renders it, same shape as
 * `track-editor.tsx`: every hook in the view needs `detail` to exist, so the loading branch has to
 * come before them.
 */
export function DocChapterWorkspace({ docChapterId }: { docChapterId: string }) {
  const cp = useCoursePath()
  const { data: detail, error } = useQuery(docChapterDetailQuery(docChapterId))

  if (error) return <ScreenError error={error} backHref={cp('/admin/doc-chapters')} backLabel="← Doc chapters" />
  if (!detail) return <ScreenSkeleton rows={10} />

  return <CleanupStage docChapterId={docChapterId} detail={detail} />
}

function CleanupStage({ docChapterId, detail }: { docChapterId: string; detail: ApiDocChapterDetail }) {
  const cp = useCoursePath()
  const [script, setScript] = useState<ApiScriptKey>('sa')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const split = useSplitSegment(docChapterId)
  const mergeNext = useMergeSegmentWithNext(docChapterId)
  const del = useDeleteSegment(docChapterId)
  const saving = split.isPending || mergeNext.isPending || del.isPending

  const flaggedCount = detail.segments.filter(s => s.flaggedForReview).length

  return (
    <>
      <Standing
        eyebrow={detail.track}
        headline={detail.title}
        meta={`${pluralize(detail.segments.length, 'segment')}${flaggedCount > 0 ? ` · ${flaggedCount} flagged for review` : ''}`}
        action={
          <div className="flex items-center gap-px border border-rule">
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
        }
      />

      <div className="mx-auto max-w-5xl px-5 py-9">
        <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href={cp('/admin/doc-chapters')} className="label text-ink-muted transition-colors hover:text-ink">
            ← Doc chapters
          </Link>
          <span className="label ml-auto text-ink-muted" aria-live="polite">
            {saving ? 'Saving…' : 'Saved'}
          </span>
        </div>

        <ol>
          {detail.segments.map((segment, i) => (
            <SegmentRow
              key={segment.id}
              segment={segment}
              script={script}
              fontClass={SCRIPTS.find(s => s.key === script)?.fontClass ?? ''}
              isLast={i === detail.segments.length - 1}
              confirmingDelete={confirmDeleteId === segment.id}
              onToggleConfirmDelete={() =>
                setConfirmDeleteId(id => (id === segment.id ? null : segment.id))
              }
              onSplit={wordIndex => split.mutate({ segmentId: segment.id, script, wordIndex })}
              onMergeNext={() => mergeNext.mutate(segment.id)}
              onDelete={() => {
                del.mutate(segment.id)
                setConfirmDeleteId(null)
              }}
            />
          ))}
        </ol>
      </div>
    </>
  )
}

function SegmentRow({
  segment,
  script,
  fontClass,
  isLast,
  confirmingDelete,
  onToggleConfirmDelete,
  onSplit,
  onMergeNext,
  onDelete,
}: {
  segment: ApiDocChapterSegment
  script: ApiScriptKey
  fontClass: string
  isLast: boolean
  confirmingDelete: boolean
  onToggleConfirmDelete: () => void
  onSplit: (wordIndex: number) => void
  onMergeNext: () => void
  onDelete: () => void
}) {
  const text = segment.scripts[script]

  return (
    <li className="group relative">
      <div className={cn('flex items-start gap-4 px-2 py-3', segment.flaggedForReview && 'bg-vermilion/[0.06]')}>
        <span className="w-8 shrink-0 pt-1.5 font-mono text-[0.6875rem] tabular-nums text-ink-muted/55">
          {segment.order}
        </span>

        <p className="min-w-0 flex-1">
          {text ? (
            <span className={cn(fontClass, 'block text-[1.375rem] leading-[1.9] sm:text-[1.5rem]')}>
              <SplittableText text={text} onSplit={onSplit} />
            </span>
          ) : (
            <span className="block text-[0.9375rem] text-ink-muted/40 italic">
              — no {script.toUpperCase()} text —
            </span>
          )}
        </p>

        {confirmingDelete ? (
          <span className="flex shrink-0 items-center gap-2 pt-1">
            <span className="label text-vermilion">Delete?</span>
            <button
              type="button"
              onClick={onDelete}
              className="label border border-vermilion px-2.5 py-1.5 text-vermilion"
            >
              Delete
            </button>
            <button type="button" onClick={onToggleConfirmDelete} className="label text-ink-muted hover:text-ink">
              Keep
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={onToggleConfirmDelete}
            className="label shrink-0 pt-1 text-ink-muted opacity-0 transition-opacity hover:text-vermilion group-hover:opacity-100"
          >
            Delete
          </button>
        )}
      </div>

      {!isLast && (
        <button
          type="button"
          onClick={onMergeNext}
          title="Merge with next segment"
          aria-label="Merge with next segment"
          className="group/gap relative block h-3 w-full"
        >
          <span className="absolute inset-x-10 top-1/2 h-px -translate-y-1/2 bg-rule-soft transition-colors group-hover/gap:bg-vermilion" />
        </button>
      )}
    </li>
  )
}

/** Renders `text` word by word with a faint, clickable split point after every word but the last — brightens on hover, native tooltip via `title`. */
function SplittableText({ text, onSplit }: { text: string; onSplit: (wordIndex: number) => void }) {
  const words = text.split(/\s+/).filter(Boolean)

  return words.map((word, i) => (
    <span key={i}>
      {i > 0 && ' '}
      {word}
      {i < words.length - 1 && (
        <button
          type="button"
          onClick={() => onSplit(i + 1)}
          title="Split here"
          aria-label={`Split after "${word}"`}
          className="inline-block w-1 align-middle text-ink-muted/20 transition-colors hover:text-vermilion"
        >
          ┊
        </button>
      )}
    </span>
  ))
}
