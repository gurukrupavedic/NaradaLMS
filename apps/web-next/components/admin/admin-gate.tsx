'use client'

import Link from 'next/link'

import { ScreenSkeleton } from '@/components/skeletons'
import { useHasAdminAccess } from '@/lib/auth/profile-store'

/**
 * The one choke point every `/admin/*` screen renders behind. Hiding the "Admin" nav item in
 * `AppShell` stops the casual path in, but api-next's own `AccessPolicy` — which decides `x-profile
 * -id`'s scope on the batches/tracks endpoints — is the real authority, and a direct hit on the URL
 * or a stale bookmark shouldn't reach a screen built assuming school-wide data and quietly render
 * whatever narrower slice a non-admin's requests happen to come back with (see the "why do I only
 * see my own batch" report this was added for).
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const hasAccess = useHasAdminAccess()

  if (hasAccess === undefined) return <ScreenSkeleton rows={6} />

  if (!hasAccess) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center px-6">
        <p className="label text-vermilion">Restricted</p>
        <h1 className="display mt-4 text-[2rem]">This page is for administrators.</h1>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted">
          Your account doesn&apos;t have admin access in this school.
        </p>
        <Link
          href="/dashboard"
          className="label mt-8 w-fit border border-rule px-4 py-2.5 text-ink-muted transition-colors hover:border-vermilion hover:text-vermilion"
        >
          Back to practice
        </Link>
      </main>
    )
  }

  return <>{children}</>
}
