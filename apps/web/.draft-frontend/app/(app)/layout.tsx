import { AppShell } from '@/components/app-shell'

/**
 * The shared shell for every screen a signed-in reader/admin moves between — practice, record,
 * admin, and the tracks nested under them.
 *
 * Before this, each of those routes rendered its own `<AppShell>` from inside its own `page.tsx`:
 * navigating Practice → Record → Admin tore the whole masthead down and rebuilt it on every click,
 * because App Router has no way to know two independently-wrapped pages share a shell unless a
 * layout says so. Nothing about the header was actually changing — the nav, the theme toggle, the
 * signed-in name, "Sign out" — so tearing it out and back in on every navigation was pure churn:
 * a visible flash, and every hook inside `AppShell` (`useHasAdminAccess`, `useSelectedProfileName`)
 * remounting and re-subscribing from scratch. A route-group layout fixes that at the framework
 * level — `AppShell` mounts once for this whole section, and only `children` swaps — which is what
 * makes this read as one app with several screens rather than several pages that happen to look
 * alike.
 *
 * `/chapters/[chapterId]` (the practice room) and `/login` are deliberately *outside* this group:
 * the practice room is a full-bleed reading view with its own minimal header by design, not a
 * missing wrapper, and sign-in is the one screen where there's no signed-in identity yet for
 * `AppShell` to show.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
