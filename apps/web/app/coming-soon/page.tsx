import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Coming soon',
}

/**
 * Fronts every route when `COMING_SOON_MODE=true` (see `middleware.ts`, which rewrites
 * here without changing the URL) — a maintenance page, not a 404: whatever the reader
 * asked for exists, it just isn't open yet.
 */
export default function ComingSoonPage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-paper px-6 text-center">
      <span
        aria-hidden
        className="font-deva pointer-events-none absolute -bottom-16 select-none text-ink/[0.04] leading-none"
        style={{ fontSize: '32rem' }}
      >
        ॐ
      </span>

      <div className="relative">
        <p className="label text-vermilion">Narada</p>

        <h1 className="display mt-5 text-[2rem] leading-[1.1] sm:text-[2.75rem]">
          The register isn&apos;t
          <br />
          open yet.
        </h1>

        <p className="mx-auto mt-5 max-w-sm text-[0.9375rem] leading-relaxed text-ink-muted">
          We&apos;re getting the practice room ready. Check back shortly.
        </p>

        <p className="label mt-12 text-ink-muted/60">Vedic studies · est. 2024</p>
      </div>
    </main>
  )
}
