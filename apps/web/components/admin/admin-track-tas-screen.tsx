'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { ScreenSkeleton } from '@/components/skeletons'
import { ScreenError } from '@/components/screen-error'
import { Section } from '@/components/section'
import { Spinner } from '@/components/spinner'
import { Standing } from '@/components/standing'
import { catalogTracksQuery, trackTaCandidatesQuery, trackTasQuery } from '@/lib/query/options'
import { useAddTrackTa, useRemoveTrackTa } from '@/lib/query/use-track-ta-mutations'
import { formatLocation } from '@/lib/geo'
import { formatTimeZone } from '@/lib/timezone'
import type { ApiTrackTa } from '@/lib/api/api-types'

// "United States · America/New York (EDT, GMT-04:00)" — whichever of the two the TA has set.
function whereabouts(ta: { country: string | null; countryTimeZone: string | null }): string {
  return [formatLocation(null, ta.country), formatTimeZone(ta.countryTimeZone)].filter(Boolean).join(' · ')
}

/**
 * The TAs a student is pointed to for an L3, one list per track. Students read these on their track
 * ladder; only here can they be changed. Adding is limited to TAs who are at L3 on every chapter of
 * the track (the server enforces it — the picker just doesn't offer anyone else).
 */
export function AdminTrackTasScreen() {
  const { data: tracks, error: tracksError } = useQuery(catalogTracksQuery())
  const { data: tas, error: tasError } = useQuery(trackTasQuery())

  const error = tracksError ?? tasError
  if (error) return <ScreenError error={error} />
  if (!tracks || !tas) return <ScreenSkeleton rows={6} />

  return (
    <>
      <Standing
        eyebrow="Administration"
        headline="Track TAs"
        meta="The TAs students can go to for an L3 on each track. Only TAs with L3 on every chapter of a track can be listed for it."
      />

      <div className="mx-auto max-w-5xl space-y-12 px-5 py-9">
        {tracks.map(track => (
          <TrackTas
            key={track.id}
            trackId={track.id}
            trackName={track.name}
            listed={tas.filter(ta => ta.trackId === track.id)}
          />
        ))}
      </div>
    </>
  )
}

function TrackTas({ trackId, trackName, listed }: { trackId: string; trackName: string; listed: ApiTrackTa[] }) {
  return (
    <Section title={trackName} count={`${listed.length}`}>
      <div className="sheet">
        {listed.length === 0 ? (
          <p className="px-4 py-5 text-[0.875rem] text-ink-muted">No TAs listed for this track.</p>
        ) : (
          <ol>
            {listed.map(ta => (
              <ListedTa key={ta.profileId} ta={ta} />
            ))}
          </ol>
        )}
        <AddTa trackId={trackId} />
      </div>
    </Section>
  )
}

function ListedTa({ ta }: { ta: ApiTrackTa }) {
  const remove = useRemoveTrackTa()

  return (
    <li className="flex items-center gap-4 border-b border-rule-soft px-4 py-3">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem]">{ta.name}</span>
        <span className="block font-mono text-[0.6875rem] text-ink-muted">{whereabouts(ta) || 'No location on file'}</span>
      </span>
      <button
        type="button"
        disabled={remove.isPending}
        aria-busy={remove.isPending}
        onClick={() => remove.mutate({ trackId: ta.trackId, profileId: ta.profileId })}
        className="label inline-flex shrink-0 items-center gap-2 border border-rule px-3 py-1.5 text-ink-muted transition-colors hover:border-vermilion hover:text-vermilion disabled:pointer-events-none disabled:opacity-50"
      >
        {remove.isPending && <Spinner />}
        Remove
      </button>
    </li>
  )
}

function AddTa({ trackId }: { trackId: string }) {
  const { data: candidates, error } = useQuery(trackTaCandidatesQuery(trackId))
  const add = useAddTrackTa()
  const [profileId, setProfileId] = useState('')

  if (error) return <p className="px-4 py-3 text-[0.875rem] text-vermilion">Couldn&apos;t load eligible TAs.</p>
  if (!candidates) return null
  if (candidates.length === 0) {
    return <p className="label px-4 py-3 text-ink-muted">No other TA has L3 on every chapter of this track.</p>
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profileId) return
    add.mutate({ trackId, profileId }, { onSuccess: () => setProfileId('') })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4 px-4 py-3">
      <label className="min-w-[12rem] flex-1">
        <span className="label block text-ink-muted">Eligible TA</span>
        <select
          value={profileId}
          onChange={e => setProfileId(e.target.value)}
          className="mt-2 w-full border-b border-ink/25 bg-transparent py-1.5 text-[0.875rem] focus:border-vermilion focus:outline-none"
        >
          <option value="">Choose a TA…</option>
          {candidates.map(candidate => (
            <option key={candidate.profileId} value={candidate.profileId}>
              {[candidate.name, whereabouts(candidate)].filter(Boolean).join(' — ')}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        disabled={add.isPending || !profileId}
        aria-busy={add.isPending}
        className="label inline-flex shrink-0 items-center gap-2 bg-ink px-4 py-2 text-paper transition-opacity disabled:opacity-50"
      >
        {add.isPending && <Spinner />}
        {add.isPending ? 'Adding…' : 'Add TA'}
      </button>
    </form>
  )
}
