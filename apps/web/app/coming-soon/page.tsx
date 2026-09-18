import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Coming soon',
}

/**
 * Fronts every route when `COMING_SOON_MODE=true` (see `proxy.ts`, which rewrites here
 * without changing the URL) — a maintenance page, not a 404: whatever the reader asked
 * for exists, it just isn't open yet.
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
          Narada<span className="text-vermilion">&apos;s</span> App is
          <br />
          still being built
        </h1>

        <div className="mx-auto mt-6 max-w-md">
          <p className="font-deva text-[1.125rem] leading-loose text-ink">
            तपःस्वाध्यायनिरतं तपस्वी वाग्विदां वरम् ।
            <br />
            नारदं परिपप्रच्छ वाल्मीकिर्मुनिपुङ्गवम् ॥
          </p>

          <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted italic">
            &ldquo;Sage Vālmīki approached Devarṣi Nārada—the great sage devoted to Tapas and
            Svādhyāya, and foremost among the wise.&rdquo;
          </p>
        </div>

        <p className="label mt-12 text-ink-muted/60">
          Adhyayana, Anuṣṭhāna, Avagāhana · Est. 2017
        </p>
      </div>
    </main>
  )
}
