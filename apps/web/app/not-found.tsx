import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Not found' }

/**
 * Pages now live under a course (`/vedam/dashboard`), so a bookmark to the old address (`/dashboard`,
 * `/admin/batches/…`) lands here. "/" finds the person's course and sends them into it.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-16">
      <p className="label text-vermilion">Not found</p>
      <h1 className="display mt-4 text-[2.5rem]">There&apos;s nothing at this address.</h1>
      <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted">
        Pages live under your course, like <span className="font-mono">/vedam/dashboard</span>. If
        this was a saved link, start from the home page and it will take you there.
      </p>
      <Link
        href="/"
        className="label mt-8 w-fit border border-rule px-4 py-2.5 text-ink-muted transition-colors hover:border-vermilion hover:text-vermilion"
      >
        Go to the home page
      </Link>
    </main>
  )
}
