import { AdminGate } from '@/components/admin/admin-gate'

/**
 * Nested inside `(app)/layout.tsx`'s `AppShell` — one `AdminGate` for every `/admin/*` screen,
 * instead of each of the three pages wrapping itself individually (which they used to, before this
 * existed). The gate check now also survives navigating *between* admin screens, since it's no
 * longer remounting alongside a per-page `AppShell` on every click either.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminGate>{children}</AdminGate>
}
