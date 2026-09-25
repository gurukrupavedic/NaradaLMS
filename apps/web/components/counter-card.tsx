'use client'

import { useState } from 'react'
import type { CounterField } from '@narada/profile-fields'

import { Spinner } from '@/components/spinner'
import { formatCount, parseCount } from '@/lib/counter'
import { useAddToCounter, useUpdateCourseProfile } from '@/lib/query/use-counter-mutations'

const INPUT =
  'border border-rule bg-transparent p-2.5 text-[0.8125rem] focus:border-vermilion focus:outline-none'

/**
 * One of a course's counters (`@narada/profile-fields`' course-level rules — japam, for SLMTS's
 * Vedam): its running total, and for someone who may edit (the student themselves, or a school
 * admin) a box to add to it and a way to set it outright. `total` is the profile page's
 * `courseProfile.details[counter.key]` — a counter that was never written reads 0. The count is the current
 * course's: the same student keeps a separate one in each course that has the counter. It keeps no
 * history; it's a number.
 */
export function CounterCard({
  profileId,
  counter,
  total,
  canEdit,
}: {
  profileId: string
  counter: CounterField
  total: number
  canEdit: boolean
}) {
  return (
    <div className="space-y-4">
      <dl className="sheet px-4 py-4">
        <dt className="label text-ink-muted">Total</dt>
        <dd className="display mt-2 text-[1.75rem]">{formatCount(total)}</dd>
      </dl>
      {canEdit && <AddForm profileId={profileId} counterKey={counter.key} />}
      {canEdit && <SetTotal profileId={profileId} counterKey={counter.key} total={total} />}
    </div>
  )
}

/** Add to the count. */
function AddForm({ profileId, counterKey }: { profileId: string; counterKey: string }) {
  const adding = useAddToCounter(profileId, counterKey)
  const [count, setCount] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseCount(count)
    if (parsed === null || parsed < 1) {
      setError('Enter a whole number above 0.')
      return
    }

    setError(null)
    adding.mutate(parsed, { onSuccess: () => setCount('') })
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
        <button
          type="submit"
          disabled={adding.isPending}
          aria-busy={adding.isPending}
          className="label inline-flex items-center gap-2 bg-ink px-4 py-2.5 text-paper transition-opacity disabled:opacity-50"
        >
          {adding.isPending && <Spinner />}
          {adding.isPending ? 'Adding…' : 'Add'}
        </button>
      </div>
      {error && <p className="mt-2 text-[0.8125rem] text-vermilion">{error}</p>}
    </form>
  )
}

/** Set the total outright — for a miscount, or a reset (0). */
function SetTotal({
  profileId,
  counterKey,
  total,
}: {
  profileId: string
  counterKey: string
  total: number
}) {
  const setting = useUpdateCourseProfile(profileId)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(String(total))
          setError(null)
          setEditing(true)
        }}
        className="label text-ink-muted transition-colors hover:text-vermilion"
      >
        Set total
      </button>
    )
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseCount(draft)
    if (parsed === null) {
      setError('Enter a whole number, or 0 to reset.')
      return
    }

    setError(null)
    setting.mutate({ details: { [counterKey]: parsed } }, { onSuccess: () => setEditing(false) })
  }

  return (
    <form onSubmit={handleSave} className="flex flex-wrap items-center gap-3">
      <input
        type="text"
        inputMode="numeric"
        autoFocus
        aria-label="Total"
        value={draft}
        onChange={e => setDraft(e.target.value.replace(/\D/g, ''))}
        className={`${INPUT} w-36 py-1.5`}
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
      {error && <p className="basis-full text-[0.8125rem] text-vermilion">{error}</p>}
    </form>
  )
}
