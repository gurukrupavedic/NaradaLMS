import { AppShell, type NavigationItem } from '@/components/app-shell'
import { BookOpenIcon, HouseIcon, UsersIcon } from '@/components/ui/icons'

const navItems: NavigationItem[] = [
  { label: 'Dashboard', icon: HouseIcon },
  { label: 'Content', icon: BookOpenIcon },
  { label: 'Batches', icon: UsersIcon },
]

export default function DashboardPage() {
  return (
    <AppShell navigationItems={navItems}>
      <p>Admin content goes here.</p>
    </AppShell>
  )
}
