'use client'

import { useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'

import { authProfileQuery } from '@/lib/query/options'

/**
 * Which of a signed-in account's profiles is being acted as — a real question here, not an edge
 * case: a household can share one phone number across several children's profiles (see
 * `app/login/page.tsx`'s own doc comment), so a session alone doesn't say who's practising.
 *
 * The id lives in a plain (non-httpOnly) cookie, not just `localStorage`: `middleware.ts` needs to
 * read it at the edge, before any page renders, to redirect a session with no profile chosen yet
 * back to `/login`. Nothing about `x-profile-id` is a secret worth hiding from client JS either —
 * api-next validates it against the caller's own session on every request
 * (`resolveOptionalProfile` in the api-next checkout's `naradaRoute.ts` rejects any id that
 * isn't the authenticated user's own), so a client that lied about it would just get a 403, not
 * someone else's data.
 *
 * The name is display-only, cached at selection time (`setSelectedProfile`) so showing "who's
 * logged in" in the header never costs a request — it lives in `localStorage` since middleware has
 * no use for it.
 */

const PROFILE_ID_COOKIE = 'narada-profile-id'
const PROFILE_NAME_KEY = 'narada-profile-name'

function setCookie(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0`
}

export function getSelectedProfileId(): string | null {
  return readCookie(PROFILE_ID_COOKIE)
}

function getSelectedProfileName(): string | null {
  try {
    return localStorage.getItem(PROFILE_NAME_KEY)
  } catch {
    return null
  }
}

export function setSelectedProfile(id: string, name: string): void {
  setCookie(PROFILE_ID_COOKIE, id)
  try {
    localStorage.setItem(PROFILE_NAME_KEY, name)
  } catch {
    // Private-browsing localStorage throws on write; the header just shows nothing.
  }
}

export function clearSelectedProfile(): void {
  deleteCookie(PROFILE_ID_COOKIE)
  try {
    localStorage.removeItem(PROFILE_NAME_KEY)
  } catch {
    // See setSelectedProfile.
  }
}

// No real subscription — nothing in this app changes the selected profile without a full
// navigation (sign-in, sign-out), which remounts everything anyway. `useSyncExternalStore` is
// still the right primitive over `useEffect`+`useState`: its `getServerSnapshot` argument is what
// lets the server render `null` (no `localStorage`) while the client reads the real value on its
// very first render — no post-hydration flash, no mismatch, no synchronous `setState` in an effect.
function subscribe(): () => void {
  return () => {}
}

export function useSelectedProfileName(): string | null {
  return useSyncExternalStore(subscribe, getSelectedProfileName, () => null)
}

/**
 * Whether the signed-in *account* (not the acted-as profile — see this file's header comment)
 * has admin-level access anywhere it matters here: global super-admin, or owner/admin of this
 * school specifically. Mirrors apps/web's own `hasSchoolWideAccess` (`lib/session.ts` there).
 *
 * `undefined` means "not resolved yet" — the api-next authorization check
 * (`isSchoolAdmin`/`AccessPolicy`) is the actual gate on every admin request; a caller who treated
 * `undefined` as `false` would flash the "not an admin" state for every admin on every load.
 */
export function useHasAdminAccess(): boolean | undefined {
  const { data } = useQuery(authProfileQuery())
  if (!data) return undefined
  return data.isSuperAdmin || data.memberships.some(m => m.role === 'owner' || m.role === 'admin')
}
