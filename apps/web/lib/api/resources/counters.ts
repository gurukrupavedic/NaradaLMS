import { fetchApi, mutateApi } from '@/lib/api/client'
import type { ApiCounterDay, ApiCounterSummary } from '@/lib/api/api-types'

// Every call here is scoped to the course in the URL: `request()` sends it as `x-course-slug`, so a
// counter is always the one of the course the page is in. `key` is a counter's permanent key from
// `@narada/profile-fields` (`counterFieldsFor`); a course that doesn't keep it answers 404.

// GET /v1/profiles/:profileId/counters/:key?from=&to= — anyone who may view the profile (the
// student, a teacher who shares a batch with them, a school admin). Both bounds are inclusive
// 'YYYY-MM-DD' dates; leave both out for a lifetime.
export async function fetchCounter(
  profileId: string,
  key: string,
  window: { from?: string; to?: string } = {},
): Promise<ApiCounterSummary> {
  const params = new URLSearchParams()
  if (window.from) params.set('from', window.from)
  if (window.to) params.set('to', window.to)
  const query = params.toString()
  return fetchApi<ApiCounterSummary>(
    `/profiles/${profileId}/counters/${key}${query ? `?${query}` : ''}`,
  )
}

// POST /v1/profiles/:profileId/counters/:key — *adds* `count` to a day (the student's today unless a
// past `loggedOn` is given), so two devices logging at once both count. Resolves to that day's new total.
export async function logCounter(
  profileId: string,
  key: string,
  input: { count: number; loggedOn?: string },
): Promise<ApiCounterDay> {
  return mutateApi<ApiCounterDay>(`/profiles/${profileId}/counters/${key}`, 'POST', input)
}

// PUT /v1/profiles/:profileId/counters/:key/:loggedOn — sets a day's total outright: a correction,
// up or down. 0 clears the day.
export async function setCounterDay(
  profileId: string,
  key: string,
  loggedOn: string,
  count: number,
): Promise<ApiCounterDay> {
  return mutateApi<ApiCounterDay>(`/profiles/${profileId}/counters/${key}/${loggedOn}`, 'PUT', {
    count,
  })
}
