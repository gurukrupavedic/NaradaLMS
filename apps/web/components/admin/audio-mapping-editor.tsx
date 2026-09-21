'use client'

import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { useQuery } from '@tanstack/react-query'

import { cn } from '@/lib/utils'
import { Spinner } from '@/components/spinner'
import { formatClock } from '@/lib/mock-content'
import { chapterAuthoringDetailQuery } from '@/lib/query/options'
import { useDeleteChapterAudioAsset, useSetChapterAudioMappings } from '@/lib/query/use-content-mutations'
import type { ApiAudioAsset, ApiScriptSegment } from '@/lib/api/api-types'

type MappingRow = { segmentId: string; audioStart: string; audioEnd: string }

function toRows(mappings: ApiAudioAsset['mappings']): MappingRow[] {
  return mappings.map(m => ({
    segmentId: m.segmentId,
    audioStart: String(m.audioStart),
    audioEnd: String(m.audioEnd),
  }))
}

/**
 * A minimal real-audio player scoped to this file — no shared surface with `lib/use-transport.ts`
 * (the practice room's own player): that one needs loop/rate for drilling a line during practice,
 * this one only ever needs play/pause/seek to let an admin listen while marking boundaries.
 */
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

  const currentTime = useCallback(() => audioRef.current?.currentTime ?? 0, [])

  return { time, duration, playing, toggle, seek, currentTime }
}

/** One audio asset's mapping table — local editable state, scoped to this asset so switching between takes never mixes up unsaved edits. */
function AudioAssetMappings({
  chapterId,
  asset,
  segments,
}: {
  chapterId: string
  asset: ApiAudioAsset
  segments: ApiScriptSegment[]
}) {
  const [rows, setRows] = useState<MappingRow[]>(() => toRows(asset.mappings))
  const setMappings = useSetChapterAudioMappings(chapterId)
  const deleteAsset = useDeleteChapterAudioAsset(chapterId)
  const player = useAudioPlayer(asset.url)
  const timelineRef = useRef<HTMLDivElement | null>(null)
  const duration = player.duration || asset.duration

  function updateRow(index: number, patch: Partial<MappingRow>) {
    setRows(prev => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function mark(index: number, field: 'audioStart' | 'audioEnd') {
    updateRow(index, { [field]: player.currentTime().toFixed(2) })
  }

  function seekFromClick(event: MouseEvent<HTMLDivElement>) {
    const el = timelineRef.current
    if (!el || duration <= 0) return
    const rect = el.getBoundingClientRect()
    const fraction = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1)
    player.seek(fraction * duration)
  }

  function addRow() {
    setRows(prev => [...prev, { segmentId: segments[0]?.id ?? '', audioStart: '0', audioEnd: '0' }])
  }

  function removeRow(index: number) {
    setRows(prev => prev.filter((_, i) => i !== index))
  }

  function handleSave() {
    const mappings = rows.map(r => ({
      segmentId: r.segmentId,
      audioStart: Number(r.audioStart),
      audioEnd: Number(r.audioEnd),
    }))
    setMappings.mutate({ audioId: asset.id, mappings })
  }

  return (
    <div className="border-t border-rule-soft pt-3.5 first:border-0 first:pt-0">
      <div className="flex items-center gap-2.5">
        <span className="text-[0.875rem]">{asset.label ?? asset.reciter}</span>
        <span className="label text-ink-muted">{asset.reciter} · {asset.duration}s</span>
        <button
          type="button"
          onClick={() => deleteAsset.mutate(asset.id)}
          disabled={deleteAsset.isPending}
          aria-busy={deleteAsset.isPending}
          className="label ml-auto inline-flex items-center gap-2 text-ink-muted transition-colors hover:text-vermilion"
        >
          {deleteAsset.isPending && <Spinner />}
          {deleteAsset.isPending ? 'Removing…' : 'Remove take'}
        </button>
      </div>

      {/* The scrubber: click to seek, play to listen, then mark a row's boundary at whatever
          moment you're at — marking by ear instead of typing a guessed number. */}
      <div className="mt-2.5 flex items-center gap-2.5">
        <button
          type="button"
          onClick={player.toggle}
          className="label shrink-0 bg-ink px-2.5 py-1.5 text-paper"
          aria-label={player.playing ? 'Pause' : 'Play'}
        >
          {player.playing ? '❚❚' : '▶'}
        </button>
        <div
          ref={timelineRef}
          onClick={seekFromClick}
          role="slider"
          aria-label={`${asset.label ?? asset.reciter} playhead`}
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={player.time}
          className="relative h-6 flex-1 cursor-pointer bg-ink/[0.06]"
        >
          {rows.map((row, i) => {
            const start = Number(row.audioStart)
            const end = Number(row.audioEnd)
            if (duration <= 0 || !(end > start)) return null
            return (
              <span
                key={i}
                aria-hidden
                className="absolute inset-y-0 bg-indigo/25"
                style={{ left: `${(start / duration) * 100}%`, width: `${((end - start) / duration) * 100}%` }}
              />
            )
          })}
          {duration > 0 && (
            <span
              aria-hidden
              className="absolute inset-y-0 w-px bg-vermilion"
              style={{ left: `${(player.time / duration) * 100}%` }}
            />
          )}
        </div>
        <span className="w-24 shrink-0 text-right font-mono text-[0.6875rem] text-ink-muted tabular-nums">
          {formatClock(player.time)} / {formatClock(duration)}
        </span>
      </div>

      <div className="mt-2.5 space-y-1.5">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              value={row.segmentId}
              onChange={e => updateRow(i, { segmentId: e.target.value })}
              className="border-b border-ink/20 bg-transparent pb-1 font-mono text-[0.75rem] focus:border-vermilion focus:outline-none"
            >
              {segments.map((s, segIndex) => (
                <option key={s.id} value={s.id}>
                  line {segIndex + 1}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={row.audioStart}
              onChange={e => updateRow(i, { audioStart: e.target.value })}
              className="w-16 border-b border-ink/20 bg-transparent pb-1 font-mono text-[0.75rem] focus:border-vermilion focus:outline-none"
            />
            <button
              type="button"
              onClick={() => mark(i, 'audioStart')}
              title="Mark start at the current playhead"
              className="label text-ink-muted transition-colors hover:text-vermilion"
            >
              ↦
            </button>
            <span className="text-ink-muted/60">–</span>
            <input
              type="number"
              value={row.audioEnd}
              onChange={e => updateRow(i, { audioEnd: e.target.value })}
              className="w-16 border-b border-ink/20 bg-transparent pb-1 font-mono text-[0.75rem] focus:border-vermilion focus:outline-none"
            />
            <button
              type="button"
              onClick={() => mark(i, 'audioEnd')}
              title="Mark end at the current playhead"
              className="label text-ink-muted transition-colors hover:text-vermilion"
            >
              ↤
            </button>
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="label text-ink-muted transition-colors hover:text-vermilion"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-2.5 flex items-center gap-3">
        <button
          type="button"
          onClick={addRow}
          disabled={segments.length === 0}
          className="label text-ink-muted transition-colors hover:text-vermilion disabled:opacity-40"
        >
          + Add mapping
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={setMappings.isPending}
          aria-busy={setMappings.isPending}
          className={cn(
            'label inline-flex items-center gap-2 border border-rule px-3 py-1.5 transition-colors',
            setMappings.isPending ? 'text-ink-muted/50' : 'text-ink hover:border-vermilion hover:text-vermilion',
          )}
        >
          {setMappings.isPending && <Spinner />}
          {setMappings.isPending ? 'Saving…' : 'Save mappings'}
        </button>
      </div>
    </div>
  )
}

/** Every audio asset on this chapter, each with its own segment-to-time mapping table. Segment ids are shared across scripts, so any one script's segment list names the same lines. */
export function AudioMappingEditor({ chapterId }: { chapterId: string }) {
  const { data: detail } = useQuery(chapterAuthoringDetailQuery(chapterId))
  if (!detail) return null

  const segments = detail.scripts[0]?.segments ?? []

  if (detail.audio.length === 0) {
    return <p className="label text-ink-muted">No audio uploaded for this chapter yet.</p>
  }
  if (segments.length === 0) {
    return <p className="label text-ink-muted">Save a script with segments before mapping audio.</p>
  }

  return (
    <div className="space-y-3.5">
      {detail.audio.map(asset => (
        <AudioAssetMappings key={asset.id} chapterId={chapterId} asset={asset} segments={segments} />
      ))}
    </div>
  )
}
