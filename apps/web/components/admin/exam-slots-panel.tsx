'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { ScreenSkeleton } from '@/components/skeletons'
import { ScreenError } from '@/components/screen-error'
import { Section } from '@/components/section'
import { Spinner } from '@/components/spinner'
import { Timestamp } from '@/components/timestamp'
import { catalogTracksQuery, examSlotsQuery } from '@/lib/query/options'
import { useCancelExamSlot, useOpenExamSlot } from '@/lib/query/use-exam-slot-mutations'
import type { ExamSlotRow } from '@/lib/api/resources'
import type { ApiExamSlotStatus } from '@/lib/api/api-types'

const STATUS_LABEL: Record<ApiExamSlotStatus, string> = {
  open: 'Open',
  requested: 'Requested',
  booked: 'Booked',
  cancelled: 'Cancelled',
}

const STATUS_CLASS: Record<ApiExamSlotStatus, string> = {
  open: 'text-ink-muted',
  // A student is waiting on a decision here — the one status worth an admin's attention at a
  // glance, same vermilion this screen already uses for "awaiting" in admin-exams-screen.tsx.
  requested: 'text-vermilion',
  booked: 'text-ink',
  cancelled: 'text-ink-muted/50 line-through',
}

// The slots half of /admin/exam-slots (components/admin/admin-exam-slots-screen.tsx owns the
// page's shared `Standing` header and the "Slots"/"Requests" switch above this): opening new
// appointments and seeing every one that exists, regardless of status. Reviewing the requests
// against them is `ExamSlotRequestReview`'s job, not this one.
export function ExamSlotsPanel() {
  const { data: tracks, error: tracksError } = useQuery(catalogTracksQuery())
  const { data: slots, error: slotsError } = useQuery(examSlotsQuery())

  const error = tracksError ?? slotsError
  if (error) return <ScreenError error={error} />
  if (!tracks || !slots) return <ScreenSkeleton rows={6} />

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-5 py-9">
      <OpenSlotForm tracks={tracks} />

      <Section title="Slots" count={`${slots.length}`}>
        {slots.length === 0 ? (
          <p className="sheet px-4 py-7 text-center text-[0.875rem] text-ink-muted">
            No slots have been opened yet.
          </p>
        ) : (
          <ol className="sheet">
            {slots.map(slot => (
              <SlotRow key={slot.id} slot={slot} />
            ))}
          </ol>
        )}
      </Section>
    </div>
  )
}

function OpenSlotForm({ tracks }: { tracks: { id: string; name: string; order: number }[] }) {
  const open = useOpenExamSlot()
  const [trackId, setTrackId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!trackId || !scheduledAt) return

    open.mutate(
      { trackId, scheduledAt: new Date(scheduledAt).toISOString() },
      { onSuccess: () => setScheduledAt('') },
    )
  }

  const sortedTracks = [...tracks].sort((a, b) => a.order - b.order)

  return (
    <form onSubmit={handleSubmit} className="sheet flex flex-wrap items-end gap-4 px-5 py-5">
      <label className="min-w-[10rem] flex-1">
        <span className="label block text-ink-muted">Track</span>
        <select
          required
          value={trackId}
          onChange={e => setTrackId(e.target.value)}
          className="mt-2 w-full border-b border-ink/25 bg-transparent py-1.5 text-[0.9375rem] focus:border-vermilion focus:outline-none"
        >
          <option value="" disabled>
            Choose a track…
          </option>
          {sortedTracks.map(track => (
            <option key={track.id} value={track.id}>
              {track.name}
            </option>
          ))}
        </select>
      </label>

      <label className="min-w-[12rem] flex-1">
        <span className="label block text-ink-muted">Date &amp; time</span>
        <input
          required
          type="datetime-local"
          value={scheduledAt}
          onChange={e => setScheduledAt(e.target.value)}
          className="mt-2 w-full border-b border-ink/25 bg-transparent py-1.5 text-[0.875rem] focus:border-vermilion focus:outline-none"
        />
      </label>

      <button
        type="submit"
        disabled={open.isPending || !trackId || !scheduledAt}
        aria-busy={open.isPending}
        className="label inline-flex shrink-0 items-center gap-2 bg-ink px-4 py-2 text-paper transition-opacity disabled:opacity-50"
      >
        {open.isPending && <Spinner />}
        {open.isPending ? 'Opening…' : 'Open slot'}
      </button>
    </form>
  )
}

function SlotRow({ slot }: { slot: ExamSlotRow }) {
  const cancel = useCancelExamSlot()
  const cancellable = slot.status === 'open' || slot.status === 'requested'

  return (
    <li className="flex flex-wrap items-center gap-4 border-b border-rule-soft px-4 py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <span className="block text-[0.9375rem]">{slot.track}</span>
        <span className="label mt-0.5 block font-mono text-ink-muted">
          <Timestamp variant="dateTime" value={slot.when} />
        </span>
      </div>

      <span className={`label shrink-0 ${STATUS_CLASS[slot.status]}`}>{STATUS_LABEL[slot.status]}</span>

      {cancellable && (
        <button
          type="button"
          disabled={cancel.isPending}
          aria-busy={cancel.isPending}
          onClick={() => cancel.mutate(slot.id)}
          className="label inline-flex shrink-0 items-center gap-2 border border-rule px-3 py-1.5 text-ink-muted transition-colors hover:border-vermilion hover:text-vermilion disabled:pointer-events-none disabled:opacity-50"
        >
          {cancel.isPending && <Spinner />}
          Cancel
        </button>
      )}
    </li>
  )
}
