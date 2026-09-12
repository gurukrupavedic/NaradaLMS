import type { Metadata } from 'next'
import { IBM_Plex_Mono, Source_Sans_3, Source_Serif_4 } from 'next/font/google'

import { cn } from '@/lib/utils'
import { THEME_COOKIE } from '@/lib/constants'
import { readStoredTheme } from '@/lib/theme'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'

import './globals.css'

const sourceSans = Source_Sans_3({ variable: '--font-sans', subsets: ['latin'] })
const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})
const sourceSerif = Source_Serif_4({
  variable: '--font-display',
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['400', '600'],
})

export const metadata: Metadata = {
  title: 'Narada LMS',
}

// The one place <html>/<body>, fonts, and the theme/toast providers are set up — every route
// group used to duplicate this (each rendering its own <html>), which is also why a failure
// inside e.g. (student)/layout.tsx's session check couldn't be caught by a normal error.tsx.
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const theme = await readStoredTheme()

  return (
    <html
      lang="en"
      className={cn(
        sourceSans.variable,
        plexMono.variable,
        sourceSerif.variable,
        theme === 'dark' && 'dark',
        'h-full antialiased',
      )}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col font-sans text-sm">
        <ThemeProvider initialTheme={theme} storageKey={THEME_COOKIE}>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
