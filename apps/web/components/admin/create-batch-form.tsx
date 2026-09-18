'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'

import { ApiError } from '@/lib/api/client'
import { catalogTracksQuery } from '@/lib/query/options'
import { useCreateBatch } from '@/lib/query/use-batch-mutations'
import { ScreenSkeleton } from '@/components/skeletons'
import { ScreenError } from '@/components/screen-error'
import { Standing } from '@/components/standing'

/**
 * Create a batch.
 *
 * Every batch that isn't marked completed is requestable by a student immediately — there's no
 * separate "open it up" step, so this form has nothing to ask about enrollment at all.
 */
export function CreateBatchForm() {
  const { data: tracks, error: tracksError } = useQuery(catalogTracksQuery())
  const create = useCreateBatch()
  const router = useRouter()

  const [trackId, setTrackId] = useState('')
  const [code, setCode] = useState('')
  const [startDate, setStartDate] = useState('')
  const [meetingUrl, setMeetingUrl] = useState('')

  if (tracksError) return <ScreenError error={tracksError} backHref="/admin" backLabel="← All batches" />
  if (!tracks) return <ScreenSkeleton rows={4} />

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!trackId || !code.trim()) return

    create.mutate(
      {
        trackId,
        code: code.trim(),
        startDate: startDate ? new Date(startDate).toISOString() : null,
        meetingUrl: meetingUrl.trim() ? meetingUrl.trim() : null,
      },
      { onSuccess: batch => router.push(`/admin/batches/${encodeURIComponent(batch.code)}`) },
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
            <span className="label block text-ink-muted">Code</span>
            <input
              required
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="VED-01-2026-BR-1"
              className="mt-2 w-full border-b border-ink/25 bg-transparent py-1.5 text-[0.9375rem] placeholder:text-ink-muted/40 focus:border-vermilion focus:outline-none"
            />
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
              disabled={create.isPending}
              className="label bg-ink px-4 py-2 text-paper transition-opacity disabled:opacity-50"
            >
              {create.isPending ? 'Creating…' : 'Create batch'}
            </button>
            {create.isError && (
              <p className="text-[0.8125rem] text-vermilion">
                {create.error instanceof ApiError ? create.error.message : 'Something went wrong.'}
              </p>
            )}
          </div>
        </form>
      </div>
    </>
  )
}
