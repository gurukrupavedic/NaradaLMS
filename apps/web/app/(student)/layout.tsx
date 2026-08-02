import type { Metadata } from 'next'
import { Geist, Geist_Mono, Crimson_Pro } from 'next/font/google'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { getSession, requestOrigin } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { PROFILE_COOKIE } from '@/lib/constants'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Theme, ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'

import '../globals.css'

const THEME_COOKIE: string = 'narada-theme'

const geistSans = Geist({ variable: '--font-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })
const crimsonPro = Crimson_Pro({
  variable: '--font-display',
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['400', '600'],
})

export const metadata: Metadata = {
  title: 'Narada LMS - Student',
}

async function readStoredTheme(): Promise<Theme> {
  const cookieStore = await cookies()
  const theme = cookieStore.get(THEME_COOKIE)
  return theme?.value === 'dark' ? 'dark' : 'light'
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const headerStore = await headers()
  const [session, cookieStore] = await Promise.all([
    getSession(headerStore.get('cookie') ?? '', requestOrigin(headerStore)),
    cookies(),
  ])

  if (!session || !cookieStore.get(PROFILE_COOKIE)) {
    redirect('/login')
  }

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
