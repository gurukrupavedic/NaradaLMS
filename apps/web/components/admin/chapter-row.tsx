'use client'

import Link from 'next/link'

import { cn } from '@/lib/utils'
import { Pipeline } from '@/components/admin/pipeline'
import type { CatalogChapter, ScriptCode } from '@/lib/mock-catalog'

const SCRIPTS: ScriptCode[] = ['sa', 'te', 'en']

/**
 * One editable chapter row.
 *
 * Presentational and fully controlled: it holds no chapter state and performs
 * no mutation of its own, it reports intent upward. That keeps the optimistic
 * cache in `use-catalog-mutations.ts` the single source of truth — a row with
 * its own local copy of the chapter would drift from the cache the moment a
 * mutation rolled back, and the row would keep showing an edit the server had
 * already rejected.
 */
export function ChapterRow({
  trackId,
  chapter,
  isFirst,
  isLast,
  isEditing,
  isConfirmingDelete,
  onToggleEdit,
  onChange,
  onMove,
  onAskDelete,
  onDelete,
}: {
  trackId: string
  chapter: CatalogChapter
  isFirst: boolean
  isLast: boolean
  isEditing: boolean
  isConfirmingDelete: boolean
  onToggleEdit: () => void
  onChange: (patch: Partial<CatalogChapter>) => void
  onMove: (direction: -1 | 1) => void
  onAskDelete: () => void
  onDelete: () => void
}) {
  const published = chapter.status === 'published'

  return (
    <li className="border-b border-rule-soft last:border-0">
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 px-4 py-2.5">
        {/* Buttons rather than drag: reordering a syllabus is rare, wants to be
            precise, and has to work from a keyboard. */}
        <span className="flex shrink-0 flex-col">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={isFirst}
            aria-label={`Move ${chapter.code} up`}
            className="px-1 text-[0.625rem] leading-none text-ink-muted transition-colors hover:text-vermilion disabled:opacity-25"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={isLast}
            aria-label={`Move ${chapter.code} down`}
            className="px-1 text-[0.625rem] leading-none text-ink-muted transition-colors hover:text-vermilion disabled:opacity-25"
          >
            ▼
          </button>
        </span>

        <span className="w-12 shrink-0 font-mono text-[0.6875rem] text-ink-muted">
          {chapter.code}
        </span>

        <span className="flex min-w-0 flex-1 items-center gap-2.5">
          <span
            title={chapter.title}
            className={cn('truncate text-[0.875rem]', !published && 'text-ink-muted')}
          >
            {chapter.title}
          </span>
          {chapter.isCertification && <span className="stamp shrink-0">certification</span>}
        </span>

        {/* One wrap unit rather than three separate ones — on a narrow screen this drops to its
            own line together, instead of the row breaking mid-group (e.g. Pipeline wrapping but
            Edit staying stranded on the line above). */}
        <span className="ml-auto flex shrink-0 items-center gap-3.5">
          <Pipeline chapter={chapter} />

          <button
            type="button"
            onClick={() => onChange({ status: published ? 'draft' : 'published' })}
            aria-pressed={published}
            className={cn(
              'label min-w-24 shrink-0 whitespace-nowrap border px-2 py-1.5 text-center transition-colors',
              published
                ? 'border-rule text-ink'
                : 'border-dashed border-rule text-ink-muted hover:text-ink',
            )}
          >
            {published ? 'Published' : 'Draft'}
          </button>

          <button
            type="button"
            onClick={onToggleEdit}
            aria-expanded={isEditing}
            className="label w-10 shrink-0 text-right text-ink-muted transition-colors hover:text-vermilion"
          >
            {isEditing ? 'Close' : 'Edit'}
          </button>
        </span>
      </div>

      {isEditing && (
        <div className="border-t border-rule-soft bg-ink/[0.02] px-4 py-4">
          <div className="grid gap-4 sm:grid-cols-[7rem_1fr]">
            <label className="block">
              <span className="label text-ink-muted">Code</span>
              <input
                value={chapter.code}
                onChange={e => onChange({ code: e.target.value })}
                className="mt-1.5 w-full border-b border-ink/20 bg-transparent pb-1 font-mono text-[0.875rem] focus:border-vermilion focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="label text-ink-muted">Title</span>
              <input
                value={chapter.title}
                onChange={e => onChange({ title: e.target.value })}
                className="mt-1.5 w-full border-b border-ink/20 bg-transparent pb-1 text-[0.9375rem] focus:border-vermilion focus:outline-none"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-4">
            <div>
              <span className="label block text-ink-muted">Script</span>
              <div className="mt-1.5 flex items-center gap-px border border-rule">
                {SCRIPTS.map(code => {
                  const active = chapter.content.script === code
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() =>
                        onChange({
                          content: { ...chapter.content, script: active ? null : code },
                        })
                      }
                      aria-pressed={active}
                      className={cn(
                        'label px-2.5 py-1.5 transition-colors',
                        active
                          ? 'bg-ink text-paper'
                          : 'text-ink-muted hover:bg-ink/[0.04] hover:text-ink',
                      )}
                    >
                      {code.toUpperCase()}
                    </button>
                  )
                })}
              </div>
            </div>

            <label className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={chapter.isCertification}
                onChange={e => onChange({ isCertification: e.target.checked })}
                className="size-3.5 accent-[var(--vermilion)]"
              />
              <span className="label text-ink-muted">Certification chapter</span>
            </label>

            {isConfirmingDelete ? (
              <span className="ml-auto flex items-center gap-3">
                <span className="label text-vermilion">Archive {chapter.code}? It drops off this list on next reload.</span>
                <button
                  type="button"
                  onClick={onDelete}
                  className="label border border-vermilion px-2.5 py-1.5 text-vermilion"
                >
                  Archive
                </button>
                <button
                  type="button"
                  onClick={onAskDelete}
                  className="label text-ink-muted hover:text-ink"
                >
                  Keep
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={onAskDelete}
                className="label ml-auto text-ink-muted transition-colors hover:text-vermilion"
              >
                Archive chapter
              </button>
            )}
          </div>

          {/* Script text, audio takes, and their timestamp mappings all live on their own
              dedicated page now — a chapter's content is enough material (a rich-text script per
              language, a waveform per audio take) that it needs its own screen, not an accordion
              nested inside this row. */}
          <div className="mt-5 flex items-center gap-2.5 border-t border-rule-soft pt-4">
            <span className="label text-ink-muted">Content</span>
            <Link
              href={`/admin/tracks/${trackId}/chapters/${chapter.id}`}
              className={cn(
                'label border px-2.5 py-1.5 transition-colors',
                chapter.content.hasText || chapter.content.audioCount > 0
                  ? 'border-rule text-ink-muted hover:border-vermilion hover:text-vermilion'
                  : 'border-dashed border-rule text-ink-muted/70 hover:border-vermilion hover:text-vermilion',
              )}
            >
              {chapter.content.hasText || chapter.content.audioCount > 0
                ? `Edit content →`
                : 'Add content →'}
            </Link>
            {chapter.content.hasText && <span className="label text-ink-muted/60">✓ Scripts</span>}
            {chapter.content.audioCount > 0 && (
              <span className="label text-ink-muted/60">✓ Audio ({chapter.content.audioCount})</span>
            )}
          </div>
        </div>
      )}
    </li>
  )
}
