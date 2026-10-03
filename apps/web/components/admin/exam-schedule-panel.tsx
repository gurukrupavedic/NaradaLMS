'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { ScreenSkeleton } from '@/components/skeletons'
import { ScreenError } from '@/components/screen-error'
import { Section } from '@/components/section'
import { Spinner } from '@/components/spinner'
import { examSchedulesQuery } from '@/lib/query/options'
import {
  useCreateExamSchedule,
  useDeleteExamSchedule,
  useUpdateExamSchedule,
} from '@/lib/query/use-exam-slot-mutations'
import type { ApiExamSchedule } from '@/lib/api/api-types'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

function timeZones(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    return []
  }
}

// The recurring half of /admin/exam-slots: weekly rules that the API turns into open slots over a
// rolling window of weeks. A rule describes wall-clock time in a named time zone, so "10:00" stays
// 10:00 across daylight-saving changes. One-off slots are still opened by hand in the Slots panel.
export function ExamSchedulePanel() {
  const { data: schedules, error } = useQuery(examSchedulesQuery())
  const [editing, setEditing] = useState<ApiExamSchedule | null>(null)

  if (error) return <ScreenError error={error} />
  if (!schedules) return <ScreenSkeleton rows={4} />

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-5 py-9">
      <ScheduleForm key={editing?.id ?? 'new'} editing={editing} onDone={() => setEditing(null)} />

      <Section title="Weekly schedule" count={`${schedules.length}`}>
        {schedules.length === 0 ? (
          <p className="sheet px-4 py-7 text-center text-[0.875rem] text-ink-muted">
            No recurring schedule yet. Add one and slots are opened for the coming weeks automatically.
          </p>
        ) : (
          <ol className="sheet">
            {schedules.map(schedule => (
              <ScheduleRow key={schedule.id} schedule={schedule} onEdit={() => setEditing(schedule)} />
            ))}
          </ol>
        )}
      </Section>
    </div>
  )
}

function ScheduleRow({ schedule, onEdit }: { schedule: ApiExamSchedule; onEdit: () => void }) {
  const remove = useDeleteExamSchedule()

  return (
    <li className="flex flex-wrap items-center gap-4 border-b border-rule-soft px-4 py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <span className="block text-[0.9375rem]">
          {DAYS[schedule.dayOfWeek]}s at {schedule.startTime.slice(0, 5)}
        </span>
        <span className="label mt-0.5 block text-ink-muted">
          {schedule.slotCount} {schedule.slotCount === 1 ? 'sitting' : 'sittings'}
          {schedule.slotCount > 1 && `, ${schedule.slotMinutes} min apart`} · {schedule.timeZone}
        </span>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="label shrink-0 border border-rule px-3 py-1.5 text-ink-muted transition-colors hover:border-ink hover:text-ink"
      >
        Edit
      </button>
      <button
        type="button"
        disabled={remove.isPending}
        aria-busy={remove.isPending}
        onClick={() => {
          if (window.confirm('Remove this schedule? Unclaimed upcoming slots from it are deleted; claimed ones stay.')) {
            remove.mutate(schedule.id)
          }
        }}
        className="label inline-flex shrink-0 items-center gap-2 border border-rule px-3 py-1.5 text-ink-muted transition-colors hover:border-vermilion hover:text-vermilion disabled:pointer-events-none disabled:opacity-50"
      >
        {remove.isPending && <Spinner />}
        Remove
      </button>
    </li>
  )
}

function ScheduleForm({ editing, onDone }: { editing: ApiExamSchedule | null; onDone: () => void }) {
  const create = useCreateExamSchedule()
  const update = useUpdateExamSchedule()
  const pending = create.isPending || update.isPending

  const [dayOfWeek, setDayOfWeek] = useState(editing?.dayOfWeek ?? 6)
  const [startTime, setStartTime] = useState(editing?.startTime.slice(0, 5) ?? '10:00')
  const [timeZone, setTimeZone] = useState(editing?.timeZone ?? browserTimeZone())
  const [slotCount, setSlotCount] = useState(editing?.slotCount ?? 1)
  const [slotMinutes, setSlotMinutes] = useState(editing?.slotMinutes ?? 30)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = { dayOfWeek, startTime, timeZone, slotCount, slotMinutes }

    if (editing) {
      update.mutate({ id: editing.id, data }, { onSuccess: onDone })
    } else {
      create.mutate(data)
    }
  }

  const fieldClass =
    'mt-2 w-full border-b border-ink/25 bg-transparent py-1.5 text-[0.875rem] focus:border-vermilion focus:outline-none'

  return (
    <form onSubmit={handleSubmit} className="sheet flex flex-wrap items-end gap-4 px-5 py-5">
      <label className="min-w-[8rem] flex-1">
        <span className="label block text-ink-muted">Day</span>
        <select value={dayOfWeek} onChange={e => setDayOfWeek(Number(e.target.value))} className={fieldClass}>
          {DAYS.map((name, index) => (
            <option key={name} value={index}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <label className="min-w-[7rem] flex-1">
        <span className="label block text-ink-muted">First sitting</span>
        <input required type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={fieldClass} />
      </label>

      <label className="min-w-[6rem] flex-1">
        <span className="label block text-ink-muted">Sittings</span>
        <input
          required
          type="number"
          min={1}
          max={24}
          value={slotCount}
          onChange={e => setSlotCount(Number(e.target.value))}
          className={fieldClass}
        />
      </label>

      <label className="min-w-[6rem] flex-1">
        <span className="label block text-ink-muted">Minutes apart</span>
        <input
          required
          type="number"
          min={5}
          max={480}
          value={slotMinutes}
          onChange={e => setSlotMinutes(Number(e.target.value))}
          className={fieldClass}
        />
      </label>

      <label className="min-w-[12rem] flex-[2]">
        <span className="label block text-ink-muted">Time zone</span>
        <input required list="exam-schedule-time-zones" value={timeZone} onChange={e => setTimeZone(e.target.value)} className={fieldClass} />
        <datalist id="exam-schedule-time-zones">
          {timeZones().map(zone => (
            <option key={zone} value={zone} />
          ))}
        </datalist>
      </label>

      <div className="flex shrink-0 items-center gap-3">
        {editing && (
          <button type="button" onClick={onDone} className="label text-ink-muted transition-colors hover:text-ink">
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="label inline-flex items-center gap-2 bg-ink px-4 py-2 text-paper transition-opacity disabled:opacity-50"
        >
          {pending && <Spinner />}
          {editing ? 'Save changes' : 'Add schedule'}
        </button>
      </div>
    </form>
  )
}
