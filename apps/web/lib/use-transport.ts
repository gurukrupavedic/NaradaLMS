'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Playback transport for the practice room, backed by a real `HTMLAudioElement`. One element lives
 * for the hook's whole lifetime (created client-side in an effect, since `Audio` doesn't exist
 * during SSR); `url` changing just repoints its `src` rather than creating a new element, so a
 * script/rate/loop change never has to re-buffer the recording.
 *
 * The loop range is why this is a hook rather than a handful of `useState` calls: drilling one line
 * over and over is how chant is actually learned, and that needs the element itself to wrap.
 */

export type LoopRange = { start: number; end: number } | null

export function useTransport(url: string, duration: number) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // Where to land once a source swap's `loadedmetadata` fires — see `seek`'s own comment for why a
  // seek issued in the same handler as the swap can't apply directly to the element yet.
  const pendingSeekRef = useRef<number | null>(null)

  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [rate, setRateState] = useState(1)
  const [loop, setLoop] = useState<LoopRange>(null)

  useEffect(() => {
    const audio = new Audio()
    audioRef.current = audio

    const onTime = () => setTime(audio.currentTime)
    const onPlay = () => setPlaying(true)
    const onPauseOrEnd = () => setPlaying(false)

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPauseOrEnd)
    audio.addEventListener('ended', onPauseOrEnd)

    return () => {
      audio.pause()
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPauseOrEnd)
      audio.removeEventListener('ended', onPauseOrEnd)
      audioRef.current = null
    }
  }, [])

  // Loop enforcement: `timeupdate` only fires a few times a second, so this is a seek-back the
  // instant playback crosses the boundary, not a sample-accurate wrap — audibly fine for chant
  // drilling, and the same tradeoff any `<audio>`-based looper makes.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !loop) return
    function onTime() {
      if (audio && audio.currentTime >= loop!.end) audio.currentTime = loop!.start
    }
    audio.addEventListener('timeupdate', onTime)
    return () => audio.removeEventListener('timeupdate', onTime)
  }, [loop])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.src = url
    audio.playbackRate = rate
    audio.load()

    function onLoaded() {
      if (!audio) return
      const target = pendingSeekRef.current
      pendingSeekRef.current = null
      audio.currentTime = target ?? 0
      setTime(audio.currentTime)
    }
    audio.addEventListener('loadedmetadata', onLoaded, { once: true })
    return () => audio.removeEventListener('loadedmetadata', onLoaded)
    // `rate` deliberately excluded — reapplied here only so a fresh element starts at the current
    // rate; `setRate` below handles every later change without reloading the source.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  /**
   * `max` overrides the current duration for one call, and exists for exactly one case: seeking
   * into a *different* recording. Switching assets sets the new id and seeks in the same handler
   * (`practice-room.tsx`'s `switchAudio`), so on that pass `duration` is still the outgoing asset's
   * — a `max` that disagrees with it is the signal that the element's `src` hasn't caught up to the
   * new asset yet, so the target is stashed for the `loadedmetadata` handler above instead of
   * applied directly. (Two different recordings sharing the exact same duration would slip through
   * this check and land at 0 instead of the target — accepted as a rare, low-stakes edge case rather
   * than threading the next url through `seek` itself.)
   */
  const seek = useCallback(
    (to: number, max: number = duration) => {
      const clamped = Math.min(Math.max(to, 0), max)
      const audio = audioRef.current
      if (!audio) return
      if (max !== duration) {
        pendingSeekRef.current = clamped
        return
      }
      audio.currentTime = clamped
      setTime(clamped)
    },
    [duration],
  )

  const play = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    // Pressing play at the very end restarts rather than doing nothing — otherwise the button
    // looks broken on the last segment.
    if (audio.currentTime >= duration - 0.05) audio.currentTime = 0
    void audio.play()
  }, [duration])

  const pause = useCallback(() => {
    audioRef.current?.pause()
  }, [])

  const toggle = useCallback(() => (playing ? pause() : play()), [playing, pause, play])

  const setRate = useCallback((next: number) => {
    setRateState(next)
    const audio = audioRef.current
    if (audio) audio.playbackRate = next
  }, [])

  return { time, duration, playing, rate, loop, play, pause, toggle, seek, setRate, setLoop }
}
