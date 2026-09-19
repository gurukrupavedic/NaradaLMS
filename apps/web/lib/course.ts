'use client'

import { useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'

import { courseOrigin, courseSlugFromHost } from '@/lib/course-host'
import { coursesQuery } from '@/lib/query/options'

/** Inlined at build time — see `packages/env`'s `NEXT_PUBLIC_APP_BASE_DOMAIN`. Unset, no hostname is a course and none of this shows. */
export const APP_BASE_DOMAIN = process.env.NEXT_PUBLIC_APP_BASE_DOMAIN

function subscribe(): () => void {
  return () => {}
}

function currentCourseSlug(): string | null {
  return courseSlugFromHost(window.location.hostname, APP_BASE_DOMAIN) ?? null
}

/**
 * The course this address is for, or `null` off the course domain. Read from `window.location`,
 * so the server renders `null` and the client the real value on its first render — the same
 * `useSyncExternalStore` shape as `lib/auth/profile-store.ts`, for the same no-flash reason.
 */
export function useCurrentCourseSlug(): string | null {
  return useSyncExternalStore(subscribe, currentCourseSlug, () => null)
}

/** Every course in the school, for the switcher. Only fetched on a course address — elsewhere there is no switcher to feed. */
export function useCourses(enabled: boolean) {
  return useQuery({ ...coursesQuery(), enabled })
}

/** Where `slug`'s course lives, or `null` if this address isn't on the course domain. */
export function courseHref(slug: string): string | null {
  const { protocol, hostname, port } = window.location
  const origin = courseOrigin({ protocol, hostname, port }, slug, APP_BASE_DOMAIN)
  return origin ? `${origin}/dashboard` : null
}
