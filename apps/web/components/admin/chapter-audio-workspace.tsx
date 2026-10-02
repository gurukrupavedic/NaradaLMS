'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'

import { ScreenError } from '@/components/screen-error'
import { ScreenSkeleton } from '@/components/skeletons'
import { Spinner } from '@/components/spinner'
import { Standing } from '@/components/standing'
import type { ApiAudioAsset, ApiAudioMapping, ApiChapterDetail, ApiScriptKey, ApiScriptSegment } from '@/lib/api/api-types'
import { useCoursePath } from '@/lib/course'
import { formatClock } from '@/lib/models/content'
import { pluralize } from '@/lib/pluralize'
import { chapterAudioDetailQuery } from '@/lib/query/options'
import {
  useDeleteChapterAudioAsset,
  useSetAudioMappings,
  useUploadChapterAudio,
} from '@/lib/query/use-chapter-audio-mutations'
import { useTransport } from '@/lib/use-transport'
import { cn } from '@/lib/utils'

const SCRIPTS: { key: ApiScriptKey; label: string; fontClass: string }[] = [
  { key: 'sa', label: 'SA', fontClass: 'font-deva' },
  { key: 'te', label: 'TE', fontClass: 'font-telugu' },
  { key: 'en', label: 'EN', fontClass: '' },
]

/**
 * Map a chapter's recordings to its text, segment by segment.
 *
 * Reciter/take picker up top, then one "armed segment" tap-to-stamp loop: the first segment (in
 * the selected script's order) with no mapping for the selected recording is highlighted,
 * `suggestedStart` is wherever the previous mapping left off, and tapping Stamp commits
 * `[suggestedStart, currentTime]` — the server's reshaped response (not a local prediction) is
 * what every other doc-chapter screen writes into its cache, but here the edit has to feel instant
 * while the admin is listening along, so this one goes through `use-chapter-audio-mutations.ts`'s
 * optimistic write instead (same onMutate/onError/onSettled shape `use-catalog-mutations.ts`
 * documents).
 *
 * Split into a container that resolves the query and a view that renders it, same shape as every
 * other workspace this feature added.
 */
export function ChapterAudioWorkspace({ chapterId }: { chapterId: string }) {
  const cp = useCoursePath()
  const { data: detail, error } = useQuery(chapterAudioDetailQuery(chapterId))

  if (error) return <ScreenError error={error} backHref={cp('/admin')} backLabel="← Administration" />
  if (!detail) return <ScreenSkeleton rows={8} />

  return <ChapterAudioWorkspaceView chapterId={chapterId} detail={detail} />
}

function ChapterAudioWorkspaceView({ chapterId, detail }: { chapterId: string; detail: ApiChapterDetail }) {
  const cp = useCoursePath()
  const [script, setScript] = useState<ApiScriptKey>('sa')
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(detail.audio[0]?.id ?? null)
  const [uploading, setUploading] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const setMappings = useSetAudioMappings(chapterId)
  const deleteAsset = useDeleteChapterAudioAsset(chapterId)

  const segments = detail.scripts.find(s => s.key === script)?.segments ?? []
  const selectedAudio = detail.audio.find(a => a.id === selectedAudioId) ?? null

  return (
    <>
      <Standing
        eyebrow={`Chapter ${detail.code} · audio mapping`}
        headline={detail.title}
        meta={`${pluralize(segments.length, 'segment')} · ${pluralize(detail.audio.length, 'recording')}`}
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

      <div className="mx-auto max-w-4xl space-y-8 px-5 py-9">
        <Link href={cp(`/admin/tracks/${detail.trackId}`)} className="label text-ink-muted transition-colors hover:text-ink">
          ← Track
        </Link>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {detail.audio.map(asset => (
              <button
                key={asset.id}
                type="button"
                onClick={() => setSelectedAudioId(asset.id)}
                aria-pressed={asset.id === selectedAudioId}
                className={cn(
                  'label border px-3 py-2 transition-colors',
                  asset.id === selectedAudioId
                    ? 'border-ink bg-ink text-paper'
                    : 'border-rule text-ink-muted hover:border-vermilion hover:text-vermilion',
                )}
              >
                {asset.label ?? asset.reciter}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setUploading(true)}
              className="label border border-dashed border-rule px-3 py-2 text-ink-muted transition-colors hover:border-vermilion hover:text-vermilion"
            >
              + Add recording
            </button>
          </div>

          {selectedAudio && (
            <div className="flex items-center gap-3">
              <span className="label text-ink-muted">Reciter: {selectedAudio.reciter}</span>
              {confirmDeleteId === selectedAudio.id ? (
                <span className="flex items-center gap-2">
                  <span className="label text-vermilion">Delete this recording?</span>
                  <button
                    type="button"
                    onClick={() => {
                      deleteAsset.mutate(selectedAudio.id)
                      setConfirmDeleteId(null)
                      setSelectedAudioId(detail.audio.find(a => a.id !== selectedAudio.id)?.id ?? null)
                    }}
                    className="label border border-vermilion px-2.5 py-1 text-vermilion"
                  >
                    Delete
                  </button>
                  <button type="button" onClick={() => setConfirmDeleteId(null)} className="label text-ink-muted hover:text-ink">
                    Keep
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(selectedAudio.id)}
                  className="label text-ink-muted transition-colors hover:text-vermilion"
                >
                  Delete recording
                </button>
              )}
            </div>
          )}
        </div>

        {uploading && (
          <UploadTakeForm
            chapterId={chapterId}
            onDone={assetId => {
              setUploading(false)
              setSelectedAudioId(assetId)
            }}
            onCancel={() => setUploading(false)}
          />
        )}

        {selectedAudio ? (
          <AudioMapper
            key={selectedAudio.id}
            audio={selectedAudio}
            segments={segments}
            fontClass={SCRIPTS.find(s => s.key === script)?.fontClass ?? ''}
            scriptLabel={script.toUpperCase()}
            saving={setMappings.isPending}
            onCommitMappings={mappings => setMappings.mutate({ audioId: selectedAudio.id, mappings })}
          />
        ) : (
          <p className="text-[0.9375rem] text-ink-muted">Add a recording to start mapping.</p>
        )}
      </div>
    </>
  )
}

// ── Upload a new take ────────────────────────────────────────────────────────

function UploadTakeForm({
  chapterId,
  onDone,
  onCancel,
}: {
  chapterId: string
  onDone: (assetId: string) => void
  onCancel: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [reciter, setReciter] = useState('')
  const [label, setLabel] = useState('')
  const upload = useUploadChapterAudio(chapterId)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !reciter.trim()) return
    upload.mutate({ file, reciter, label }, { onSuccess: asset => onDone(asset.id) })
  }

  return (
    <form onSubmit={handleSubmit} className="sheet space-y-5 px-5 py-6">
      <label className="block">
        <span className="label block text-ink-muted">Audio file</span>
        <input
          type="file"
          required
          accept="audio/mpeg,audio/wav,audio/aac,audio/ogg,audio/mp4,.mp3,.wav,.m4a,.ogg"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          className="label mt-2 block w-full text-ink-muted file:mr-3 file:border file:border-rule file:bg-transparent file:px-3 file:py-1.5 file:font-[inherit] file:text-[inherit] file:text-ink file:transition-colors hover:file:border-vermilion hover:file:text-vermilion"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label text-ink-muted">Reciter</span>
          <input
            value={reciter}
            onChange={e => setReciter(e.target.value)}
            required
            className="mt-1.5 w-full border-b border-ink/20 bg-transparent pb-1 text-[0.9375rem] focus:border-vermilion focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="label text-ink-muted">Label (optional)</span>
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="e.g. Take 2"
            className="mt-1.5 w-full border-b border-ink/20 bg-transparent pb-1 text-[0.9375rem] focus:border-vermilion focus:outline-none"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={upload.isPending || !file || !reciter.trim()}
          aria-busy={upload.isPending}
          className="label inline-flex items-center gap-2 bg-ink px-4 py-2 text-paper transition-opacity disabled:opacity-50"
        >
          {upload.isPending && <Spinner />}
          {upload.isPending ? 'Uploading…' : 'Upload'}
        </button>
        <button type="button" onClick={onCancel} className="label text-ink-muted transition-colors hover:text-ink">
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Tap-to-stamp mapper ──────────────────────────────────────────────────────

function AudioMapper({
  audio,
  segments,
  fontClass,
  scriptLabel,
  saving,
  onCommitMappings,
}: {
  audio: ApiAudioAsset
  segments: ApiScriptSegment[]
  fontClass: string
  scriptLabel: string
  saving: boolean
  onCommitMappings: (mappings: ApiAudioMapping[]) => void
}) {
  const transport = useTransport(audio.url, audio.duration)

  const mappingBySegment = new Map(audio.mappings.map(m => [m.segmentId, m]))
  const armedIndex = segments.findIndex(s => !mappingBySegment.has(s.id))
  const armedSegment = armedIndex === -1 ? null : segments[armedIndex]!
  const suggestedStart =
    armedIndex > 0 ? mappingBySegment.get(segments[armedIndex - 1]!.id)?.audioEnd ?? 0 : 0
  const lastMapped = [...audio.mappings].sort((a, b) => b.audioStart - a.audioStart)[0] ?? null

  function stamp() {
    if (!armedSegment) return
    const start = suggestedStart
    const end = transport.time
    if (end <= start) return

    // Only a mapping for a segment *after* the one just stamped is at risk — an earlier, already
    // settled mapping can never genuinely overlap a fresh stamp that starts where it left off.
    const laterIds = new Set(segments.slice(armedIndex + 1).map(s => s.id))
    const kept = audio.mappings.filter(
      m => !laterIds.has(m.segmentId) || m.audioEnd <= start || m.audioStart >= end,
    )
    const next = [...kept, { segmentId: armedSegment.id, audioStart: start, audioEnd: end }].sort(
      (a, b) => a.audioStart - b.audioStart,
    )
    onCommitMappings(next)
  }

  function undo() {
    if (!lastMapped) return
    onCommitMappings(audio.mappings.filter(m => m.segmentId !== lastMapped.segmentId))
    transport.seek(lastMapped.audioStart)
  }

  const sortedMappings = [...audio.mappings].sort((a, b) => a.audioStart - b.audioStart)
  const lastEnd = sortedMappings.at(-1)?.audioEnd ?? 0

  return (
    <div className="sheet space-y-6 px-5 py-6">
      <div className="space-y-2">
        <div className="flex items-center gap-px" role="group" aria-label="Mapped segments">
          {sortedMappings.map(m => {
            const width = ((m.audioEnd - m.audioStart) / audio.duration) * 100
            const fill =
              transport.time >= m.audioStart && transport.time < m.audioEnd
                ? ((transport.time - m.audioStart) / (m.audioEnd - m.audioStart)) * 100
                : transport.time >= m.audioEnd
                  ? 100
                  : 0
            return (
              <span key={m.segmentId} style={{ width: `${width}%` }} className="relative h-2.5 shrink-0 bg-ink/[0.08]">
                <span className="absolute inset-0 bg-indigo/45" />
                {fill > 0 && fill < 100 && (
                  <span className="absolute inset-y-0 left-0 bg-vermilion" style={{ width: `${fill}%` }} />
                )}
              </span>
            )
          })}
          {lastEnd < audio.duration && (
            <span
              style={{ width: `${((audio.duration - lastEnd) / audio.duration) * 100}%` }}
              className="h-2.5 shrink-0 border border-dashed border-rule"
            />
          )}
        </div>

        <input
          type="range"
          min={0}
          max={audio.duration}
          step={0.01}
          value={transport.time}
          onChange={e => transport.seek(Number(e.target.value))}
          className="block w-full"
          aria-label="Scrub"
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <button
          type="button"
          onClick={transport.toggle}
          className="label flex shrink-0 items-center gap-2 bg-ink px-4 py-2 text-paper"
          aria-label={transport.playing ? 'Pause' : 'Play'}
        >
          <span aria-hidden className="text-[0.7rem] leading-none">
            {transport.playing ? '❚❚' : '▶'}
          </span>
          {transport.playing ? 'Pause' : 'Play'}
        </button>

        <span className="font-mono text-[0.8125rem] text-ink-muted tabular-nums">
          {formatClock(transport.time)} / {formatClock(audio.duration)}
        </span>

        <button
          type="button"
          onClick={undo}
          disabled={!lastMapped}
          className="label ml-auto shrink-0 border border-rule px-3 py-2 text-ink-muted transition-colors hover:border-vermilion hover:text-vermilion disabled:opacity-40"
        >
          ⟲ Undo last stamp
        </button>

        <span className="label shrink-0 text-ink-muted" aria-live="polite">
          {saving ? 'Saving…' : 'Saved'}
        </span>
      </div>

      <ol>
        {segments.map((segment, i) => {
          const mapping = mappingBySegment.get(segment.id)
          const isArmed = segment.id === armedSegment?.id

          return (
            <li
              key={segment.id}
              className={cn(
                'flex items-start gap-4 border-b border-rule-soft px-2 py-3 last:border-0',
                isArmed && 'bg-vermilion/[0.06]',
              )}
            >
              <span className="w-8 shrink-0 pt-1.5 font-mono text-[0.6875rem] tabular-nums text-ink-muted/55">
                {i + 1}
              </span>

              <p className="min-w-0 flex-1">
                {segment.text ? (
                  <span className={cn(fontClass, 'block text-[1.125rem] leading-[1.7]')}>{segment.text}</span>
                ) : (
                  <span className="block text-[0.9375rem] text-ink-muted/40 italic">
                    — no {scriptLabel} text —
                  </span>
                )}
              </p>

              {mapping ? (
                <span className="label shrink-0 pt-1.5 font-mono text-ink-muted">
                  {formatClock(mapping.audioStart)}–{formatClock(mapping.audioEnd)}
                </span>
              ) : isArmed ? (
                <span className="flex shrink-0 items-center gap-3 pt-0.5">
                  <span className="label font-mono text-ink-muted">from {formatClock(suggestedStart)}</span>
                  <button
                    type="button"
                    onClick={stamp}
                    disabled={transport.time <= suggestedStart}
                    className="label border border-vermilion px-2.5 py-1.5 text-vermilion disabled:opacity-40"
                  >
                    Stamp
                  </button>
                </span>
              ) : null}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
