/**
 * The real API client, for the read paths that have a real endpoint to call — dashboard, tracks,
 * exams, admin batches (see `lib/api/resources`). `fetchApi` below hits `apps/api` through
 * this app's own `/v1/*` path, which `next.config.ts`'s rewrite forwards to the real API origin:
 * this is a browser-side data layer (`lib/query/client.ts` explains why — SSR prefetch is off
 * because of a Next 16.2.6 streaming/hydration bug), so the browser is what actually issues these
 * requests, carrying whatever session cookie `lib/auth/client.ts`'s sign-in flow already set on
 * this same origin. `X-Profile-Id` is the one thing this layer still adds itself: which of the
 * signed-in account's profiles is active (`lib/auth/profile-store.ts`) isn't part of the session,
 * so every call attaches it explicitly rather than depending on the API to infer it.
 *
 * `send` below is the one remaining mock: `saveTrack`'s `subtitle` edit has no real endpoint. Its
 * latency is simulated on purpose — a data layer that only ever resolves synchronously hides every
 * loading state, every race, and every flash of fallback content. Everything else, writes
 * included (`mutateApi`), goes through a real fetch.
 */

import { clearSelectedProfile, getSelectedProfileId } from '@/lib/auth/profile-store'
import { courseFromPathname } from '@/lib/course-path'
import { resolveSchoolSlug } from '@/lib/school-host'

// Only a fallback for hosts that name no school (localhost, previews, tunnels) — see `lib/school-host.ts`.
const FALLBACK_SCHOOL_SLUG = process.env.NEXT_PUBLIC_SCHOOL_SLUG

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const profileId = getSelectedProfileId()
  // The school is the host's subdomain (`slmts.naradas.app`), read at request time for the same
  // reason as the course below: one build serves every school.
  const schoolSlug = resolveSchoolSlug(window.location.hostname, FALLBACK_SCHOOL_SLUG)
  // The course is the URL's first segment (`/vedam/dashboard`) — read here, at request time, so a
  // request can only ever name the course the tab is actually on. Top-level pages (`/login`, `/`)
  // are in no course and send none.
  const courseSlug = courseFromPathname(window.location.pathname)
  const response = await fetch(`/v1${path}`, {
    ...init,
    headers: {
      'x-school-slug': schoolSlug ?? '',
      ...(profileId ? { 'x-profile-id': profileId } : {}),
      ...(courseSlug ? { 'x-course-slug': courseSlug } : {}),
      ...init?.headers,
    },
  })

  // A 204 (e.g. DELETE) has no JSON body to parse — everything else unwraps `{ data }`.
  const body: unknown = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    // A session that expired or was revoked mid-visit — `proxy.ts` only checks cookie *presence*
    // at the edge (see its own doc comment), so a stale-but-present cookie sails past that gate and
    // only fails here, on the first real request that needs it. Every screen already renders
    // whatever `useQuery`'s error path does for any other failure, which for a 401 specifically
    // means silently sitting on a broken screen forever unless something sends the reader back to
    // sign in — so this is that something, the one place *every* real request funnels through.
    if (response.status === 401) {
      clearSelectedProfile()
      window.location.href = '/login'
    }

    const error = body as { error?: { code?: string; message?: string } } | null
    throw new ApiError(
      response.status,
      error?.error?.code ?? 'UNKNOWN_ERROR',
      error?.error?.message ?? `API error ${response.status} on ${path}`,
    )
  }

  // 204 has no `{ data }` envelope to unwrap — `mutateApi<void>` is how a DELETE call spells "I
  // don't need a return value", so `undefined` here is a real value, not a bug.
  return body === null ? (undefined as T) : (body as { data: T }).data
}

/**
 * Hits the real apps/api via the /v1 rewrite and unwraps `{ data }`.
 *
 * `schoolWide` sends the request *without* the active profile: a few list endpoints (`GET /exams`)
 * scope even a school admin to their own and their taught batches' rows the moment a profile is
 * supplied, and only return the whole school when none is — so an admin screen that has to see
 * every student's sitting has to ask that way. The API still requires the caller to be an admin.
 */
export async function fetchApi<T>(path: string, options?: { schoolWide?: boolean }): Promise<T> {
  return request<T>(path, {
    cache: 'no-store',
    ...(options?.schoolWide && { headers: { 'x-profile-id': '' } }),
  })
}

/**
 * A real write against apps/api — unlike `send` below, not a stand-in for a backend that doesn't
 * exist yet — through the same header injection and 401 handling `fetchApi` has.
 */
export async function mutateApi<T>(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<T> {
  return request<T>(path, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

/** Walks every page of a `{items, nextCursor}` endpoint, following `nextCursor` until it's null. */
export async function fetchAllPages<T>(
  path: (cursor: string | null) => string,
  options?: { schoolWide?: boolean },
): Promise<T[]> {
  const items: T[] = []
  let cursor: string | null = null

  do {
    const page: { items: T[]; nextCursor: string | null } = await fetchApi(path(cursor), options)
    items.push(...page.items)
    cursor = page.nextCursor
  } while (cursor)

  return items
}

const MUTATION_LATENCY_MS = 260

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** A 404 shaped like the API's own, for a lookup that came back empty client-side. */
export async function notFound(what: string): Promise<never> {
  throw new ApiError(404, 'NOT_FOUND', `${what} not found`)
}

/**
 * A write, described the way it will actually be issued.
 *
 * Mutations resolve to void: the optimistic cache write already holds the new
 * state, so the only thing the caller needs from the response is whether it
 * failed. In `apps/web` the body becomes
 * `fetchApi(path, { method, body: JSON.stringify(payload) })`.
 *
 * Writes get a longer simulated latency than reads. Optimistic UI is only worth
 * anything when the round trip is slow enough to notice, and a 20ms stub makes
 * a broken rollback look like it works.
 */
export async function send(
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  payload?: unknown,
): Promise<void> {
  await delay(MUTATION_LATENCY_MS)
  void [method, path, payload]
}
