import type { Metadata } from 'next'
import {
  Fraunces,
  IBM_Plex_Mono,
  Instrument_Sans,
  Noto_Serif_Devanagari,
  Noto_Serif_Telugu,
  Space_Mono,
} from 'next/font/google'

import { QueryProvider } from '@/components/query-provider'

import './globals.css'

// Display. Variable — so `axes` is passed and `weight` is deliberately absent;
// naming both makes next/font throw. WONK + low opsz are set in CSS (.display)
// rather than here, because only the large sizes should get the quirk.
const fraunces = Fraunces({
  variable: '--font-display',
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz', 'SOFT', 'WONK'],
})

// UI and body. Humanist, tight, and holds its shape at the 13px the roster
// matrix runs at — where Inter goes flat and characterless.
const instrument = Instrument_Sans({
  variable: '--font-ui',
  subsets: ['latin'],
})

// Eyebrows, stamps and column heads: the typewriter voice of a kept register.
const spaceMono = Space_Mono({
  variable: '--font-typewriter',
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
})

// Figures only. Space Mono's numerals are too mannered to stack in a 14-column
// mark-book; Plex keeps columns of digits readable and truly tabular.
const plexMono = IBM_Plex_Mono({
  variable: '--font-figure',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

// The app has carried `script: 'te' | 'sa' | 'en'` in its schema and a Vedic
// chant syllabus since day one, while loading no Indic face at all — every
// Devanagari glyph, down to the ॐ in the page header, has been rendering in
// whatever the browser happened to fall back to.
const notoDevanagari = Noto_Serif_Devanagari({
  variable: '--font-devanagari',
  subsets: ['devanagari'],
  weight: ['400', '600'],
})

// The practice room renders the same recitation in Telugu script, which the
// syllabus treats as a first-class reading and not a fallback.
const notoTelugu = Noto_Serif_Telugu({
  variable: '--font-telugu',
  subsets: ['telugu'],
  weight: ['400', '600'],
})

const fontVars = [
  fraunces.variable,
  instrument.variable,
  spaceMono.variable,
  plexMono.variable,
  notoDevanagari.variable,
  notoTelugu.variable,
].join(' ')

export const metadata: Metadata = {
  // A child route's own `metadata.title` fills `%s`, so every real screen gets its own browser
  // tab (`Practice · Narada`, `Sign in · Narada`) instead of every tab reading "Narada — Draft
  // Frontend" regardless of which of six screens is open — the tab strip stops being useful for
  // telling them apart. `default` is what a route with no title of its own still falls back to.
  title: { template: '%s · Narada', default: 'Narada — Draft Frontend' },
  description: 'Paper-and-ink design prototype for the Narada learning system.',
}

// Applied before first paint, so the theme is resolved for every route rather
// than by whichever component happens to mount. Previously the toggle lived
// inside AppShell, which meant sign-in — the one page that does not render the
// shell — could never be dark, and every other page painted light for a frame
// before correcting itself.
const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem('narada-theme');
var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;
document.documentElement.classList.toggle('dark',d)}catch(e){}})()`

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={fontVars} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
