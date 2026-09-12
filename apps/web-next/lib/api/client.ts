/**
 * The real API client, for the read paths that have a real endpoint to call — dashboard, tracks,
 * exams, admin batches (see `lib/api/resources.ts`). `fetchApi` below hits `apps/api-next` through
 * this app's own `/v1/*` path, which `next.config.ts`'s rewrite forwards to the real API origin:
 * this is a browser-side data layer (`lib/query/client.ts` explains why — SSR prefetch is off
 * because of a Next 16.2.6 streaming/hydration bug), so the browser is what actually issues these
 * requests, carrying whatever session cookie `lib/auth/client.ts`'s sign-in flow already set on
 * this same origin. `X-Profile-Id` is the one thing this layer still adds itself: which of the
 * signed-in account's profiles is active (`lib/auth/profile-store.ts`) isn't part of the session,
 * so every call attaches it explicitly rather than depending on the API to infer it.
 *
 * `rejectApi`/`send` below remain the mock layer for the four admin mutations with no real backend
 * yet (title/order/status edits — out of scope per PARITY_PLAN.md §17). Latency there is simulated
 * on purpose — a data layer that only ever resolves synchronously hides every loading state, every
 * race, and every flash of fallback content. Content authoring (`mutateApi` below) is different:
 * it has a real endpoint (`apps/api-next/src/chapters/route.ts`), so it goes through a real fetch
 * instead — see `lib/api/resources.ts`'s own doc comment on the resulting mock/real split.
 */

import { clearSelectedProfile, getSelectedProfileId } from '@/lib/auth/profile-store'

const SCHOOL_SLUG = process.env.NEXT_PUBLIC_SCHOOL_SLUG

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
  const response = await fetch(`/v1${path}`, {
    ...init,
    headers: {
      'x-school-slug': SCHOOL_SLUG ?? '',
      ...(profileId ? { 'x-profile-id': profileId } : {}),
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

/** Hits the real apps/api-next via the /v1 rewrite and unwraps `{ data }`. */
export async function fetchApi<T>(path: string): Promise<T> {
  return request<T>(path, { cache: 'no-store' })
}

/**
 * A real write against apps/api-next — unlike `send` below, this isn't a stand-in for a backend
 * that doesn't exist yet. Content authoring (`lib/api/resources.ts`'s `saveChapterScript`,
 * `presignAudioUpload`, etc.) is the one place in this app's admin surface with a real endpoint to
 * call, so it calls it, through the same header injection and 401 handling `fetchApi` already has.
 */
export async function mutateApi<T>(path: string, method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', body?: unknown): Promise<T> {
  return request<T>(path, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

/** Walks every page of a `{items, nextCursor}` endpoint, following `nextCursor` until it's null. */
export async function fetchAllPages<T>(path: (cursor: string | null) => string): Promise<T[]> {
  const items: T[] = []
  let cursor: string | null = null

  do {
    const page: { items: T[]; nextCursor: string | null } = await fetchApi(path(cursor))
    items.push(...page.items)
    cursor = page.nextCursor
  } while (cursor)

  return items
}

const LATENCY_MS = 180
const MUTATION_LATENCY_MS = 260

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Reject as the API would, so `retry` and error boundaries see a real shape. */
export async function rejectApi(status: number, code: string, message: string): Promise<never> {
  await delay(LATENCY_MS)
  throw new ApiError(status, code, message)
}

export async function notFound(what: string): Promise<never> {
  return rejectApi(404, 'NOT_FOUND', `${what} not found`)
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
