'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { SegmentPicker } from '@/components/admin/segment-picker'
import { formatTimestamp } from '@/lib/audio-mapping-session'
import type { ApiAudioAsset, ApiScriptSegment } from '@/lib/api/api-types'

/** Real play/pause/seek, plus `playRange` — seek to a point and auto-pause once playback reaches an end point, the mechanism a click-a-segment-to-hear-it preview needs that plain transport controls don't. */
function usePreviewPlayer(url: string | undefined) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const stopAtRef = useRef<number | null>(null)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!url) return
    const audio = new Audio(url)
    audioRef.current = audio
    const onTime = () => {
      setTime(audio.currentTime)
      if (stopAtRef.current !== null && audio.currentTime >= stopAtRef.current) {
        audio.pause()
        stopAtRef.current = null
      }
    }
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
    stopAtRef.current = null
    if (audio.paused) void audio.play()
    else audio.pause()
  }, [])

  const seek = useCallback((to: number) => {
    const audio = audioRef.current
    if (!audio) return
    stopAtRef.current = null
    audio.currentTime = Math.min(Math.max(to, 0), audio.duration || to)
    setTime(audio.currentTime)
  }, [])

  const playRange = useCallback((start: number, end: number) => {
    const audio = audioRef.current
    if (!audio) return
    stopAtRef.current = end
    audio.currentTime = start
    setTime(start)
    void audio.play()
  }, [])

  return { time, duration, playing, toggle, seek, playRange }
}

/**
 * What a student would eventually see, minus the practice mechanics: the whole chapter's text
 * with every mapped segment clickable, playing just that segment's slice of the take. Useful here
 * as a sanity check on the previous two steps — a segment that plays the wrong words, or a
 * mapping that's audibly off, is far easier to catch by ear than by re-reading offsets.
 */
export function PreviewStep({
  text,
  fontClass,
  segments,
  audio,
}: {
  text: string
  fontClass?: string
  segments: ApiScriptSegment[]
  audio: ApiAudioAsset[]
}) {
  const [assetIndex, setAssetIndex] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const asset = audio[assetIndex]
  const player = usePreviewPlayer(asset?.url)

  const mappingMap = useMemo(() => new Map((asset?.mappings ?? []).map(m => [m.segmentId, m])), [asset])

  const activeIndex = useMemo(() => {
    if (!player.playing) return selectedIndex
    const idx = segments.findIndex(s => {
      const mapping = mappingMap.get(s.id)
      return mapping && player.time >= mapping.audioStart && player.time < mapping.audioEnd
    })
    return idx >= 0 ? idx : selectedIndex
  }, [mappingMap, player.playing, player.time, segments, selectedIndex])

  function handleSelect(index: number) {
    const segment = segments[index]
    const mapping = segment && mappingMap.get(segment.id)
    setSelectedIndex(index)
    if (mapping) player.playRange(mapping.audioStart, mapping.audioEnd)
  }

  if (!text.trim()) {
    return <p className="label text-ink-muted">Nothing to preview yet.</p>
  }

  return (
    <div className="space-y-4">
      {audio.length > 1 && (
        <div className="flex w-fit items-center gap-px border border-rule">
          {audio.map((a, i) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAssetIndex(i)}
              aria-pressed={i === assetIndex}
              className={cn(
                'label px-2.5 py-1.5 transition-colors',
                i === assetIndex ? 'bg-ink text-paper' : 'text-ink-muted hover:bg-ink/[0.04] hover:text-ink',
              )}
            >
              {a.label ?? a.reciter}
            </button>
          ))}
        </div>
      )}

      <SegmentPicker
        text={text}
        fontClass={fontClass}
        segments={segments}
        readOnly
        selectedIndex={activeIndex}
        onSelectSegment={handleSelect}
      />

      {asset ? (
        <div className="space-y-2 border-t border-rule-soft pt-3.5">
          <input
            type="range"
            min={0}
            max={player.duration || 1}
            step={0.1}
            value={player.time}
            onChange={e => player.seek(Number(e.target.value))}
            className="w-full accent-[var(--vermilion)]"
          />
          <div className="flex items-center gap-3">
            <button type="button" onClick={player.toggle} className="label shrink-0 bg-ink px-2.5 py-1.5 text-paper">
              {player.playing ? '❚❚ Pause' : '▶ Play'}
            </button>
            <span className="font-mono text-[0.75rem] text-ink-muted tabular-nums">
              {formatTimestamp(player.time)} / {formatTimestamp(player.duration)}
            </span>
            {activeIndex !== null && <span className="label ml-auto text-ink-muted">Playing segment {activeIndex + 1}</span>}
          </div>
        </div>
      ) : (
        <p className="label text-ink-muted">No audio uploaded — click a segment above to see its text only.</p>
      )}
    </div>
  )
}
