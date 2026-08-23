import type { Metadata } from 'next'
import { Geist, Geist_Mono, Crimson_Pro } from 'next/font/google'

import { cn } from '@/lib/utils'
import { THEME_COOKIE } from '@/lib/constants'
import { readStoredTheme } from '@/lib/theme'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'

import './globals.css'

const geistSans = Geist({ variable: '--font-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })
const crimsonPro = Crimson_Pro({
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
        geistSans.variable,
        geistMono.variable,
        crimsonPro.variable,
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
