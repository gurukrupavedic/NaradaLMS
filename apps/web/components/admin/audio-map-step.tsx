'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api/client'
import { useDeleteChapterAudioAsset, useSetChapterAudioMappings, useUploadChapterAudio } from '@/lib/query/use-content-mutations'
import {
  createAudioMappingSession,
  formatTimestamp,
  markMappingEnd,
  setDraftStart,
  undoLastMapping,
  type DraftMapping,
  type MappableSegment,
} from '@/lib/audio-mapping-session'
import type { ApiAudioAsset } from '@/lib/api/api-types'

/** Real play/pause/seek against the take's actual audio file — no shared surface with the practice room's own player (that one needs loop/rate for drilling a line; marking boundaries only ever needs to listen and read the clock). */
function useAudioPlayer(url: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const audio = new Audio(url)
    audioRef.current = audio
    const onTime = () => setTime(audio.currentTime)
    const onLoaded = () => setDuration(audio.duration)
    const onPlay = () => setPlaying(true)
    const onPauseOrEnd = () => setPlaying(false)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPauseOrEnd)
    audio.addEventListener('ended', onPauseOrEnd)
    return () => {
      audio.pause()
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPauseOrEnd)
      audio.removeEventListener('ended', onPauseOrEnd)
      audioRef.current = null
    }
  }, [url])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) void audio.play()
    else audio.pause()
  }, [])

  const seek = useCallback((to: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.min(Math.max(to, 0), audio.duration || to)
    setTime(audio.currentTime)
  }, [])

  return { time, duration, playing, toggle, seek }
}

function toDraftMappings(mappings: ApiAudioAsset['mappings']): DraftMapping[] {
  return mappings.map(m => ({ segmentId: m.segmentId, audioStart: m.audioStart, audioEnd: m.audioEnd }))
}

/**
 * One take's mapping session: exactly one segment is ever "armed" — the first with no mapping —
 * shown large and centered, with the last few already-mapped lines fading up above it and the
 * next few waiting below. Play the take, let it run, hit Mark End (or Space) the instant the
 * armed line finishes; the next line arms itself with its suggested start already at the
 * previous line's end, so there's nothing to type for a cleanly-read recitation. Set Start only
 * matters when the reciter paused or restarted between lines.
 */
function ArmedAudioMapper({ chapterId, asset, segments }: { chapterId: string; asset: ApiAudioAsset; segments: MappableSegment[] }) {
  const [mappings, setMappings] = useState<DraftMapping[]>(() => toDraftMappings(asset.mappings))
  const [draftStarts, setDraftStarts] = useState<Record<string, number>>({})
  const player = useAudioPlayer(asset.url)
  const duration = player.duration || asset.duration
  const containerRef = useRef<HTMLDivElement>(null)

  const setMappingsMutation = useSetChapterAudioMappings(chapterId)
  const deleteAsset = useDeleteChapterAudioAsset(chapterId)

  const session = createAudioMappingSession({ segments, mappings, currentTime: player.time, duration, draftStarts })
  const {
    armedIndex,
    armedSegment,
    suggestedStart,
    nextMappedStart,
    armedStart,
    canMarkEnd,
    willInvalidateFutureMappings,
    invalidatedFutureMappings,
    mappingMap,
    mappedCount,
    allMapped,
    prevMappedSegments,
    nextUnmappedSegments,
  } = session

  function markEnd() {
    setMappings(prev => markMappingEnd({ segments, mappings: prev, armedIndex, armedStart, currentTime: player.time, duration }))
  }

  function markStart() {
    setDraftStarts(prev => setDraftStart({ segment: armedSegment, suggestedStart, currentTime: player.time, duration, draftStarts: prev }))
  }

  const undoLast = useCallback(() => {
    const next = undoLastMapping(mappings)
    setMappings(next.mappings)
    if (next.currentTime !== null) player.seek(next.currentTime)
  }, [mappings, player])

  useEffect(() => {
    function handler(event: KeyboardEvent) {
      const el = containerRef.current
      if (!el) return
      if (!el.contains(document.activeElement) && document.activeElement !== document.body) return

      if (event.code === 'Space') {
        event.preventDefault()
        if (armedIndex !== null) markEnd()
      } else if (event.code === 'Backspace') {
        event.preventDefault()
        undoLast()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armedIndex, armedStart, player.time, duration, mappings, undoLast])

  function handleSave() {
    const payload = mappings.map(m => ({ segmentId: m.segmentId, audioStart: m.audioStart, audioEnd: m.audioEnd }))
    setMappingsMutation.mutate({ audioId: asset.id, mappings: payload })
  }

  const errorMessage = setMappingsMutation.error instanceof ApiError ? setMappingsMutation.error.message : null
  const dirty = mappings.length !== asset.mappings.length || mappings.some(m => {
    const saved = mappingMap.get(m.segmentId)
    return !asset.mappings.some(am => am.segmentId === m.segmentId && am.audioStart === m.audioStart && am.audioEnd === m.audioEnd) || !saved
  })

  return (
    <div ref={containerRef} tabIndex={-1} className="border border-rule-soft p-4">
      <div className="flex items-center gap-2.5">
        <span className="text-[0.9375rem]">{asset.label ?? asset.reciter}</span>
        <span className="label text-ink-muted">
          {asset.reciter} · {formatTimestamp(duration)}
        </span>
        <span className="label ml-auto text-ink-muted">
          {mappedCount}/{segments.length} mapped
        </span>
        <button
          type="button"
          onClick={() => deleteAsset.mutate(asset.id)}
          disabled={deleteAsset.isPending}
          className="label text-ink-muted transition-colors hover:text-vermilion"
        >
          {deleteAsset.isPending ? 'Removing…' : 'Remove take'}
        </button>
      </div>

      {/* Previously mapped — faded, up to 3 */}
      <div className="mt-4 min-h-16 space-y-1.5">
        {prevMappedSegments.slice(-3).map(seg => {
          const mapping = mappingMap.get(seg.id)
          return (
            <div key={seg.id} className="flex items-center gap-2.5 opacity-40">
              <span className="grid size-4 shrink-0 place-items-center bg-ink text-[0.5625rem] text-paper">✓</span>
              <span className="min-w-0 flex-1 truncate text-[0.8125rem]">{seg.text}</span>
              {mapping && (
                <span className="label shrink-0 font-mono text-ink-muted">
                  {formatTimestamp(mapping.audioStart)}–{formatTimestamp(mapping.audioEnd)}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Armed segment — the one hero treatment */}
      <div className="my-2 border border-vermilion/30 bg-vermilion/[0.04] px-6 py-5 text-center">
        {armedSegment ? (
          <>
            <div className="flex items-center justify-center gap-2">
              <span className="grid size-5 shrink-0 place-items-center bg-vermilion text-[0.625rem] font-bold text-paper">{armedIndex! + 1}</span>
              <span className="label text-vermilion">Now mapping</span>
            </div>
            <p className="mt-2.5 text-[1.25rem] leading-relaxed">{armedSegment.text}</p>
            <div className="mt-2 flex items-center justify-center gap-1.5 font-mono text-[0.75rem] text-ink-muted">
              <span>{armedStart !== null ? formatTimestamp(armedStart) : '—'}</span>
              <span>→</span>
              <span>{formatTimestamp(player.time)}</span>
              {nextMappedStart !== undefined && (
                <span className="text-ink-muted/50">/ next {formatTimestamp(nextMappedStart)}</span>
              )}
            </div>
            {willInvalidateFutureMappings && (
              <p className="label mt-2 text-vermilion">
                Marking here clears {invalidatedFutureMappings.length} later mapping{invalidatedFutureMappings.length === 1 ? '' : 's'}.
              </p>
            )}
          </>
        ) : (
          <p className="label text-ink-muted">All segments mapped</p>
        )}
      </div>

      {/* Upcoming — faded queue, up to 3 */}
      <div className="min-h-16 space-y-1.5">
        {nextUnmappedSegments.slice(0, 3).map((seg, i) => (
          <div key={seg.id} className="flex items-center gap-2.5 opacity-30">
            <span className="grid size-4 shrink-0 place-items-center border border-rule text-[0.5625rem]">{armedIndex! + 2 + i}</span>
            <span className="min-w-0 flex-1 truncate text-[0.8125rem]">{seg.text}</span>
          </div>
        ))}
      </div>

      {/* Transport */}
      <div className="mt-4 space-y-2 border-t border-rule-soft pt-3.5">
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={player.time}
          onChange={e => player.seek(Number(e.target.value))}
          className="w-full accent-[var(--vermilion)]"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={player.toggle} className="label shrink-0 bg-ink px-2.5 py-1.5 text-paper">
            {player.playing ? '❚❚ Pause' : '▶ Play'}
          </button>
          <span className="font-mono text-[0.75rem] text-ink-muted tabular-nums">
            {formatTimestamp(player.time)} / {formatTimestamp(duration)}
          </span>
          {armedSegment && (
            <>
              <button type="button" onClick={markStart} className="label border border-rule px-2 py-1 text-ink-muted transition-colors hover:border-vermilion hover:text-vermilion">
                Set start
              </button>
              <button
                type="button"
                onClick={markEnd}
                disabled={!canMarkEnd}
                className={cn(
                  'label border px-2 py-1 transition-colors',
                  canMarkEnd ? 'border-rule text-ink-muted hover:border-vermilion hover:text-vermilion' : 'border-rule text-ink-muted/40',
                )}
              >
                Mark end
              </button>
            </>
          )}
          {mappings.length > 0 && (
            <button type="button" onClick={undoLast} className="label text-ink-muted transition-colors hover:text-vermilion">
              Undo
            </button>
          )}
          <span className="label ml-auto hidden text-ink-muted/50 sm:inline">space marks end · ⌫ undoes</span>
        </div>
      </div>

      <div className="mt-3.5 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={setMappingsMutation.isPending || !dirty}
          className={cn(
            'label border border-rule px-3 py-1.5 transition-colors',
            setMappingsMutation.isPending || !dirty ? 'text-ink-muted/50' : 'text-ink hover:border-vermilion hover:text-vermilion',
          )}
        >
          {setMappingsMutation.isPending ? 'Saving…' : allMapped ? 'Save mappings' : `Save ${mappedCount}/${segments.length} mapped so far`}
        </button>
        {setMappingsMutation.isSuccess && !dirty && <span className="label text-ink-muted">Saved — persists for real.</span>}
      </div>
      {errorMessage && <p className="label mt-1.5 text-vermilion">{errorMessage}</p>}
    </div>
  )
}

function AudioTakeUploader({ chapterId }: { chapterId: string }) {
  const [file, setFile] = useState<File | null>(null)
  const [label, setLabel] = useState('')
  const [reciter, setReciter] = useState('')
  const [progress, setProgress] = useState(0)
  const mutation = useUploadChapterAudio(chapterId)

  function handleUpload() {
    if (!file || !reciter.trim()) return
    setProgress(0)
    mutation.mutate(
      { file, label: label.trim() || null, reciter: reciter.trim(), onProgress: setProgress },
      { onSuccess: () => { setFile(null); setLabel(''); setReciter('') } },
    )
  }

  const errorMessage = mutation.error instanceof ApiError ? mutation.error.message : mutation.error?.message

  return (
    <div className="border border-dashed border-rule p-4">
      <span className="label text-ink-muted">Upload a new take</span>
      <div className="mt-2 grid gap-3 sm:grid-cols-3">
        <input type="file" accept="audio/*" onChange={e => setFile(e.target.files?.[0] ?? null)} className="text-[0.8125rem]" />
        <input
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="Label, e.g. Practice take"
          className="border-b border-ink/20 bg-transparent pb-1 text-[0.8125rem] focus:border-vermilion focus:outline-none"
        />
        <input
          value={reciter}
          onChange={e => setReciter(e.target.value)}
          placeholder="Reciter"
          className="border-b border-ink/20 bg-transparent pb-1 text-[0.8125rem] focus:border-vermilion focus:outline-none"
        />
      </div>
      {errorMessage && <p className="label mt-2 text-vermilion">{errorMessage}</p>}
      {mutation.isPending && (
        <div className="mt-2 h-1 w-full bg-ink/10">
          <div className="h-full bg-ink transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      )}
      <button
        type="button"
        onClick={handleUpload}
        disabled={!file || !reciter.trim() || mutation.isPending}
        className={cn(
          'label mt-2.5 border border-rule px-3 py-1.5 transition-colors',
          !file || !reciter.trim() || mutation.isPending ? 'text-ink-muted/50' : 'text-ink hover:border-vermilion hover:text-vermilion',
        )}
      >
        {mutation.isPending ? `Uploading… ${progress}%` : 'Upload'}
      </button>
    </div>
  )
}

/** The chapter's whole audio step: an uploader plus one armed-mapping session per take. */
export function AudioMapStep({ chapterId, segments, audio }: { chapterId: string; segments: MappableSegment[]; audio: ApiAudioAsset[] }) {
  if (segments.length === 0) {
    return <p className="label text-ink-muted">Mark segments in the Segments step before mapping audio.</p>
  }

  return (
    <div className="space-y-4">
      <AudioTakeUploader chapterId={chapterId} />
      {audio.length === 0 ? (
        <p className="label text-ink-muted">No audio uploaded for this chapter yet.</p>
      ) : (
        audio.map(asset => <ArmedAudioMapper key={asset.id} chapterId={chapterId} asset={asset} segments={segments} />)
      )}
    </div>
  )
}
