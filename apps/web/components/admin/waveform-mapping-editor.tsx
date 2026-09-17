'use client'

import { useEffect, useRef, useState } from 'react'
import Peaks, { type PeaksInstance } from 'peaks.js'

import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api/client'
import { formatClock } from '@/lib/mock-content'
import { useDeleteChapterAudioAsset, useSetChapterAudioMappings } from '@/lib/query/use-content-mutations'
import type { ApiAudioAsset, ApiScriptSegment } from '@/lib/api/api-types'

type Row = { segmentId: string; start: number; end: number }

function toRows(segments: ApiScriptSegment[], mappings: ApiAudioAsset['mappings']): Row[] {
  return segments.map(s => {
    const mapping = mappings.find(m => m.segmentId === s.id)
    return { segmentId: s.id, start: mapping?.audioStart ?? 0, end: mapping?.audioEnd ?? 0 }
  })
}

/**
 * A real waveform, built on Peaks.js (BBC's open-source library for exactly this: labeled,
 * draggable audio segments over a waveform, the same building block behind real captioning/
 * transcription tools) — one editable segment per script line, plus a "tap pass" mode — play the
 * audio and press Space at each line's onset, same interaction as
 * https://abesmon.github.io/lyric-timer/ — which times a continuous recitation far faster than
 * placing every boundary by hand. Both paths write to the same `rows` state; either can finish
 * what the other started.
 */
export function WaveformMappingEditor({
  chapterId,
  asset,
  segments,
}: {
  chapterId: string
  asset: ApiAudioAsset
  segments: ApiScriptSegment[]
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const zoomviewRef = useRef<HTMLDivElement | null>(null)
  const overviewRef = useRef<HTMLDivElement | null>(null)
  const peaksRef = useRef<PeaksInstance | null>(null)
  const rowsRef = useRef<Row[]>(toRows(segments, asset.mappings))
  const suppressNextSyncRef = useRef(false)

  const [rows, setRows] = useState<Row[]>(() => toRows(segments, asset.mappings))
  const [selected, setSelected] = useState<number | null>(null)
  const [ready, setReady] = useState(false)
  const [duration, setDuration] = useState(asset.duration)
  const [playing, setPlaying] = useState(false)
  const [tapPass, setTapPass] = useState<{ boundaries: number[] } | null>(null)

  const setMappings = useSetChapterAudioMappings(chapterId)
  const deleteAsset = useDeleteChapterAudioAsset(chapterId)

  useEffect(() => {
    rowsRef.current = rows
  }, [rows])

  // Peaks owns the waveform canvases imperatively — this effect is the one place that ever
  // touches it, torn down and rebuilt only if the audio itself changes.
  useEffect(() => {
    if (!audioRef.current || !zoomviewRef.current || !overviewRef.current) return
    let cancelled = false

    Peaks.init(
      {
        mediaElement: audioRef.current,
        zoomview: { container: zoomviewRef.current },
        overview: { container: overviewRef.current },
        webAudio: { audioContext: new AudioContext() },
        segmentOptions: { markers: true, overlay: true },
        keyboard: false,
      },
      (err, peaksInstance) => {
        if (cancelled || err || !peaksInstance) return
        peaksRef.current = peaksInstance
        setDuration(peaksInstance.player.getDuration())
        setReady(true)
        syncSegments(peaksInstance, rowsRef.current)

        peaksInstance.on('segments.dragend', event => {
          suppressNextSyncRef.current = true
          const seg = event.segment
          setRows(prev =>
            prev.map(r => (r.segmentId === seg.id ? { ...r, start: seg.startTime, end: seg.endTime } : r)),
          )
        })
        peaksInstance.on('segments.click', event => {
          const index = segments.findIndex(s => s.id === event.segment.id)
          if (index >= 0) setSelected(index)
        })
        peaksInstance.on('player.playing', () => setPlaying(true))
        peaksInstance.on('player.pause', () => setPlaying(false))
        peaksInstance.on('player.ended', () => setPlaying(false))
      },
    )

    return () => {
      cancelled = true
      peaksRef.current?.destroy()
      peaksRef.current = null
      setReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.url])

  // Redraw segments whenever rows change from outside a drag (row edits, tap-pass progress) — a
  // drag itself already updates `rows` via 'segments.dragend' above, so this only fires for the
  // other direction and never fights the user mid-drag.
  useEffect(() => {
    if (suppressNextSyncRef.current) {
      suppressNextSyncRef.current = false
      return
    }
    const peaksInstance = peaksRef.current
    if (peaksInstance && ready) syncSegments(peaksInstance, rows)
  }, [rows, segments, ready])

  function finishTapPass(boundaries: number[]) {
    const end = peaksRef.current?.player.getDuration() || duration
    setRows(
      segments.map((s, i) => ({
        segmentId: s.id,
        start: boundaries[i] ?? 0,
        end: boundaries[i + 1] ?? end,
      })),
    )
    setTapPass(null)
    peaksRef.current?.player.pause()
  }

  useEffect(() => {
    if (!tapPass) return
    const activePass = tapPass
    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== 'Space' && e.key !== 'Enter') return
      e.preventDefault()
      const peaksInstance = peaksRef.current
      if (!peaksInstance) return
      const boundaries = [...activePass.boundaries, peaksInstance.player.getCurrentTime()]
      if (boundaries.length >= segments.length) {
        finishTapPass(boundaries)
      } else {
        setTapPass({ boundaries })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tapPass, segments.length])

  function startTapPass() {
    setSelected(null)
    setTapPass({ boundaries: [] })
    peaksRef.current?.player.seek(0)
    void peaksRef.current?.player.play()
  }

  function stopTapPass() {
    setTapPass(null)
    peaksRef.current?.player.pause()
  }

  function updateRow(index: number, patch: Partial<Row>) {
    setRows(prev => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function markAtPlayhead(index: number, field: 'start' | 'end') {
    const time = peaksRef.current?.player.getCurrentTime() ?? 0
    updateRow(index, { [field]: time })
  }

  function handleSave() {
    const mappings = rows.filter(r => r.end > r.start).map(r => ({ segmentId: r.segmentId, audioStart: r.start, audioEnd: r.end }))
    setMappings.mutate({ audioId: asset.id, mappings })
  }

  const errorMessage = setMappings.error instanceof ApiError ? setMappings.error.message : null

  return (
    <div className="border-t border-rule-soft pt-3.5 first:border-0 first:pt-0">
      <div className="flex items-center gap-2.5">
        <span className="text-[0.875rem]">{asset.label ?? asset.reciter}</span>
        <span className="label text-ink-muted">
          {asset.reciter} · {formatClock(duration)}
        </span>
        <button
          type="button"
          onClick={() => deleteAsset.mutate(asset.id)}
          disabled={deleteAsset.isPending}
          className="label ml-auto text-ink-muted transition-colors hover:text-vermilion"
        >
          {deleteAsset.isPending ? 'Removing…' : 'Remove take'}
        </button>
      </div>

      <audio ref={audioRef} src={asset.url} crossOrigin="anonymous" className="hidden" />
      <div ref={zoomviewRef} className="mt-2.5 h-24 bg-ink/[0.03]" />
      <div ref={overviewRef} className="mt-1 h-10 bg-ink/[0.03]" />

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => (playing ? peaksRef.current?.player.pause() : void peaksRef.current?.player.play())}
          disabled={!ready}
          className="label shrink-0 bg-ink px-2.5 py-1.5 text-paper disabled:opacity-40"
        >
          {playing ? '❚❚ Pause' : '▶ Play'}
        </button>
        {tapPass ? (
          <>
            <span className="label text-vermilion">
              Tap pass — line {tapPass.boundaries.length + 1} of {segments.length}. Press Space or
              Enter at each line&apos;s onset.
            </span>
            <button type="button" onClick={stopTapPass} className="label text-ink-muted hover:text-vermilion">
              Stop
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={startTapPass}
            disabled={!ready || segments.length === 0}
            className="label text-ink-muted transition-colors hover:text-vermilion disabled:opacity-40"
          >
            ⏱ Start tap pass
          </button>
        )}
      </div>

      <div className="mt-2.5 space-y-1.5">
        {segments.map((s, i) => (
          <div
            key={s.id}
            onClick={() => setSelected(i)}
            className={cn(
              'flex cursor-pointer items-center gap-2 px-1 py-0.5',
              selected === i && 'bg-vermilion/5',
            )}
          >
            <span className="label w-14 shrink-0 text-ink-muted">line {i + 1}</span>
            <input
              type="number"
              step="0.01"
              value={rows[i]?.start ?? 0}
              onClick={e => e.stopPropagation()}
              onChange={e => updateRow(i, { start: Number(e.target.value) })}
              className="w-20 border-b border-ink/20 bg-transparent pb-1 font-mono text-[0.75rem] focus:border-vermilion focus:outline-none"
            />
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                markAtPlayhead(i, 'start')
              }}
              title="Mark start at the current playhead"
              className="label text-ink-muted transition-colors hover:text-vermilion"
            >
              ↦
            </button>
            <span className="text-ink-muted/60">–</span>
            <input
              type="number"
              step="0.01"
              value={rows[i]?.end ?? 0}
              onClick={e => e.stopPropagation()}
              onChange={e => updateRow(i, { end: Number(e.target.value) })}
              className="w-20 border-b border-ink/20 bg-transparent pb-1 font-mono text-[0.75rem] focus:border-vermilion focus:outline-none"
            />
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                markAtPlayhead(i, 'end')
              }}
              title="Mark end at the current playhead"
              className="label text-ink-muted transition-colors hover:text-vermilion"
            >
              ↤
            </button>
          </div>
        ))}
      </div>

      <div className="mt-2.5 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={setMappings.isPending}
          className={cn(
            'label border border-rule px-3 py-1.5 transition-colors',
            setMappings.isPending ? 'text-ink-muted/50' : 'text-ink hover:border-vermilion hover:text-vermilion',
          )}
        >
          {setMappings.isPending ? 'Saving…' : 'Save mappings'}
        </button>
        {setMappings.isSuccess && <span className="label text-ink-muted">Saved — persists for real.</span>}
      </div>
      {errorMessage && <p className="label mt-1.5 text-vermilion">{errorMessage}</p>}
    </div>
  )
}

function syncSegments(peaksInstance: PeaksInstance, rows: Row[]) {
  peaksInstance.segments.removeAll()
  const toAdd = rows
    .map((row, i) => ({ id: row.segmentId, startTime: row.start, endTime: row.end, editable: true, labelText: `${i + 1}` }))
    .filter(row => row.endTime > row.startTime)
  if (toAdd.length > 0) peaksInstance.segments.add(toAdd)
}
