import { useSyncExternalStore } from 'react'

import { resolveSchoolSlug } from '@/lib/school-host'

// Only a fallback for hosts that name no school (localhost, previews, tunnels) — see `lib/school-host.ts`.
const FALLBACK_SCHOOL_SLUG = process.env.NEXT_PUBLIC_SCHOOL_SLUG

/** The school this tab is on — the host's subdomain, else the dev fallback. Browser-only: reads `window`. */
export function currentSchoolSlug(): string | null {
  return resolveSchoolSlug(window.location.hostname, FALLBACK_SCHOOL_SLUG)
}

const subscribeToNothing = () => () => {}

/**
 * `currentSchoolSlug` for rendering. The school is only known in the browser (one build serves
 * every school), so the server render — and React's hydration pass over it — sees `null`, and the
 * real value arrives on the very next render. `useSyncExternalStore` is what makes that hand-off
 * free of hydration mismatches; reading `window` directly during render would not be.
 */
export function useSchoolSlug(): string | null {
  return useSyncExternalStore(subscribeToNothing, currentSchoolSlug, () => null)
}
