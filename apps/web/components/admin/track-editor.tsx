'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'

import { ScreenSkeleton } from '@/components/skeletons'
import { ScreenError } from '@/components/screen-error'
import { Standing } from '@/components/standing'
import { Section } from '@/components/section'
import { Notice } from '@/components/notice'
import { PipelineKey } from '@/components/admin/pipeline'
import { ChapterRow } from '@/components/admin/chapter-row'
import { ApiError } from '@/lib/api/client'
import { catalogTrackQuery } from '@/lib/query/options'
import {
  useAddChapter,
  useRemoveChapter,
  useReorderChapters,
  useUpdateChapter,
  useUpdateTrack,
} from '@/lib/query/use-catalog-mutations'
import { isReady, type CatalogChapter, type CatalogTrack } from '@/lib/mock-catalog'

/**
 * Admin catalog and editor for one track.
 *
 * Distinct from `/practice` (`components/practice-screen.tsx`), which is a *reader's* view of
 * their own record — their marks, their next chapter, published chapters only, every track at
 * once rather than one being edited. An admin arriving from a batch is not looking at anyone's
 * progress; that page answers a question nobody asked here. This is the full catalog for one
 * track, drafts included, and it is editable.
 *
 * Split into a container that resolves the query and a view that renders it.
 * Every hook in the view needs `track` to exist, so the loading branch has to
 * come before them — and an early return in a single component would sit above
 * those hooks and break the rules of hooks. The split makes the guard legal and
 * the view honest: it takes a track, never a maybe-track.
 *
 * The only local state is *interaction* state — which row is expanded, which
 * delete is awaiting confirmation. Chapter data itself is never copied into
 * component state; it is read from the cache and written through mutations, so
 * an optimistic edit that gets rolled back rolls back on screen too.
 */
const CHAPTER_CREATE_ATTEMPTS = 20

export function TrackEditor({ trackId }: { trackId: string }) {
  const { data: track, error } = useQuery(catalogTrackQuery(trackId))

  if (error) return <ScreenError error={error} backHref="/admin" backLabel="← Administration" />
  if (!track) return <ScreenSkeleton rows={11} />

  return <TrackEditorView track={track} trackId={trackId} />
}

function TrackEditorView({ track, trackId }: { track: CatalogTrack; trackId: string }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [addChapterError, setAddChapterError] = useState<string | null>(null)

  const updateChapter = useUpdateChapter(trackId)
  const reorder = useReorderChapters(trackId)
  const addChapter = useAddChapter(trackId)
  const removeChapter = useRemoveChapter(trackId)
  const updateTrack = useUpdateTrack(trackId)

  const { chapters } = track
  const published = chapters.filter(c => c.status === 'published')
  const summary = {
    total: chapters.length,
    published: published.length,
    drafts: chapters.length - published.length,
    ready: chapters.filter(c => isReady(c.content)).length,
    publishedButEmpty: published.filter(c => !c.content.hasText && !c.isCertification).length,
  }

  // Any mutation in flight — one indicator rather than five, since they are all
  // edits to the same document.
  const saving =
    updateChapter.isPending ||
    reorder.isPending ||
    addChapter.isPending ||
    removeChapter.isPending ||
    updateTrack.isPending

  async function handleAdd() {
    setAddChapterError(null)

    // Starts as a draft, which is also the API's default. A chapter with no
    // content should never be born published — that is how the imported
    // syllabus ended up as 113 empty published rows.
    const id = `new-${Date.now()}`
    setEditingId(id)

    // A chapter that was ever archived out of this track still reserves its code (archived rows
    // are invisible to `chapters` — see `tracks/repository.ts`'s `eq(chapter.archived, false)` —
    // but the uniqueness constraint isn't). The obvious next number after the visible chapters can
    // therefore already be taken, so step forward past any reserved numbers rather than leaving
    // the admin re-clicking a button that fails on the same number every time.
    const start = chapters.reduce((max, c) => {
      const n = Number(c.code.slice(c.code.lastIndexOf('.') + 1))
      return Number.isFinite(n) ? Math.max(max, n) : max
    }, 0) + 1

    for (let suffix = start; suffix < start + CHAPTER_CREATE_ATTEMPTS; suffix++) {
      const chapter: CatalogChapter = {
        id,
        code: `${track.order}.${suffix}`,
        title: 'Untitled chapter',
        status: 'draft',
        isCertification: false,
        content: { script: null, hasText: false, segments: 0, audioCount: 0, mapped: false },
      }
      try {
        await addChapter.mutateAsync(chapter)
        return
      } catch (err) {
        if (!(err instanceof ApiError) || err.code !== 'RESOURCE_CONFLICT') {
          setAddChapterError(err instanceof ApiError ? err.message : 'Could not create the chapter.')
          setEditingId(null)
          return
        }
        // RESOURCE_CONFLICT: that code's taken, try the next one.
      }
    }

    setAddChapterError(`Could not find a free chapter number after ${CHAPTER_CREATE_ATTEMPTS} tries.`)
    setEditingId(null)
  }

  return (
    <>
      <Standing
        eyebrow="Administration · track catalog"
        headline={track.name}
        meta={`${track.subtitle ? `${track.subtitle} · ` : ''}${summary.total} chapters · taught in ${track.batchCodes.length} batches`}
        stats={[
          { value: `${summary.published}/${summary.total}`, label: 'Published' },
          { value: `${summary.ready}/${summary.total}`, label: 'Ready' },
        ]}
      />

      <div className="mx-auto max-w-5xl space-y-11 px-5 py-9">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/admin" className="label text-ink-muted transition-colors hover:text-ink">
            ← Administration
          </Link>
          {/* Not a deep link to this specific track — `/practice` shows every track a reader has,
              not one. Still worth the link: it's the nearest honest answer to "what does this
              look like once it's published" now that there's no more single-track reader page. */}
          <Link
            href="/practice"
            className="label text-ink-muted transition-colors hover:text-vermilion"
          >
            See the practice view →
          </Link>
          <span className="label ml-auto text-ink-muted" aria-live="polite">
            {saving ? 'Saving…' : 'Saved'}
          </span>
        </div>

        {/* The contradiction this page exists to expose: published means
            students can open it, and there is nothing inside. */}
        {summary.publishedButEmpty > 0 && (
          <Notice
            items={[
              {
                label: 'Empty',
                body: `${summary.publishedButEmpty} published chapters have no text uploaded. Students see a title and an empty practice room.`,
              },
            ]}
          />
        )}

        <Section title="Track">
          <div className="sheet grid grid-cols-1 divide-y divide-rule-soft sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <TrackField
              label="Name"
              value={track.name}
              onCommit={name => updateTrack.mutate({ name })}
            />
            <TrackField
              label="Subtitle"
              value={track.subtitle ?? ''}
              onCommit={subtitle => updateTrack.mutate({ subtitle })}
            />
          </div>

          <dl className="flex flex-wrap gap-x-8 gap-y-3">
            {[
              { label: 'Chapters', value: String(summary.total) },
              { label: 'Published', value: String(summary.published) },
              { label: 'Drafts', value: String(summary.drafts) },
              { label: 'Ready to practise', value: `${summary.ready}/${summary.total}` },
            ].map(stat => (
              <div key={stat.label}>
                <dt className="label text-ink-muted">{stat.label}</dt>
                <dd className="mt-1 font-mono text-[1.125rem]">{stat.value}</dd>
              </div>
            ))}
          </dl>

          {track.batchCodes.length > 0 && (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
              <span className="label text-ink-muted">Taught in</span>
              {track.batchCodes.map(code => (
                <Link
                  key={code}
                  href={`/admin/batches/${encodeURIComponent(code)}`}
                  className="font-mono text-[0.75rem] underline decoration-vermilion/40 decoration-1 underline-offset-4 transition-colors hover:decoration-vermilion"
                >
                  {code}
                </Link>
              ))}
            </div>
          )}
        </Section>

        <Section title="Chapters" count={`${chapters.length} in this track`}>
          <PipelineKey />

          <ol className="sheet">
            {chapters.map((chapter, index) => (
              <ChapterRow
                key={chapter.id}
                trackId={trackId}
                chapter={chapter}
                isFirst={index === 0}
                isLast={index === chapters.length - 1}
                isEditing={editingId === chapter.id}
                isConfirmingDelete={confirmDeleteId === chapter.id}
                onToggleEdit={() => setEditingId(id => (id === chapter.id ? null : chapter.id))}
                onChange={patch => updateChapter.mutate({ id: chapter.id, patch })}
                onMove={direction => reorder.mutate({ id: chapter.id, direction })}
                onAskDelete={() =>
                  setConfirmDeleteId(id => (id === chapter.id ? null : chapter.id))
                }
                onDelete={() => {
                  removeChapter.mutate({ id: chapter.id })
                  setConfirmDeleteId(null)
                }}
              />
            ))}
          </ol>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={addChapter.isPending}
              className="label border border-rule px-4 py-2.5 text-ink-muted transition-colors hover:border-vermilion hover:text-vermilion disabled:opacity-50"
            >
              + Add chapter
            </button>
            {addChapterError && <span className="label text-vermilion">{addChapterError}</span>}
          </div>
        </Section>
      </div>
    </>
  )
}

/**
 * A text field that commits on blur rather than on every keystroke.
 *
 * Mutating per character would fire a request per letter typed and, with
 * optimistic writes, make the cache the thing being edited — every keystroke
 * re-rendering the whole tree. The DOM holds the in-progress value (the input
 * is uncontrolled via `defaultValue`, keyed on the committed one) and the cache
 * only hears about it when the edit is finished.
 */
function TrackField({
  label,
  value,
  onCommit,
}: {
  label: string
  value: string
  onCommit: (next: string) => void
}) {
  return (
    <label className="block px-4 py-4">
      <span className="label text-ink-muted">{label}</span>
      <input
        key={value}
        defaultValue={value}
        onBlur={e => {
          const next = e.target.value.trim()
          if (next && next !== value) onCommit(next)
        }}
        className="mt-2 w-full border-b border-ink/20 bg-transparent pb-1.5 text-[1.125rem] transition-colors focus:border-vermilion focus:outline-none"
      />
    </label>
  )
}
