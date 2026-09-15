'use client'

import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin, { type Region } from 'wavesurfer.js/plugins/regions'

import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api/client'
import { formatClock } from '@/lib/mock-content'
import { useDeleteChapterAudioAsset, useSetChapterAudioMappings } from '@/lib/query/use-content-mutations'
import type { ApiAudioAsset, ApiScriptSegment } from '@/lib/api/api-types'

type Row = { segmentId: string; start: number; end: number }

const REGION_COLOR = 'rgba(196, 74, 42, 0.18)' // vermilion, translucent

function toRows(segments: ApiScriptSegment[], mappings: ApiAudioAsset['mappings']): Row[] {
  return segments.map(s => {
    const mapping = mappings.find(m => m.segmentId === s.id)
    return { segmentId: s.id, start: mapping?.audioStart ?? 0, end: mapping?.audioEnd ?? 0 }
  })
}

/**
 * A real waveform (wavesurfer.js) with one draggable/resizable region per segment, plus a
 * "tap pass" mode — play the audio and press Space at each line's onset, same interaction as
 * https://abesmon.github.io/lyric-timer/ — which is far faster for a continuous recitation than
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
  const containerRef = useRef<HTMLDivElement | null>(null)
  const waveSurferRef = useRef<WaveSurfer | null>(null)
  const regionsRef = useRef<RegionsPlugin | null>(null)
  const rowsRef = useRef<Row[]>(toRows(segments, asset.mappings))
  const suppressNextSyncRef = useRef(false)

  const [rows, setRows] = useState<Row[]>(() => toRows(segments, asset.mappings))
  const [selected, setSelected] = useState<number | null>(null)
  const [duration, setDuration] = useState(asset.duration)
  const [playing, setPlaying] = useState(false)
  const [tapPass, setTapPass] = useState<{ boundaries: number[] } | null>(null)

  const setMappings = useSetChapterAudioMappings(chapterId)
  const deleteAsset = useDeleteChapterAudioAsset(chapterId)

  useEffect(() => {
    rowsRef.current = rows
  }, [rows])

  // wavesurfer owns the canvas imperatively — this effect is the one place that ever touches it,
  // torn down and rebuilt only if the audio itself changes.
  useEffect(() => {
    if (!containerRef.current) return
    const regions = RegionsPlugin.create()
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#c9c2b4',
      progressColor: '#1a1a1a',
      cursorColor: '#c44a2a',
      height: 96,
      url: asset.url,
      plugins: [regions],
    })
    waveSurferRef.current = ws
    regionsRef.current = regions

    ws.on('ready', d => {
      setDuration(d)
      syncRegions(regions, rowsRef.current, segments, d)
    })
    ws.on('play', () => setPlaying(true))
    ws.on('pause', () => setPlaying(false))
    ws.on('finish', () => setPlaying(false))

    regions.on('region-updated', (region: Region) => {
      suppressNextSyncRef.current = true
      setRows(prev =>
        prev.map(r => (r.segmentId === region.id ? { ...r, start: region.start, end: region.end } : r)),
      )
    })
    regions.on('region-clicked', (region: Region, e: MouseEvent) => {
      e.stopPropagation()
      const index = segments.findIndex(s => s.id === region.id)
      if (index >= 0) setSelected(index)
    })

    return () => {
      ws.destroy()
      waveSurferRef.current = null
      regionsRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.url])

  // Redraw regions whenever rows change from outside a drag (row edits, tap-pass progress) — the
  // drag itself already updates `rows` via 'region-updated' above, so this only fires for the
  // other direction and never fights the user mid-drag.
  useEffect(() => {
    if (suppressNextSyncRef.current) {
      suppressNextSyncRef.current = false
      return
    }
    const regions = regionsRef.current
    if (regions && duration > 0) syncRegions(regions, rows, segments, duration)
  }, [rows, segments, duration])

  function finishTapPass(boundaries: number[]) {
    const ws = waveSurferRef.current
    const end = ws?.getDuration() || duration
    setRows(
      segments.map((s, i) => ({
        segmentId: s.id,
        start: boundaries[i] ?? 0,
        end: boundaries[i + 1] ?? end,
      })),
    )
    setTapPass(null)
    waveSurferRef.current?.pause()
  }

  useEffect(() => {
    if (!tapPass) return
    const activePass = tapPass
    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== 'Space' && e.key !== 'Enter') return
      e.preventDefault()
      const ws = waveSurferRef.current
      if (!ws) return
      const boundaries = [...activePass.boundaries, ws.getCurrentTime()]
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
    waveSurferRef.current?.setTime(0)
    void waveSurferRef.current?.play()
  }

  function stopTapPass() {
    setTapPass(null)
    waveSurferRef.current?.pause()
  }

  function updateRow(index: number, patch: Partial<Row>) {
    setRows(prev => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function markAtPlayhead(index: number, field: 'start' | 'end') {
    const time = waveSurferRef.current?.getCurrentTime() ?? 0
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

      <div ref={containerRef} className="mt-2.5 cursor-pointer" />

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => (playing ? waveSurferRef.current?.pause() : void waveSurferRef.current?.play())}
          className="label shrink-0 bg-ink px-2.5 py-1.5 text-paper"
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
            disabled={segments.length === 0}
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

function syncRegions(regions: RegionsPlugin, rows: Row[], segments: ApiScriptSegment[], duration: number) {
  regions.clearRegions()
  rows.forEach((row, i) => {
    if (!(row.end > row.start) || duration <= 0) return
    regions.addRegion({
      id: row.segmentId,
      start: row.start,
      end: row.end,
      color: REGION_COLOR,
      content: `${i + 1}`,
      drag: true,
      resize: true,
    })
  })
}
