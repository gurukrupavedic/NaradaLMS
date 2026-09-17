'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin, { type Region } from 'wavesurfer.js/plugins/regions'

import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api/client'
import { useDeleteChapterAudioAsset, useSetChapterAudioMappings, useUploadChapterAudio } from '@/lib/query/use-content-mutations'
import {
  applyRegionEdit,
  createAudioMappingSession,
  formatTimestamp,
  markMappingEnd,
  setDraftStart,
  undoLastMapping,
  type DraftMapping,
  type MappableSegment,
} from '@/lib/audio-mapping-session'
import type { ApiAudioAsset } from '@/lib/api/api-types'

const REGION_COLOR = 'rgba(99, 91, 178, 0.28)' // indigo, matches the text segment highlight
const REGION_COLOR_ACTIVE = 'rgba(196, 74, 42, 0.32)' // vermilion, matches the "armed" treatment

/**
 * Waveform playback plus one draggable/resizable region per saved mapping — the two things a plain
 * `<audio>` + range-input transport can't give you: a visual read on where the silence between
 * recited lines actually falls, and a way to fix a boundary that's off by ear *after* marking it,
 * by dragging its edge until it lines up with what the waveform shows. Modeled on lyric-timer
 * (github.com/abesmon/lyric-timer)'s two-phase workflow — tap to stamp a rough mark, then drag on
 * the waveform to correct it — adapted from per-word lyric lines to per-segment recitation audio.
 *
 * Region edits only ever change local state; nothing reaches the server until Save, same as the
 * armed-marking flow below. Doesn't wire up the region-updated listener itself — the caller
 * subscribes on the returned `regions` ref once it also has `mappings`/`segments` in scope, since
 * validating an edit needs both.
 */
function useWaveformMapper({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WaveSurfer | null>(null)
  const regionsRef = useRef<RegionsPlugin | null>(null)

  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [pxPerSec, setPxPerSec] = useState(80)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const regions = RegionsPlugin.create()
    const ws = WaveSurfer.create({
      container,
      url,
      height: 88,
      waveColor: 'rgba(26, 22, 18, 0.35)',
      progressColor: 'rgba(26, 22, 18, 0.55)',
      cursorColor: '#c44a2a',
      normalize: true,
      minPxPerSec: pxPerSec,
      plugins: [regions],
    })
    wsRef.current = ws
    regionsRef.current = regions

    const onTime = () => setTime(ws.getCurrentTime())
    const onReady = () => setDuration(ws.getDuration())
    const onPlay = () => setPlaying(true)
    const onPauseOrEnd = () => setPlaying(false)
    ws.on('timeupdate', onTime)
    ws.on('ready', onReady)
    ws.on('play', onPlay)
    ws.on('pause', onPauseOrEnd)
    ws.on('finish', onPauseOrEnd)

    return () => {
      ws.destroy()
      wsRef.current = null
      regionsRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  useEffect(() => {
    // `zoom` throws until the waveform has finished decoding — `minPxPerSec` above already covers
    // the initial render, so this only needs to fire for zoom changes once audio is ready.
    if (duration > 0) wsRef.current?.zoom(pxPerSec)
  }, [pxPerSec, duration])

  const toggle = useCallback(() => wsRef.current?.playPause(), [])

  const seek = useCallback((to: number) => {
    const ws = wsRef.current
    if (!ws || !ws.getDuration()) return
    ws.setTime(Math.min(Math.max(to, 0), ws.getDuration()))
  }, [])

  return [
    { time, duration, playing, toggle, seek, pxPerSec, setPxPerSec },
    containerRef,
    regionsRef,
  ] as const
}

/** Keeps the waveform's regions in sync with `mappings` — cheapest correct approach is to redraw them all on any change rather than diff, since a chapter's mapping count is small and edits are infrequent (one drag, or one armed-mark, at a time). */
function useSyncRegions({
  regions,
  mappings,
  segments,
  armedSegmentId,
  ready,
}: {
  regions: RefObject<RegionsPlugin | null>
  mappings: DraftMapping[]
  segments: MappableSegment[]
  armedSegmentId: string | null
  ready: boolean
}) {
  useEffect(() => {
    const plugin = regions.current
    // Before the waveform has decoded the audio, wavesurfer doesn't know the track's duration yet
    // and clamps any `end` past it — collapsing every region to a zero-width marker at 0.
    if (!plugin || !ready) return
    plugin.clearRegions()
    for (const mapping of mappings) {
      const index = segments.findIndex(s => s.id === mapping.segmentId)
      if (index === -1) continue
      plugin.addRegion({
        id: mapping.segmentId,
        start: mapping.audioStart,
        end: mapping.audioEnd,
        color: mapping.segmentId === armedSegmentId ? REGION_COLOR_ACTIVE : REGION_COLOR,
        content: `${index + 1}`,
        drag: true,
        resize: true,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappings, segments, armedSegmentId, ready])
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
 *
 * That armed-marking pass gets you roughly right, fast — it doesn't get you *accurate*, because
 * "by ear, in real time" always lags the sound slightly. The waveform below is the correction
 * pass: every mapping is a region drawn on it, and dragging a region's edge until it lines up with
 * where the waveform actually shows the line starting is a lot more reliable than re-listening and
 * re-guessing. Rejects a drag that would overlap a neighboring segment's region rather than
 * resolving it automatically — same reasoning as `applyRegionEdit`'s own doc comment.
 */
function ArmedAudioMapper({ chapterId, asset, segments }: { chapterId: string; asset: ApiAudioAsset; segments: MappableSegment[] }) {
  const [mappings, setMappings] = useState<DraftMapping[]>(() => toDraftMappings(asset.mappings))
  const [draftStarts, setDraftStarts] = useState<Record<string, number>>({})
  const [dragError, setDragError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const setMappingsMutation = useSetChapterAudioMappings(chapterId)
  const deleteAsset = useDeleteChapterAudioAsset(chapterId)

  const [player, waveformContainerRef, regionsRef] = useWaveformMapper({ url: asset.url })
  const duration = player.duration || asset.duration

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
  } = createAudioMappingSession({ segments, mappings, currentTime: player.time, duration, draftStarts })

  useSyncRegions({ regions: regionsRef, mappings, segments, armedSegmentId: armedSegment?.id ?? null, ready: player.duration > 0 })

  useEffect(() => {
    const plugin = regionsRef.current
    if (!plugin) return
    const handler = (region: Region) => {
      const result = applyRegionEdit({ segments, mappings, segmentId: region.id, audioStart: region.start, audioEnd: region.end, duration })
      if (result.error) {
        setDragError(result.error)
        const original = mappings.find(m => m.segmentId === region.id)
        if (original) region.setOptions({ start: original.audioStart, end: original.audioEnd })
      } else {
        setDragError(null)
        setMappings(result.mappings)
      }
    }
    plugin.on('region-updated', handler)
    return () => plugin.un('region-updated', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, mappings, duration])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappings])

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

      {/* Waveform — every saved mapping is a draggable/resizable region on it, numbered to match
          the segment order above. Drag a region's edge to correct it; click empty waveform to seek. */}
      <div className="mt-4 border-t border-rule-soft pt-3.5">
        <div className="flex items-center justify-between">
          <span className="label text-ink-muted">Drag a region&apos;s edge to correct its boundary</span>
          <label className="flex shrink-0 items-center gap-1.5">
            <span className="label text-ink-muted">Zoom</span>
            <input
              type="range"
              min={20}
              max={400}
              step={10}
              value={player.pxPerSec}
              onChange={e => player.setPxPerSec(Number(e.target.value))}
              className="w-24 accent-[var(--vermilion)]"
            />
          </label>
        </div>
        <div ref={waveformContainerRef} className="mt-2 w-full overflow-x-auto border border-rule-soft" />
        {dragError && <p className="label mt-1.5 text-vermilion">{dragError}</p>}
      </div>

      {/* Transport */}
      <div className="mt-3 space-y-2">
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
