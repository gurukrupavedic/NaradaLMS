import { AppShell, type NavigationItem } from '@/components/app-shell'
import { BookOpenIcon, HouseIcon, UsersIcon } from '@/components/ui/icons'
import { getCurrentProfile } from '@/lib/session'

const navItems: NavigationItem[] = [
  { label: 'Dashboard', icon: HouseIcon },
  { label: 'Content', icon: BookOpenIcon },
  { label: 'Batches', icon: UsersIcon },
]

export default async function DashboardPage() {
  const profile = await getCurrentProfile()

  return (
    <AppShell navigationItems={navItems} profile={profile}>
      <p>Admin content goes here.</p>
    </AppShell>
  )
}
