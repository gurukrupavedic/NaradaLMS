'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'

import { batchClassifiersQuery, catalogTracksQuery } from '@/lib/query/options'
import { useCreateBatch } from '@/lib/query/use-batch-mutations'
import { Spinner } from '@/components/spinner'
import { ScreenSkeleton } from '@/components/skeletons'
import { ScreenError } from '@/components/screen-error'
import { Standing } from '@/components/standing'
import { useCoursePath } from '@/lib/course'

// A classifier is letters/digits only — the same shape the server enforces
// (`apps/api/src/batches/schema.ts`'s `CreateBatchSchema`) — checked here too so a typo shows up
// before the request round-trips.
const CLASSIFIER_PATTERN = /^[A-Za-z0-9]+$/
const NEW_CLASSIFIER = '__new__'

/**
 * Create a batch.
 *
 * Every batch that isn't marked completed is requestable by a student immediately — there's no
 * separate "open it up" step, so this form has nothing to ask about enrollment at all.
 *
 * The code isn't typed in — it's generated server-side from the track, the current year, and the
 * classifier picked here (`apps/api/src/batches/service.ts::createBatch`), so this form only
 * needs to ask for the two things that actually vary: which track, and which classifier (an
 * existing one from the dropdown, or a new one typed in — `existing` is only ever a seed list, not
 * a closed set the server enforces).
 */
export function CreateBatchForm() {
  const cp = useCoursePath()
  const { data: tracks, error: tracksError } = useQuery(catalogTracksQuery())
  const { data: existingClassifiers } = useQuery(batchClassifiersQuery())
  const create = useCreateBatch()
  const router = useRouter()

  const [trackId, setTrackId] = useState('')
  const [classifier, setClassifier] = useState('')
  const [newClassifier, setNewClassifier] = useState('')
  const [startDate, setStartDate] = useState('')
  const [meetingUrl, setMeetingUrl] = useState('')

  if (tracksError) return <ScreenError error={tracksError} backHref={cp('/admin')} backLabel="← All batches" />
  if (!tracks) return <ScreenSkeleton rows={4} />

  const addingNew = classifier === NEW_CLASSIFIER
  const effectiveClassifier = (addingNew ? newClassifier : classifier).trim()
  const classifierValid = CLASSIFIER_PATTERN.test(effectiveClassifier)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!trackId || !classifierValid) return

    create.mutate(
      {
        trackId,
        classifier: effectiveClassifier,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        meetingUrl: meetingUrl.trim() ? meetingUrl.trim() : null,
      },
      { onSuccess: batch => router.push(cp(`/admin/batches/${encodeURIComponent(batch.code)}`)) },
    )
  }

  return (
    <>
      <Standing eyebrow="Administration" headline="New batch" />

      <div className="mx-auto max-w-2xl px-5 py-9">
        <form onSubmit={handleSubmit} className="sheet space-y-6 px-5 py-6">
          <label className="block">
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
              {tracks.map(track => (
                <option key={track.id} value={track.id}>
                  {track.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label block text-ink-muted">Classifier</span>
            <select
              required
              value={classifier}
              onChange={e => setClassifier(e.target.value)}
              className="mt-2 w-full border-b border-ink/25 bg-transparent py-1.5 text-[0.9375rem] focus:border-vermilion focus:outline-none"
            >
              <option value="" disabled>
                Choose a classifier…
              </option>
              {existingClassifiers?.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              <option value={NEW_CLASSIFIER}>+ New classifier…</option>
            </select>
            {addingNew && (
              <input
                required
                autoFocus
                value={newClassifier}
                onChange={e => setNewClassifier(e.target.value)}
                placeholder="e.g. CH"
                aria-invalid={newClassifier.trim() !== '' && !classifierValid}
                className="mt-2.5 w-full border-b border-ink/25 bg-transparent py-1.5 text-[0.9375rem] placeholder:text-ink-muted/40 focus:border-vermilion focus:outline-none"
              />
            )}
            <span className="mt-2 block text-[0.75rem] text-ink-muted">
              The batch code — course, year, classifier, track and an auto-numbered index — is
              generated once you create the batch.
            </span>
          </label>

          <label className="block">
            <span className="label block text-ink-muted">Start date</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="mt-2 w-full border-b border-ink/25 bg-transparent py-1.5 text-[0.875rem] focus:border-vermilion focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="label block text-ink-muted">Join link</span>
            <input
              type="url"
              value={meetingUrl}
              onChange={e => setMeetingUrl(e.target.value)}
              placeholder="https://zoom.us/j/…"
              className="mt-2 w-full border-b border-ink/25 bg-transparent py-1.5 text-[0.875rem] placeholder:text-ink-muted/40 focus:border-vermilion focus:outline-none"
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={create.isPending || !trackId || !classifierValid}
              aria-busy={create.isPending}
              className="label inline-flex items-center gap-2 bg-ink px-4 py-2 text-paper transition-opacity disabled:opacity-50"
            >
              {create.isPending && <Spinner />}
              {create.isPending ? 'Creating…' : 'Create batch'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
