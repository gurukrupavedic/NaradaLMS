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
    'group flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors',
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
          <AvatarFallback className="bg-violet-500 text-[9px] font-medium text-white">
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
      <header className="border-border bg-card flex h-11 shrink-0 items-center gap-3 border-b px-4">
        <span className="text-sm font-semibold tracking-tight whitespace-nowrap">Narada LMS</span>

        <nav className="hidden flex-1 items-center gap-0.5 md:flex">
          {navigationItems.map(item => (
            <NavButton key={item.label} item={item} />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="icon-xs" onClick={toggleTheme}>
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
            className="md:hidden"
            onClick={() => setMobileOpen(o => !o)}
          >
            {mobileOpen ? <XIcon className="size-3.5" /> : <HamburgerIcon className="size-3.5" />}
          </Button>
        </div>
      </header>

      {mobileOpen && (
        <div className="border-border bg-card shrink-0 border-b md:hidden">
          {navigationItems.map(item => {
            const Icon = item.icon
            const isActive = isItemActive(item)
            return (
              <button
                key={item.label}
                className={cn(
                  'flex w-full items-center gap-2 px-4 py-2 text-xs transition-colors',
                  isActive
                    ? 'text-foreground bg-muted font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                )}
              >
                <Icon className="size-3.5 shrink-0" />
                {item.label}
              </button>
            )
          })}
          <Separator />
          <button className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex w-full items-center gap-2 px-4 py-2 text-xs transition-colors">
            <SettingsIcon className="size-3.5 shrink-0" />
            Settings
          </button>
          <button className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex w-full items-center gap-2 px-4 py-2 text-xs transition-colors">
            <LeaveIcon className="size-3.5 shrink-0" />
            Sign out
          </button>
        </div>
      )}

      <main className="bg-background flex-1 overflow-auto">{children}</main>
    </div>
  )
}
