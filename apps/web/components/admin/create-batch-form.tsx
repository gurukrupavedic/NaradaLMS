'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'

import { batchClassifiersQuery, catalogTracksQuery, profileSearchQuery } from '@/lib/query/options'
import { useCreateBatch } from '@/lib/query/use-batch-mutations'
import { Spinner } from '@/components/spinner'
import { ScreenSkeleton } from '@/components/skeletons'
import { ScreenError } from '@/components/screen-error'
import { Standing } from '@/components/standing'
import { useCoursePath } from '@/lib/course'
import { useDebouncedValue } from '@/lib/use-debounced-value'

// A classifier is letters/digits only — the same shape the server enforces
// (`apps/api/src/batches/schema.ts`'s `CreateBatchSchema`) — checked here too so a typo shows up
// before the request round-trips.
const CLASSIFIER_PATTERN = /^[A-Za-z0-9]+$/
const NEW_CLASSIFIER = '__new__'
const SEARCH_DEBOUNCE_MS = 300
const MAX_SHOWN_RESULTS = 6

/**
 * Create a batch.
 *
 * Every batch that isn't marked completed is requestable by a student immediately — there's no
 * separate "open it up" step, so this form has nothing to ask about enrollment at all.
 *
 * A batch always starts with at least one teacher, picked here by searching profiles; the server
 * seats them as instructors in the same transaction that creates the batch.
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
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([])
  const [teacherQuery, setTeacherQuery] = useState('')
  const debouncedTeacherQuery = useDebouncedValue(teacherQuery, SEARCH_DEBOUNCE_MS)
  const { data: teacherResults, isFetching: searchingTeachers } = useQuery(
    profileSearchQuery(debouncedTeacherQuery),
  )

  if (tracksError) return <ScreenError error={tracksError} backHref={cp('/admin')} backLabel="← All batches" />
  if (!tracks) return <ScreenSkeleton rows={4} />

  const addingNew = classifier === NEW_CLASSIFIER
  const effectiveClassifier = (addingNew ? newClassifier : classifier).trim()
  const classifierValid = CLASSIFIER_PATTERN.test(effectiveClassifier)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!trackId || !classifierValid || teachers.length === 0) return

    create.mutate(
      {
        trackId,
        classifier: effectiveClassifier,
        instructorIds: teachers.map(t => t.id),
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

          <div>
            <span className="label block text-ink-muted">Teachers</span>
            {teachers.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {teachers.map(teacher => (
                  <li
                    key={teacher.id}
                    className="flex items-center gap-2 border border-rule px-2.5 py-1 text-[0.8125rem]"
                  >
                    {teacher.name}
                    <button
                      type="button"
                      aria-label={`Remove ${teacher.name}`}
                      onClick={() => setTeachers(current => current.filter(t => t.id !== teacher.id))}
                      className="text-ink-muted transition-colors hover:text-vermilion"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <input
              value={teacherQuery}
              onChange={e => setTeacherQuery(e.target.value)}
              placeholder="Search by name, email or phone…"
              aria-label="Search for a teacher"
              className="mt-2 w-full border-b border-ink/25 bg-transparent py-1.5 text-[0.9375rem] placeholder:text-ink-muted/40 focus:border-vermilion focus:outline-none"
            />
            {debouncedTeacherQuery.trim() && (
              <ul className="mt-2 divide-y divide-rule">
                {searchingTeachers && !teacherResults ? (
                  <li className="py-2.5 text-[0.8125rem] text-ink-muted">Searching…</li>
                ) : (
                  (teacherResults ?? [])
                    .filter(candidate => !teachers.some(t => t.id === candidate.id))
                    .slice(0, MAX_SHOWN_RESULTS)
                    .map(candidate => (
                      <li key={candidate.id} className="flex items-center justify-between gap-3 py-2.5">
                        <span className="min-w-0">
                          <span className="block truncate text-[0.875rem]">{candidate.name}</span>
                          <span className="mt-0.5 flex flex-wrap gap-x-3 text-[0.75rem] text-ink-muted">
                            {candidate.email && <span className="break-all">{candidate.email}</span>}
                            {candidate.phone && <span className="font-mono">{candidate.phone}</span>}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setTeachers(current => [...current, { id: candidate.id, name: candidate.name }])
                            setTeacherQuery('')
                          }}
                          className="label shrink-0 border border-ink/25 px-3 py-1 transition-colors hover:border-vermilion hover:text-vermilion"
                        >
                          Add
                        </button>
                      </li>
                    ))
                )}
              </ul>
            )}
            <span className="mt-2 block text-[0.75rem] text-ink-muted">
              At least one teacher is required. They are seated as instructors when the batch is
              created.
            </span>
          </div>

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
              disabled={create.isPending || !trackId || !classifierValid || teachers.length === 0}
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
