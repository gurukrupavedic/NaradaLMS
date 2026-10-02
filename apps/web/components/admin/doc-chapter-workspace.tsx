'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'

import { ScreenError } from '@/components/screen-error'
import { ScreenSkeleton } from '@/components/skeletons'
import { Standing } from '@/components/standing'
import type { ApiDocChapterDetail, ApiDocChapterSegment, ApiScriptKey } from '@/lib/api/api-types'
import { useCoursePath } from '@/lib/course'
import type { CatalogTrack } from '@/lib/models/catalog'
import { pluralize } from '@/lib/pluralize'
import { catalogTracksQuery, docChapterDetailQuery } from '@/lib/query/options'
import {
  useDeleteSegment,
  useMergeSegmentWithNext,
  useSetAssignments,
  useSplitSegment,
} from '@/lib/query/use-doc-chapter-segment-mutations'
import { cn } from '@/lib/utils'

const SCRIPTS: { key: ApiScriptKey; label: string; fontClass: string }[] = [
  { key: 'sa', label: 'SA', fontClass: 'font-deva' },
  { key: 'te', label: 'TE', fontClass: 'font-telugu' },
  { key: 'en', label: 'EN', fontClass: '' },
]

const STAGES = [
  { key: 'cleanup', label: 'Clean up' },
  { key: 'assign', label: 'Assign' },
] as const
type Stage = (typeof STAGES)[number]['key']

/**
 * The doc-chapter workspace: clean up a doc chapter's text (split/merge/delete segments), then
 * assign it to real course chapters — two sequential stages, explicit forward/back navigation via
 * the stepper below, never a mode toggle (a chapter boundary is a property of the *assignment*
 * step; there's nothing to toggle between, only a different question being asked of the same
 * text).
 *
 * Split into a container that resolves the query and a view that renders it, same shape as
 * `track-editor.tsx`: every hook in the view needs `detail` to exist, so the loading branch has to
 * come before them.
 */
export function DocChapterWorkspace({ docChapterId }: { docChapterId: string }) {
  const cp = useCoursePath()
  const { data: detail, error } = useQuery(docChapterDetailQuery(docChapterId))
  const [stage, setStage] = useState<Stage>('cleanup')
  const [script, setScript] = useState<ApiScriptKey>('sa')

  if (error) return <ScreenError error={error} backHref={cp('/admin/doc-chapters')} backLabel="← Doc chapters" />
  if (!detail) return <ScreenSkeleton rows={10} />

  const flaggedCount = detail.segments.filter(s => s.flaggedForReview).length

  return (
    <>
      <Standing
        eyebrow={detail.track}
        // Same script switcher the body text uses — a heading is parsed from each of the three
        // source docs just like a verse is, so switching script should move the title with it.
        headline={detail.titles[script] ?? detail.titles.sa}
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
        <div className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link href={cp('/admin/doc-chapters')} className="label text-ink-muted transition-colors hover:text-ink">
            ← Doc chapters
          </Link>

          <ol className="flex items-center gap-2">
            {STAGES.map((s, i) => (
              <li key={s.key} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStage(s.key)}
                  className={cn(
                    'label transition-colors',
                    s.key === stage ? 'text-vermilion' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  {String(i + 1).padStart(2, '0')} {s.label}
                </button>
                {i < STAGES.length - 1 && <span aria-hidden className="h-px w-5 bg-rule" />}
              </li>
            ))}
          </ol>
        </div>

        {stage === 'cleanup' ? (
          <CleanupStage docChapterId={docChapterId} detail={detail} script={script} />
        ) : (
          <AssignStage docChapterId={docChapterId} detail={detail} script={script} />
        )}
      </div>
    </>
  )
}

// ── Clean up ─────────────────────────────────────────────────────────────────

function CleanupStage({
  docChapterId,
  detail,
  script,
}: {
  docChapterId: string
  detail: ApiDocChapterDetail
  script: ApiScriptKey
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const split = useSplitSegment(docChapterId)
  const mergeNext = useMergeSegmentWithNext(docChapterId)
  const del = useDeleteSegment(docChapterId)
  const saving = split.isPending || mergeNext.isPending || del.isPending

  return (
    <>
      <SavingIndicator saving={saving} />

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

// ── Assign to chapters ───────────────────────────────────────────────────────

/** A contiguous run of segments currently assigned to the same chapter (or, if `chapterId` is null, not yet assigned to any) — derived fresh from `detail.segments` on every render, never stored separately. Equal-adjacent `chapterId`s collapse into one range for free, which is also what makes "merge into previous" work: reassigning a range to its predecessor's `chapterId` makes them the same range on the next render, with nothing further to clean up. */
type Range = { chapterId: string | null; segments: ApiDocChapterSegment[] }

function computeRanges(segments: ApiDocChapterSegment[]): Range[] {
  const ranges: Range[] = []
  for (const segment of segments) {
    const last = ranges.at(-1)
    if (last && last.chapterId === segment.chapterId) {
      last.segments.push(segment)
    } else {
      ranges.push({ chapterId: segment.chapterId, segments: [segment] })
    }
  }
  return ranges
}

function AssignStage({
  docChapterId,
  detail,
  script,
}: {
  docChapterId: string
  detail: ApiDocChapterDetail
  script: ApiScriptKey
}) {
  const { data: tracks, error } = useQuery(catalogTracksQuery())
  const setAssignments = useSetAssignments(docChapterId)

  if (error) return <ScreenError error={error} />
  if (!tracks) return <ScreenSkeleton rows={6} />

  function submit(overrides: Map<string, string | null>) {
    setAssignments.mutate(
      detail.segments.map(s => ({
        segmentId: s.id,
        chapterId: overrides.has(s.id) ? (overrides.get(s.id) ?? null) : s.chapterId,
      })),
    )
  }

  const ranges = computeRanges(detail.segments)

  return (
    <>
      <SavingIndicator saving={setAssignments.isPending} />

      <ol>
        {ranges.map((range, i) => (
          <RangeBlock
            key={range.segments[0]!.id}
            range={range}
            isFirst={i === 0}
            tracks={tracks}
            script={script}
            onReassign={chapterId =>
              submit(new Map(range.segments.map(s => [s.id, chapterId])))
            }
            onInsertBoundary={afterIndex =>
              submit(new Map(range.segments.slice(afterIndex).map(s => [s.id, null])))
            }
            onMergeIntoPrevious={
              i > 0
                ? () => submit(new Map(range.segments.map(s => [s.id, ranges[i - 1]!.chapterId])))
                : undefined
            }
          />
        ))}
      </ol>
    </>
  )
}

function RangeBlock({
  range,
  isFirst,
  tracks,
  script,
  onReassign,
  onInsertBoundary,
  onMergeIntoPrevious,
}: {
  range: Range
  isFirst: boolean
  tracks: CatalogTrack[]
  script: ApiScriptKey
  onReassign: (chapterId: string | null) => void
  onInsertBoundary: (afterIndex: number) => void
  onMergeIntoPrevious?: () => void
}) {
  const fontClass = SCRIPTS.find(s => s.key === script)?.fontClass ?? ''

  return (
    <li className={cn(!isFirst && 'pt-8')}>
      <div className="group/heading relative flex flex-wrap items-center gap-x-4 gap-y-1 pb-2">
        <select
          value={range.chapterId ?? ''}
          onChange={e => onReassign(e.target.value || null)}
          className={cn(
            'display cursor-pointer appearance-none bg-transparent text-[1.4rem] focus:outline-none',
            range.chapterId ? 'text-ink' : 'text-ink-muted italic',
          )}
        >
          <option value="">— choose chapter —</option>
          {tracks.map(track => (
            <optgroup key={track.id} label={track.name}>
              {track.chapters.map(chapter => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.code} {chapter.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {onMergeIntoPrevious && (
          <button
            type="button"
            onClick={onMergeIntoPrevious}
            className="label text-ink-muted opacity-0 transition-opacity hover:text-vermilion group-hover/heading:opacity-100"
          >
            ✕ merge into previous chapter
          </button>
        )}
      </div>

      {range.segments.map((segment, i) => (
        <div key={segment.id}>
          <p className="px-2 py-3">
            {segment.scripts[script] ? (
              <span className={cn(fontClass, 'block text-[1.375rem] leading-[1.9] sm:text-[1.5rem]')}>
                {segment.scripts[script]}
              </span>
            ) : (
              <span className="block text-[0.9375rem] text-ink-muted/40 italic">
                — no {script.toUpperCase()} text —
              </span>
            )}
          </p>

          {i < range.segments.length - 1 && (
            <button
              type="button"
              onClick={() => onInsertBoundary(i + 1)}
              title="Start a new chapter here"
              aria-label="Start a new chapter here"
              className="group/gap relative block h-3 w-full"
            >
              <span className="absolute inset-x-10 top-1/2 h-px -translate-y-1/2 bg-rule-soft transition-colors group-hover/gap:bg-vermilion" />
            </button>
          )}
        </div>
      ))}
    </li>
  )
}

// ── Shared ───────────────────────────────────────────────────────────────────

function SavingIndicator({ saving }: { saving: boolean }) {
  return (
    <p className="label mb-4 text-right text-ink-muted" aria-live="polite">
      {saving ? 'Saving…' : 'Saved'}
    </p>
  )
}
