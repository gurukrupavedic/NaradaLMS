'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'

import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { CommandPalette } from '@/components/command-palette'
import { CourseAccess } from '@/components/course-access'
import { CourseSwitcher } from '@/components/course-switcher'
import { useSignOut } from '@/lib/auth/use-sign-out'
import { useSwitchProfile } from '@/lib/auth/use-switch-profile'
import { useCoursePath } from '@/lib/course'
import { coursePath } from '@/lib/course-path'
import { myProfilesQuery } from '@/lib/query/options'
import {
  useHasAdminAccess,
  useSelectedProfileId,
  useSelectedProfileName,
} from '@/lib/auth/profile-store'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * The masthead.
 *
 * The old shell floated a rounded card inside a 24px gutter, which fought the
 * flat-paper idea it sat on — a shadowless system does not need a raised
 * container to say "this is the chrome". Here the bar is flush to the page and
 * separated by a single rule, the way a printed masthead is. It also gives the
 * content back the vertical space the gutter was spending.
 */

// Paths within the course — `useCoursePath()` puts the course in front (`/dashboard` → `/vedam/dashboard`).
const NAV = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Learning', path: '/practice' },
  { label: 'Exams', path: '/exams' },
  { label: 'Admin', path: '/admin' },
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

// A row of the profile dropdown — label on the left, the same trailing "→" used
// by every other row-style link in the app (e.g. "Review applications →" on the
// admin overview), turning vermilion on hover/focus instead of an icon.
function MenuRow({
  children,
  render,
  onClick,
}: {
  children: React.ReactNode
  render?: React.ReactElement
  onClick?: () => void
}) {
  return (
    <DropdownMenuItem
      render={render}
      onClick={onClick}
      className="group/row flex items-center justify-between gap-4 rounded-none border-b border-rule-soft px-4 py-2.5 text-[0.8125rem] text-ink-muted last:border-0 focus:bg-ink/[0.03] focus:text-ink"
    >
      {children}
      <span
        aria-hidden
        className="text-ink-muted/60 transition-colors group-focus/row:text-vermilion"
      >
        →
      </span>
    </DropdownMenuItem>
  )
}

// Also shown on pages that sit outside any course (`/link-device`), where "home" is `/` — which finds
// the person's course for them.
export function Wordmark({ className }: { className?: string }) {
  const { course } = useParams<{ course?: string }>()
  return (
    <Link
      href={course ? coursePath(course, '/dashboard') : '/'}
      className={cn('display text-[1.35rem] leading-none tracking-tight', className)}
      aria-label="Narada — home"
    >
      Narada<span className="text-vermilion">&apos;s</span>
    </Link>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const cp = useCoursePath()
  const handleSignOut = useSignOut()
  const [menuOpen, setMenuOpen] = useState(false)
  const profileName = useSelectedProfileName()
  const hasAdminAccess = useHasAdminAccess()
  const selectedProfileId = useSelectedProfileId()
  const switchProfile = useSwitchProfile()
  // Only fetched to answer "is there anyone else to switch to" — a household sharing one phone
  // number across several children's profiles (see use-switch-profile.ts's own doc comment) is a
  // real case here, not a hypothetical, but most accounts hold exactly one profile, and the menu
  // simply omits the switcher rows entirely rather than showing a single-item dead end.
  const { data: myProfiles } = useQuery(myProfilesQuery())
  const otherProfiles = (myProfiles ?? []).filter(profile => profile.id !== selectedProfileId)
  // Hidden until access resolves, not just when it's false — showing the link and then
  // yanking it away a moment later reads as more broken than a one-tick-later appearance.
  const nav = NAV.filter(item => item.path !== '/admin' || hasAdminAccess).map(item => ({
    ...item,
    href: cp(item.path),
  }))
  // No cookie yet (a page rendered ahead of the client picking one up) means no destination to
  // link to, so "Profile" is simply absent from the menu rather than pointing at `/students/`.
  const profileHref = selectedProfileId ? cp(`/students/${selectedProfileId}`) : null

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-rule bg-paper/92 backdrop-blur-[2px]">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-8 px-5">
          <Wordmark />
          <CourseSwitcher />

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
            <CommandPalette />

            <button
              type="button"
              onClick={toggleTheme}
              className="label text-ink-muted transition-colors hover:text-ink"
              aria-label="Toggle colour scheme"
            >
              <span className="dark:hidden">Dark</span>
              <span className="hidden dark:inline">Light</span>
            </button>

            {profileName ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="group flex items-center gap-2 text-ink-muted outline-none transition-colors hover:text-ink data-[popup-open]:text-ink">
                  <span
                    aria-hidden
                    className="grid size-6 place-items-center border border-rule bg-card font-label text-[0.5625rem] text-ink-muted"
                  >
                    {profileName.charAt(0)}
                  </span>
                  <span className="hidden text-[0.8125rem] sm:inline">{profileName}</span>
                  <ChevronDown
                    aria-hidden
                    className="size-3 text-ink-muted/70 transition-colors group-data-[popup-open]:text-vermilion"
                  />
                </DropdownMenuTrigger>
                {/* Overrides the primitive's default shadcn look (rounded corners, drop
                    shadow, accent-blue focus ring) — this system carries depth with a single
                    hairline and a card/paper value shift, never a shadow. See .sheet in
                    globals.css for the same treatment applied to every other floating list. The
                    trailing "→" that turns vermilion on focus is the same affordance used by
                    every other row-style link in the app (see "Review applications →" above). */}
                <DropdownMenuContent
                  align="end"
                  sideOffset={10}
                  className="min-w-48 rounded-none border border-rule bg-card p-0 shadow-none ring-0"
                >
                  {/* A household sharing one phone number across several children's profiles
                      (use-switch-profile.ts's own doc comment) — omitted entirely rather than a
                      single dead-end row when this account only has the one profile. */}
                  {otherProfiles.map(profile => (
                    <MenuRow key={profile.id} onClick={() => switchProfile(profile)}>
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span
                          aria-hidden
                          className="grid size-6 shrink-0 place-items-center border border-rule bg-card font-label text-[0.5625rem] text-ink-muted"
                        >
                          {profile.name.charAt(0)}
                        </span>
                        <span className="min-w-0 truncate">Switch to {profile.name}</span>
                      </span>
                    </MenuRow>
                  ))}
                  {profileHref && <MenuRow render={<Link href={profileHref} />}>Profile</MenuRow>}
                  <MenuRow render={<Link href={cp('/settings')} />}>Settings</MenuRow>
                  <MenuRow onClick={handleSignOut}>Sign out</MenuRow>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // No profile name yet (pre-hydration, or none selected) — still offer a way out
              // rather than trapping the user behind a menu with nothing to anchor it to.
              <button
                type="button"
                onClick={handleSignOut}
                className="label text-ink-muted transition-colors hover:text-ink"
              >
                Sign out
              </button>
            )}

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

      <main className="flex-1">
        <CourseAccess>{children}</CourseAccess>
      </main>

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
