'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Spinner } from '@/components/spinner'
import { formatCount, formatDay, parseCount } from '@/lib/japam'
import { japamQuery } from '@/lib/query/options'
import { useLogJapam, useSetJapamDay } from '@/lib/query/use-japam-mutations'
import type { ApiJapamDay } from '@/lib/api/api-types'

const RECENT_DAYS = 7

const INPUT =
  'border border-rule bg-transparent p-2.5 text-[0.8125rem] focus:border-vermilion focus:outline-none'

/**
 * A student's japam (chanting) count, for a school that keeps one — the profile page only renders
 * this when `schoolHasFeature(school, 'japam')`. Two totals: this calendar year and all time. The
 * year is only this card's choice of window; the API sums whatever window it is asked for and
 * assumes no yearly reset.
 *
 * Anyone who can see the profile sees the numbers; `canEdit` (the student themselves, or a school
 * admin) adds the log form and lets a recent day be corrected.
 */
export function JapamCard({ profileId, canEdit }: { profileId: string; canEdit: boolean }) {
  // The browser's year picks the window; the server's `today` (the *student's* date) is what the
  // rest of the card uses, so only the New Year's-Eve edge between two time zones can disagree.
  const { data, error } = useQuery(
    japamQuery(profileId, { from: `${new Date().getFullYear()}-01-01` }),
  )

  if (error) {
    return (
      <p className="sheet px-4 py-5 text-[0.875rem] text-ink-muted">
        {"Couldn't load the japam count."}
      </p>
    )
  }
  if (!data) {
    return <div className="sheet h-40 animate-pulse" aria-busy aria-label="Loading japam" />
  }

  const recent = data.days.slice(0, RECENT_DAYS)

  return (
    <div className="space-y-5">
      <dl className="sheet grid grid-cols-2 divide-x divide-rule-soft">
        <div className="px-4 py-4">
          <dt className="label text-ink-muted">This year</dt>
          <dd className="display mt-2 text-[1.75rem]">{formatCount(data.total)}</dd>
        </div>
        <div className="px-4 py-4">
          <dt className="label text-ink-muted">All time</dt>
          <dd className="display mt-2 text-[1.75rem]">{formatCount(data.lifetime)}</dd>
        </div>
      </dl>

      {canEdit && <LogForm profileId={profileId} today={data.today} />}

      <div>
        <p className="label text-ink-muted">Recent days</p>
        {recent.length === 0 ? (
          <p className="mt-3 text-[0.875rem] text-ink-muted">Nothing logged yet this year.</p>
        ) : (
          <ol className="sheet mt-3">
            {recent.map(day => (
              <DayRow
                key={day.loggedOn}
                profileId={profileId}
                day={day}
                isToday={day.loggedOn === data.today}
                canEdit={canEdit}
              />
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

/** Add to today — or to an earlier day, for a sitting that was forgotten. */
function LogForm({ profileId, today }: { profileId: string; today: string }) {
  const logging = useLogJapam(profileId)
  const [count, setCount] = useState('')
  const [day, setDay] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseCount(count)
    if (parsed === null || parsed < 1) {
      setError('Enter a whole number above 0.')
      return
    }

    setError(null)
    logging.mutate(
      { count: parsed, ...(day && { loggedOn: day }) },
      {
        onSuccess: () => {
          setCount('')
          setDay('')
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="label block text-ink-muted">Add</span>
          <input
            type="text"
            inputMode="numeric"
            value={count}
            onChange={e => setCount(e.target.value.replace(/\D/g, ''))}
            placeholder="108"
            className={`${INPUT} mt-2 w-32`}
          />
        </label>
        <label className="block">
          <span className="label block text-ink-muted">Day</span>
          <input
            type="date"
            value={day}
            max={today}
            onChange={e => setDay(e.target.value)}
            className={`${INPUT} mt-2`}
          />
        </label>
        <button
          type="submit"
          disabled={logging.isPending}
          aria-busy={logging.isPending}
          className="label inline-flex items-center gap-2 bg-ink px-4 py-2.5 text-paper transition-opacity disabled:opacity-50"
        >
          {logging.isPending && <Spinner />}
          {logging.isPending ? 'Adding…' : 'Add'}
        </button>
      </div>
      <p className="mt-2 text-[0.75rem] text-ink-muted">
        {day ? `Adds to ${formatDay(day)}.` : 'Adds to today unless you pick another day.'}
      </p>
      {error && <p className="mt-2 text-[0.8125rem] text-vermilion">{error}</p>}
    </form>
  )
}

/** One logged day, with — for someone who may edit — a way to correct its total. */
function DayRow({
  profileId,
  day,
  isToday,
  canEdit,
}: {
  profileId: string
  day: ApiJapamDay
  isToday: boolean
  canEdit: boolean
}) {
  const setting = useSetJapamDay(profileId)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseCount(draft)
    if (parsed === null) {
      setError('Enter a whole number, or 0 to clear the day.')
      return
    }

    setError(null)
    setting.mutate(
      { loggedOn: day.loggedOn, count: parsed },
      { onSuccess: () => setEditing(false) },
    )
  }

  return (
    <li className="border-b border-rule-soft px-4 py-3 last:border-0">
      {editing ? (
        <form onSubmit={handleSave} className="flex flex-wrap items-center gap-3">
          <span className="min-w-0 flex-1 font-mono text-[0.75rem] text-ink-muted">
            {formatDay(day.loggedOn)}
          </span>
          <input
            type="text"
            inputMode="numeric"
            autoFocus
            aria-label={`Total for ${formatDay(day.loggedOn)}`}
            value={draft}
            onChange={e => setDraft(e.target.value.replace(/\D/g, ''))}
            className={`${INPUT} w-28 py-1.5`}
          />
          <button
            type="submit"
            disabled={setting.isPending}
            aria-busy={setting.isPending}
            className="label inline-flex items-center gap-2 bg-ink px-3 py-1.5 text-paper disabled:opacity-50"
          >
            {setting.isPending && <Spinner />}
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="label border border-ink/25 px-3 py-1.5 text-ink"
          >
            Cancel
          </button>
          <p className="basis-full text-[0.75rem] text-ink-muted">0 clears the day.</p>
          {error && <p className="basis-full text-[0.8125rem] text-vermilion">{error}</p>}
        </form>
      ) : (
        <div className="flex items-center gap-4">
          <span className="min-w-0 flex-1 font-mono text-[0.75rem] text-ink-muted">
            {formatDay(day.loggedOn)}
            {isToday && <span className="label ml-2 text-vermilion">Today</span>}
          </span>
          <span className="text-[0.9375rem] font-medium">{formatCount(day.count)}</span>
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setDraft(String(day.count))
                setError(null)
                setEditing(true)
              }}
              className="label text-ink-muted transition-colors hover:text-vermilion"
            >
              Edit
            </button>
          )}
        </div>
      )}
    </li>
  )
}
