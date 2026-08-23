'use client'

import { useState, useTransition } from 'react'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CaretDownIcon,
  ExamIcon,
  HamburgerIcon,
  HouseIcon,
  LeaveIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
  XIcon,
} from '@/components/ui/icons'
import { useTheme } from '@/components/theme-provider'
import { signOut } from '@/lib/session'
import type { ApiProfile } from '@/lib/types'

export interface NavigationItem {
  label: string
  icon: LucideIcon
  href: string
}

const ADMIN_NAV_ITEM: NavigationItem = { label: 'Admin', icon: SettingsIcon, href: '/admin' }

// The ONE place the nav item list is assembled. Every page used to hand-roll its own
// `navItems` array — that's exactly how "Admin" and later "Exams" ended up present on some
// pages and silently missing on others (the nav visibly changing shape as you navigate) since
// nothing forced every page to stay in sync. Every page should call this instead of building
// its own array.
export function getNavItems(isAdmin: boolean): NavigationItem[] {
  const items: NavigationItem[] = [
    { label: 'Dashboard', icon: HouseIcon, href: '/' },
    { label: 'Exams', icon: ExamIcon, href: '/exams' },
  ]
  if (isAdmin) {
    items.push(ADMIN_NAV_ITEM)
  }
  return items
}

function isItemActive(item: NavigationItem, pathname: string): boolean {
  if (item.href === '/') return pathname === '/'
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

function NavButton({ item, isActive }: { item: NavigationItem; isActive: boolean }) {
  const Icon = item.icon
  const buttonClass = cn(
    'group flex items-center gap-2 rounded-none px-3 py-1.5 text-sm transition-colors',
    isActive
      ? 'text-foreground font-medium'
      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
  )

  return (
    <Button variant="ghost" className={buttonClass} render={<a href={item.href} />} nativeButton={false}>
      <Icon className="size-3.5 shrink-0" />
      <span>{item.label}</span>
    </Button>
  )
}

function UserMenu({ profile }: { profile: ApiProfile | null }) {
  const [isSigningOut, startSignOut] = useTransition()
  const name = profile?.name ?? 'Account'

  function handleSignOut() {
    startSignOut(() => signOut())
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className="group text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-1.5 py-1 text-xs transition-colors" />
        }
      >
        <Avatar className="size-6 shrink-0">
          <AvatarFallback className="bg-primary text-[9px] font-medium text-primary-foreground">
            {name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-foreground font-medium">{name}</span>
        <CaretDownIcon className="size-2.5 transition-transform group-data-popup-open:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" className="min-w-44">
        <div className="px-3 py-2">
          <p className="text-xs font-medium">{name}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} disabled={isSigningOut}>
          <LeaveIcon className="size-3.5 shrink-0" />
          {isSigningOut ? 'Signing out…' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface AppShellProps {
  navigationItems: NavigationItem[]
  profile: ApiProfile | null
  className?: string
  children?: React.ReactNode
}

export function AppShell({ navigationItems, profile, children, className }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isSigningOut, startSignOut] = useTransition()
  const { theme, toggleTheme } = useTheme()
  const pathname = usePathname()

  function handleSignOut() {
    startSignOut(() => signOut())
  }

  return (
    <div className={cn('flex h-full flex-col overflow-hidden', className)}>
      {/* Floating nav — wide gutter, card treatment */}
      <div className="shrink-0 px-6 py-3">
        <div className="bg-card ring-1 ring-foreground/10">
          <header className="flex h-13 items-center px-5">
            {/* Brand — left third */}
            <div className="flex flex-1 items-center">
              <span className="whitespace-nowrap text-sm font-semibold tracking-tight">
                Narada LMS
              </span>
            </div>

            {/* Nav items — centered */}
            <nav className="hidden items-center gap-3 md:flex">
              {navigationItems.map(item => (
                <NavButton key={item.label} item={item} isActive={isItemActive(item, pathname)} />
              ))}
            </nav>

            {/* Actions — right third */}
            <div className="flex flex-1 items-center justify-end gap-1.5">
              <Button
                variant="ghost"
                size="icon-xs"
                className="rounded-none"
                onClick={toggleTheme}
              >
                {theme === 'dark' ? (
                  <SunIcon className="size-3.5" />
                ) : (
                  <MoonIcon className="size-3.5" />
                )}
              </Button>

              <div className="hidden sm:block">
                <UserMenu profile={profile} />
              </div>

              <Button
                variant="ghost"
                size="icon-xs"
                className="rounded-none md:hidden"
                onClick={() => setMobileOpen(o => !o)}
              >
                {mobileOpen ? (
                  <XIcon className="size-3.5" />
                ) : (
                  <HamburgerIcon className="size-3.5" />
                )}
              </Button>
            </div>
          </header>

          {/* Mobile menu — extends the card downward */}
          {mobileOpen && (
            <div className="border-t border-border/40 md:hidden">
              {navigationItems.map(item => {
                const Icon = item.icon
                const isActive = isItemActive(item, pathname)
                const itemClass = cn(
                  'flex w-full items-center gap-2 px-5 py-2.5 text-sm transition-colors',
                  isActive
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )
                return (
                  <a key={item.label} href={item.href} className={itemClass}>
                    <Icon className="size-3.5 shrink-0" />
                    {item.label}
                  </a>
                )
              })}
              <Separator />
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex w-full items-center gap-2 px-5 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
              >
                <LeaveIcon className="size-3.5 shrink-0" />
                {isSigningOut ? 'Signing out…' : 'Sign out'}
              </button>
              <Separator />
              <div className="flex items-center gap-2.5 px-5 py-3">
                <Avatar className="size-7 shrink-0">
                  <AvatarFallback className="bg-primary text-[9px] font-medium text-primary-foreground">
                    {(profile?.name ?? 'Account').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium leading-none">{profile?.name ?? 'Account'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
