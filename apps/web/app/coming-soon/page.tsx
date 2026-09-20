import type { Metadata } from 'next'

import { SHLOKA, SHLOKA_TRANSLATION, TAGLINE } from '@/lib/brand'

export const metadata: Metadata = {
  title: 'Arriving Devi Navaratri',
  description: "Narada's app is still being built — arriving this Devi Navaratri.",
}

/**
 * Fronts every route when `COMING_SOON_MODE=true` (see `proxy.ts`, which rewrites here
 * without changing the URL) — a maintenance page, not a 404: whatever the reader asked
 * for exists, it just isn't open yet.
 *
 * TEMPORARY(preview-unlock): when `PREVIEW_PASSWORD` is set, a quiet "Team access" form lets people
 * who know it through (see `lib/preview-unlock.ts`). Reading `searchParams` also makes this page
 * dynamic, so that env var is read per request rather than frozen in at build time.
 */
export default async function ComingSoonPage({
  searchParams,
}: {
  searchParams: Promise<{ unlock?: string }>
}) {
  const unlockEnabled = Boolean(process.env.PREVIEW_PASSWORD)
  const unlockFailed = (await searchParams).unlock === 'failed'

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-paper px-6 text-center">
      <span
        aria-hidden
        className="font-deva pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/4 select-none text-ink/4 leading-none"
        style={{ fontSize: '32rem' }}
      >
        ॐ
      </span>

      <div className="relative">
        <h1 className="display text-[2rem] leading-[1.1] sm:text-[2.75rem]">
          Narada arriving
          <br />
          <span className="text-[1.8rem] text-vermilion">Devi Navaratri</span>
        </h1>

        <div className="mx-auto mt-6 max-w-md">
          <p className="font-deva text-[1.125rem] leading-loose text-ink">
            {SHLOKA[0]}
            <br />
            {SHLOKA[1]}
          </p>

          <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted italic">
            &ldquo;{SHLOKA_TRANSLATION}&rdquo;
          </p>
        </div>

        <p className="label mt-12 text-ink-muted/60">{TAGLINE}</p>

        {unlockEnabled && (
          <details className="mx-auto mt-10 w-fit" open={unlockFailed}>
            <summary className="label cursor-pointer list-none text-ink-muted/60 transition-colors hover:text-vermilion [&::-webkit-details-marker]:hidden">
              Team access
            </summary>
            <form method="post" action="/coming-soon/unlock" className="mt-4 flex items-end gap-3">
              <label htmlFor="preview-password" className="sr-only">
                Password
              </label>
              <input
                id="preview-password"
                name="password"
                type="password"
                required
                autoFocus={unlockFailed}
                autoComplete="current-password"
                className="w-56 border-b border-ink/25 bg-transparent py-2 text-[1rem] transition-colors focus:border-vermilion focus:outline-none"
              />
              <button
                type="submit"
                className="label border border-rule px-4 py-2 text-ink-muted transition-colors hover:border-vermilion hover:text-vermilion"
              >
                Enter
              </button>
            </form>
            {unlockFailed && (
              <p role="alert" className="mt-3 text-[0.875rem] text-vermilion">
                That password didn&apos;t work.
              </p>
            )}
          </details>
        )}
      </div>
    </main>
  )
}
