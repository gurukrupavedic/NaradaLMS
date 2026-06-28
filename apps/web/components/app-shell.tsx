'use client'

import { useState } from 'react'
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
  HamburgerIcon,
  LeaveIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
  XIcon,
} from '@/components/ui/icons'
import { useTheme } from '@/components/theme-provider'

export interface NavigationItem {
  label: string
  icon: LucideIcon
}

function isItemActive(_item: NavigationItem): boolean {
  // TODO: determine active status from path.
  return false
}

function NavButton({ item }: { item: NavigationItem }) {
  const Icon = item.icon
  const isActive = isItemActive(item)
  const buttonClass = cn(
    'group flex items-center gap-2 rounded-none px-3 py-1.5 text-sm transition-colors',
    isActive
      ? 'text-foreground font-medium'
      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
  )

  return (
    <Button variant="ghost" className={buttonClass}>
      <Icon className="size-3.5 shrink-0" />
      <span>{item.label}</span>
    </Button>
  )
}

function UserMenu() {
  // TODO: fetch avatar information from authentication state.
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className="group text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-1.5 py-1 text-xs transition-colors" />
        }
      >
        <Avatar className="size-6 shrink-0">
          <AvatarFallback className="bg-primary text-[9px] font-medium text-primary-foreground">
            RP
          </AvatarFallback>
        </Avatar>
        <span className="text-foreground font-medium">Revanth P.</span>
        <CaretDownIcon className="size-2.5 transition-transform group-data-popup-open:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" className="min-w-44">
        <div className="px-3 py-2">
          <p className="text-xs font-medium">Revanth Pothukuchi</p>
          <p className="text-muted-foreground text-xs">Student</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <SettingsIcon className="size-3.5 shrink-0" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem>
          <LeaveIcon className="size-3.5 shrink-0" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface AppShellProps {
  navigationItems: NavigationItem[]
  className?: string
  children?: React.ReactNode
}

export function AppShell({ navigationItems, children, className }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

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
                <NavButton key={item.label} item={item} />
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
                <UserMenu />
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
                const isActive = isItemActive(item)
                return (
                  <button
                    key={item.label}
                    className={cn(
                      'flex w-full items-center gap-2 px-5 py-2.5 text-sm transition-colors',
                      isActive
                        ? 'bg-muted font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    )}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    {item.label}
                  </button>
                )
              })}
              <Separator />
              <button className="flex w-full items-center gap-2 px-5 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">
                <SettingsIcon className="size-3.5 shrink-0" />
                Settings
              </button>
              <button className="flex w-full items-center gap-2 px-5 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">
                <LeaveIcon className="size-3.5 shrink-0" />
                Sign out
              </button>
              <Separator />
              <div className="flex items-center gap-2.5 px-5 py-3">
                <Avatar className="size-7 shrink-0">
                  <AvatarFallback className="bg-primary text-[9px] font-medium text-primary-foreground">
                    RP
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium leading-none">Revanth Pothukuchi</p>
                  <p className="mt-1 text-xs text-muted-foreground">Student</p>
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
