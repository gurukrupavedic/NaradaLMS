import { fetchApi, mutateApi } from '@/lib/api/client'
import type { ApiJapamDay, ApiJapamSummary } from '@/lib/api/api-types'

// GET /v1/profiles/:profileId/japam?from=&to= — anyone who may view the profile (the student, a
// teacher who shares a batch with them, a school admin). 404 in a school that keeps no japam.
// Both bounds are inclusive 'YYYY-MM-DD' dates; leave both out for a lifetime.
export async function fetchJapam(
  profileId: string,
  window: { from?: string; to?: string } = {},
): Promise<ApiJapamSummary> {
  const params = new URLSearchParams()
  if (window.from) params.set('from', window.from)
  if (window.to) params.set('to', window.to)
  const query = params.toString()
  return fetchApi<ApiJapamSummary>(`/profiles/${profileId}/japam${query ? `?${query}` : ''}`)
}

// POST /v1/profiles/:profileId/japam — *adds* `count` to a day (the student's today unless a past
// `loggedOn` is given), so two devices logging at once both count. Resolves to that day's new total.
export async function logJapam(
  profileId: string,
  input: { count: number; loggedOn?: string },
): Promise<ApiJapamDay> {
  return mutateApi<ApiJapamDay>(`/profiles/${profileId}/japam`, 'POST', input)
}

// PUT /v1/profiles/:profileId/japam/:loggedOn — sets a day's total outright: a correction, up or
// down. 0 clears the day.
export async function setJapamDay(
  profileId: string,
  loggedOn: string,
  count: number,
): Promise<ApiJapamDay> {
  return mutateApi<ApiJapamDay>(`/profiles/${profileId}/japam/${loggedOn}`, 'PUT', { count })
}
