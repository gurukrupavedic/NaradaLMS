import type { LucideIcon } from 'lucide-react'

import { ExamIcon, HouseIcon, SettingsIcon } from '@/components/ui/icons'

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
// its own array. Lives outside app-shell.tsx (a 'use client' file) because Next.js forbids
// calling an exported function from a client module directly from a Server Component — it can
// only be rendered as a Component, not invoked for its return value.
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
