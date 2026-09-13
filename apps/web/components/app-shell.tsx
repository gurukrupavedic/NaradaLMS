'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'

import { cn } from '@/lib/utils'
import { signOut as signOutRequest } from '@/lib/auth/client'
import {
  clearSelectedProfile,
  useHasAdminAccess,
  useSelectedProfileId,
  useSelectedProfileName,
} from '@/lib/auth/profile-store'

/**
 * The masthead.
 *
 * The old shell floated a rounded card inside a 24px gutter, which fought the
 * flat-paper idea it sat on — a shadowless system does not need a raised
 * container to say "this is the chrome". Here the bar is flush to the page and
 * separated by a single rule, the way a printed masthead is. It also gives the
 * content back the vertical space the gutter was spending.
 */

const NAV = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Practice', href: '/practice' },
  { label: 'Record', href: '/exams' },
  { label: 'Admin', href: '/admin' },
  // href is a placeholder — AppShell below swaps it for the signed-in account's own
  // `/students/:profileId` once the selected profile id is known.
  { label: 'Profile', href: '/profile' },
  { label: 'Settings', href: '/settings' },
]

// The theme lives on <html>, put there before paint by the root layout. Mirroring
// it into React state meant reading the DOM in an effect and calling setState
// from it — a cascading render, and a hydration mismatch waiting to happen, to
// decide one word of button text. The class is already the source of truth, so
// both labels are rendered and CSS shows whichever applies.
function toggleTheme() {
  const next = !document.documentElement.classList.contains('dark')
  document.documentElement.classList.toggle('dark', next)
  localStorage.setItem('narada-theme', next ? 'dark' : 'light')
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/dashboard"
      className={cn('display text-[1.35rem] leading-none tracking-tight', className)}
      aria-label="Narada — home"
    >
      Narada<span className="text-vermilion">.</span>
    </Link>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [menuOpen, setMenuOpen] = useState(false)
  const profileName = useSelectedProfileName()
  const hasAdminAccess = useHasAdminAccess()
  const selectedProfileId = useSelectedProfileId()
  // Hidden until access resolves, not just when it's false — showing the link and then
  // yanking it away a moment later reads as more broken than a one-tick-later appearance. Same
  // reasoning for "Profile": no cookie yet (a page rendered ahead of the client picking one up)
  // means no destination to link to, so it's simply absent rather than pointing at `/students/`.
  const nav = NAV.filter(item => item.href !== '/admin' || hasAdminAccess)
    .filter(item => item.href !== '/profile' || selectedProfileId)
    .map(item => (item.href === '/profile' ? { ...item, href: `/students/${selectedProfileId}` } : item))

  function handleSignOut() {
    void signOutRequest().finally(() => {
      clearSelectedProfile()
      // Every cached query — dashboard, exams, admin batches, authProfile — is scoped to
      // whoever was signed in. `QueryClient` is a browser-lifetime singleton
      // (`lib/query/client.ts`), so without this the *next* account to sign in in this same
      // tab would see the outgoing account's data (and its admin nav item) until each query
      // happened to refetch on its own — which, at a 60s+ staleTime, is not "immediately."
      queryClient.clear()
      router.push('/login')
    })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-rule bg-paper/92 backdrop-blur-[2px]">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-8 px-5">
          <Wordmark />

          <nav className="hidden flex-1 items-center gap-7 md:flex" aria-label="Primary">
            {nav.map(item => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'label relative py-1 transition-colors',
                    active ? 'text-ink' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  {item.label}
                  {/* The active mark is a ruled underline in the spot colour —
                      the same gesture as underlining a heading by hand. */}
                  {active && (
                    <span className="absolute -bottom-px left-0 h-px w-full bg-vermilion" />
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-4 md:ml-0">
            <button
              type="button"
              onClick={toggleTheme}
              className="label text-ink-muted transition-colors hover:text-ink"
              aria-label="Toggle colour scheme"
            >
              <span className="dark:hidden">Dark</span>
              <span className="hidden dark:inline">Light</span>
            </button>

            {profileName && (
              <span className="hidden items-center gap-2 sm:flex">
                <span
                  aria-hidden
                  className="grid size-6 place-items-center border border-rule bg-card font-label text-[0.5625rem] text-ink-muted"
                >
                  {profileName.charAt(0)}
                </span>
                <span className="text-[0.8125rem] text-ink-muted">{profileName}</span>
              </span>
            )}

            <button
              type="button"
              onClick={handleSignOut}
              className="label text-ink-muted transition-colors hover:text-ink"
            >
              Sign out
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              className="label text-ink-muted md:hidden"
              aria-expanded={menuOpen}
            >
              {menuOpen ? 'Close' : 'Menu'}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t border-rule-soft md:hidden" aria-label="Primary, mobile">
            {nav.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'label block border-b border-rule-soft px-5 py-3 last:border-0',
                  pathname === item.href ? 'text-vermilion' : 'text-ink-muted',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 border-t border-rule">
        <div className="mx-auto flex max-w-5xl items-baseline justify-between px-5 py-6">
          <span className="label text-ink-muted">Narada · practice register</span>
          <span className="font-deva text-base text-ink/25" aria-hidden>
            ॐ
          </span>
        </div>
      </footer>
    </div>
  )
}
