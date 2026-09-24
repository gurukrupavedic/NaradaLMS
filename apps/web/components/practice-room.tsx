'use client'

import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Select } from '@base-ui/react/select'

import { cn } from '@/lib/utils'
import { Pill } from '@/components/proficiency-pill'
import { ScreenSkeleton } from '@/components/skeletons'
import { ScreenError } from '@/components/screen-error'
import { Timestamp } from '@/components/timestamp'
import { useTransport } from '@/lib/use-transport'
import { chapterQuery } from '@/lib/query/options'
import {
  formatClock,
  mappingFor,
  segmentAt,
  type ChapterContent,
  type ScriptKey,
} from '@/lib/models/content'
import { useCoursePath } from '@/lib/course'

const RATES = [0.5, 0.75, 1] as const

/**
 * The practice room.
 *
 * This is the loop the product exists for and the one screen the app didn't have: a chapter's
 * real title, track and mark load from the real API (`lib/api/reshape.ts`'s `buildChapterContent`),
 * and `scripts`/`audio` are real too (`lib/use-transport.ts` plays the actual uploaded recording,
 * not a simulated clock) — they just always come back empty today, since no chapter in the imported
 * syllabus has text, segments or audio uploaded yet. `EmptyPracticeRoom` below is what that renders
 * today; `PracticeRoomView` is what it renders the day a chapter has both.
 *
 * Three things drive that second layout, all of them from how chant is actually learned rather
 * than from how a media player usually looks:
 *
 *  - The text is the interface. The transport is a strip at the foot; the verses
 *    get the page. Tapping a line is the primary way to move through the audio,
 *    because "again, from there" is the request being made.
 *  - Drilling one line is the core action, so looping a single segment is a
 *    first-class control, not a hidden feature.
 *  - Script is the reader's choice, not the file's. Devanagari, Telugu and
 *    transliteration are the same recitation, so switching preserves both the
 *    audio position and the segment being drilled.
 */
export function PracticeRoom({ chapterId }: { chapterId: string }) {
  const cp = useCoursePath()
  const { data: chapter, error } = useQuery(chapterQuery(chapterId))

  // The transport hooks below all key off the chapter's audio, so the loading
  // branch has to come first — split rather than early-returned so the rules of
  // hooks hold and the view never has to handle a missing chapter.
  if (error) return <ScreenError error={error} backHref={cp('/practice')} backLabel="← Learning" />
  if (!chapter) return <ScreenSkeleton rows={8} />

  // Same reasoning again, one level down: `PracticeRoomView` assumes at least one script and one
  // audio asset (its very first line of state reads `chapter.audio[0]`), so a chapter with neither
  // has to be routed to a view that doesn't make that assumption, not into one that would throw on
  // it.
  if (chapter.scripts.length === 0 || chapter.audio.length === 0) {
    return <EmptyPracticeRoom chapter={chapter} />
  }

  return <PracticeRoomView chapter={chapter} />
}

function EmptyPracticeRoom({ chapter }: { chapter: ChapterContent }) {
  const cp = useCoursePath()
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-5xl items-center px-5 py-3.5">
          <Link
            href={cp('/practice')}
            className="label text-ink-muted transition-colors hover:text-ink"
          >
            ← Learning
          </Link>
        </div>
      </header>

      <div className="border-b border-rule">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-x-8 gap-y-4 px-5 pt-8 pb-7">
          <div className="min-w-0 max-w-2xl">
            <p className="label text-ink-muted">Chapter {chapter.code}</p>
            <h1 className="display mt-2.5 text-[2.25rem]">{chapter.title}</h1>
          </div>

          <div className="flex items-center gap-2.5">
            <Pill level={chapter.level} size="lg" />
            {chapter.evaluatedAt && (
              <p className="font-mono text-[0.6875rem] text-ink-muted/75">
                marked <Timestamp value={chapter.evaluatedAt} />
              </p>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-5 py-20 text-center">
        <p className="label text-vermilion">Nothing here yet</p>
        <p className="mt-4 max-w-sm text-[0.9375rem] leading-relaxed text-ink-muted">
          No text or audio has been uploaded for this chapter. Once it is, this is where the
          recitation opens.
        </p>
      </main>
    </div>
  )
}

function PracticeRoomView({ chapter }: { chapter: ChapterContent }) {
  const cp = useCoursePath()
  const [scriptKey, setScriptKey] = useState<ScriptKey>('sa')
  const [audioId, setAudioId] = useState(chapter.audio[0].id)

  const audio = chapter.audio.find(a => a.id === audioId) ?? chapter.audio[0]
  const script = chapter.scripts.find(s => s.key === scriptKey) ?? chapter.scripts[0]

  const transport = useTransport(audio.url, audio.duration)
  const { time, duration, playing, rate, loop, toggle, seek, setRate, setLoop } = transport

  const currentSegmentId = segmentAt(audio.mappings, time)

  // Segments address the text by character offset, exactly as the API returns
  // them — this slice is the whole of what "render a segment" means.
  const lines = useMemo(
    () =>
      script.segments.map(segment => ({
        id: segment.id,
        text: script.text.slice(segment.start, segment.end),
      })),
    [script],
  )

  // Switching recordings keeps your place in the *text*, not on the clock: the
  // practice take is 45% longer, so carrying the raw second count over would
  // drop you into a different line entirely.
  function switchAudio(nextId: string) {
    const next = chapter.audio.find(a => a.id === nextId)
    if (!next) return

    const target = currentSegmentId ? mappingFor(next.mappings, currentSegmentId) : null

    setAudioId(nextId)
    if (loop) {
      setLoop(target ? { start: target.audioStart, end: target.audioEnd } : null)
    }
    // Clamp against the incoming asset, not the outgoing one — see `seek`.
    seek(target ? target.audioStart : 0, next.duration)
  }

  function playFrom(segmentId: string) {
    const mapping = mappingFor(audio.mappings, segmentId)
    if (!mapping) return
    seek(mapping.audioStart)
    if (loop) setLoop({ start: mapping.audioStart, end: mapping.audioEnd })
  }

  function toggleLoop() {
    if (loop) {
      setLoop(null)
      return
    }
    const mapping = currentSegmentId ? mappingFor(audio.mappings, currentSegmentId) : null
    const target = mapping ?? audio.mappings[0]
    setLoop({ start: target.audioStart, end: target.audioEnd })
    seek(target.audioStart)
  }

  const loopedSegmentId = loop
    ? (segmentAt(audio.mappings, loop.start + 0.01) ?? null)
    : null

  // Chant practice is hands-busy — you are holding a book, or your eyes are
  // shut. Space to start and stop, arrows to step a line, without hunting for
  // a target on screen.
  const onShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return
    // Typing, or a select that already owns the arrow keys — the shortcut must not also fire.
    const target = event.target as HTMLElement | null
    if (target?.closest('input, textarea, select, [contenteditable]')) return

    function step(direction: -1 | 1) {
      const index = audio.mappings.findIndex(m => m.segmentId === currentSegmentId)
      const next = audio.mappings[Math.max(0, (index === -1 ? 0 : index) + direction)]
      if (next) playFrom(next.segmentId)
    }

    if (event.code === 'Space') {
      event.preventDefault()
      toggle()
    } else if (event.code === 'ArrowLeft') {
      event.preventDefault()
      step(-1)
    } else if (event.code === 'ArrowRight') {
      event.preventDefault()
      step(1)
    }
  })

  useEffect(() => {
    const handler = (event: KeyboardEvent) => onShortcut(event)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex min-h-dvh flex-col">
      {/* ── Head ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3.5">
          <Link
            href={cp('/practice')}
            className="label text-ink-muted transition-colors hover:text-ink"
          >
            ← Learning
          </Link>

          <div className="ml-auto flex items-center gap-px border border-rule">
            {chapter.scripts.map(s => (
              <button
                key={s.key}
                type="button"
                onClick={() => setScriptKey(s.key)}
                aria-pressed={s.key === scriptKey}
                title={s.label}
                className={cn(
                  'label px-2.5 py-1.5 transition-colors',
                  s.key === scriptKey
                    ? 'bg-ink text-paper'
                    : 'text-ink-muted hover:bg-ink/[0.04] hover:text-ink',
                )}
              >
                {s.short}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Title ────────────────────────────────────────────────────────── */}
      <div className="border-b border-rule">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-x-8 gap-y-4 px-5 pt-8 pb-7">
          <div className="min-w-0 max-w-2xl">
            <p className="label text-ink-muted">Chapter {chapter.code}</p>
            <h1 className="display mt-2.5 text-[2.25rem]">{chapter.title}</h1>
          </div>

          <div className="flex items-center gap-2.5">
            <Pill level={chapter.level} size="lg" />
            {chapter.evaluatedAt && (
              <p className="font-mono text-[0.6875rem] text-ink-muted/75">
                marked <Timestamp value={chapter.evaluatedAt} />
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── The text ─────────────────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 pb-44">
        <ol className="space-y-1">
          {lines.map((line, i) => {
            const isCurrent = line.id === currentSegmentId
            const isLooped = line.id === loopedSegmentId

            return (
              <li key={line.id}>
                <button
                  type="button"
                  onClick={() => playFrom(line.id)}
                  aria-current={isCurrent ? 'true' : undefined}
                  className={cn(
                    'group flex w-full items-start gap-4 py-3 pr-3 pl-3 text-left transition-colors',
                    isCurrent ? 'bg-vermilion/[0.06]' : 'hover:bg-ink/[0.03]',
                  )}
                >
                  {/* The sounding line takes the margin rule — the one vermilion
                      mark on the page, saying "here, now". */}
                  <span
                    aria-hidden
                    className={cn(
                      '-my-3 w-[2px] shrink-0 self-stretch transition-colors',
                      isCurrent ? 'bg-vermilion' : 'bg-transparent',
                    )}
                  />

                  <span
                    className={cn(
                      'w-5 shrink-0 pt-1.5 font-mono text-[0.6875rem] tabular-nums transition-colors',
                      isCurrent ? 'text-vermilion' : 'text-ink-muted/55',
                    )}
                  >
                    {i + 1}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        script.fontClass,
                        'block text-[1.375rem] leading-[1.9] transition-colors sm:text-[1.5rem]',
                        isCurrent ? 'text-ink' : 'text-ink/80',
                      )}
                    >
                      {line.text}
                    </span>

                    {/* A hairline under every line, inked in on the one being
                        sounded — a finger under the text, not a highlighter. */}
                    <span
                      aria-hidden
                      className={cn(
                        'mt-1.5 block h-px transition-colors',
                        isCurrent ? 'bg-vermilion/50' : 'bg-rule-soft',
                      )}
                    />
                  </span>

                  {isLooped && <span className="stamp mt-1 shrink-0">loop</span>}
                </button>
              </li>
            )
          })}
        </ol>
      </main>

      {/* ── Transport ────────────────────────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-paper/95 backdrop-blur-[2px]">
        <div className="mx-auto max-w-5xl px-5 py-3.5">
          {/* The scrubber is the segment map: one cell per line, so the shape of
              the recitation is visible and you can see which line you are about
              to land on before you commit to the seek. */}
          <div className="flex items-center gap-px" role="group" aria-label="Segments">
            {audio.mappings.map((mapping, i) => {
              const isCurrent = mapping.segmentId === currentSegmentId
              const done = time >= mapping.audioEnd
              const width = ((mapping.audioEnd - mapping.audioStart) / duration) * 100
              const fill = isCurrent
                ? ((time - mapping.audioStart) / (mapping.audioEnd - mapping.audioStart)) * 100
                : 0

              return (
                <button
                  key={mapping.segmentId}
                  type="button"
                  onClick={() => playFrom(mapping.segmentId)}
                  title={`Line ${i + 1}`}
                  aria-label={`Play from line ${i + 1}`}
                  style={{ width: `${width}%` }}
                  className="group relative h-2.5 shrink-0 bg-ink/[0.08]"
                >
                  {done && <span className="absolute inset-0 bg-indigo/45" />}
                  {isCurrent && (
                    <span
                      className="absolute inset-y-0 left-0 bg-vermilion"
                      style={{ width: `${fill}%` }}
                    />
                  )}
                  <span className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 group-hover:bg-ink/15" />
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
            <button
              type="button"
              onClick={toggle}
              className="label flex shrink-0 items-center gap-2 bg-ink px-4 py-2 text-paper"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              <span aria-hidden className="text-[0.7rem] leading-none">
                {playing ? '❚❚' : '▶'}
              </span>
              {playing ? 'Pause' : 'Play'}
            </button>

            <button
              type="button"
              onClick={toggleLoop}
              aria-pressed={loop !== null}
              className={cn(
                'label shrink-0 border px-3 py-2 transition-colors',
                loop
                  ? 'border-vermilion text-vermilion'
                  : 'border-rule text-ink-muted hover:text-ink',
              )}
            >
              ⟲ Loop line
            </button>

            <div
              className="flex shrink-0 items-center gap-px border border-rule"
              role="group"
              aria-label="Speed"
            >
              {RATES.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRate(r)}
                  aria-pressed={r === rate}
                  className={cn(
                    'label px-2.5 py-1.5 transition-colors',
                    r === rate
                      ? 'bg-ink text-paper'
                      : 'text-ink-muted hover:bg-ink/[0.04] hover:text-ink',
                  )}
                >
                  {r}×
                </button>
              ))}
            </div>

            <span className="shrink-0 font-mono text-[0.75rem] text-ink-muted tabular-nums">
              {formatClock(time)} / {formatClock(duration)}
            </span>

            <Select.Root value={audioId} onValueChange={id => id && switchAudio(id)}>
              <Select.Trigger className="label ml-auto flex items-center gap-1.5 border border-rule px-2.5 py-1.5 text-ink-muted transition-colors hover:text-ink">
                <Select.Value>
                  {(id: string) => chapter.audio.find(a => a.id === id)?.label ?? ''}
                </Select.Value>
                <Select.Icon className="text-[0.6rem]">▾</Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Positioner className="z-40" sideOffset={4} align="end">
                  <Select.Popup className="border border-rule bg-paper py-1 shadow-md">
                    {chapter.audio.map(a => (
                      <Select.Item
                        key={a.id}
                        value={a.id}
                        className="label flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-ink-muted transition-colors hover:bg-ink/[0.04] hover:text-ink data-selected:text-ink"
                      >
                        <span className="w-3 shrink-0 text-vermilion">
                          <Select.ItemIndicator>✓</Select.ItemIndicator>
                        </span>
                        <Select.ItemText>{a.label}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
          </div>
        </div>
      </div>
    </div>
  )
}
