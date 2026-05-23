# Web Interface Guidelines

This document captures coding standards and guardrails for the Narada LMS web UIs (student-portal, admin-portal, packages/ui). Following these prevents regressions on accessibility, performance, and consistency.

## Focus & Accessibility

- **Use `focus-visible:`** for focus styles (Tailwind: `focus-visible:ring-*`, `focus-visible:outline-none`). Do not use bare `focus:` unless paired with a visible `focus-visible` replacement.
- **Never hide focus without replacement.** Avoid `focus:outline-none` alone; use the shared `.focus-ring` utility or equivalent `focus-visible` ring.
- **Icon-only buttons** must have an accessible name: `aria-label` (required) or visible `sr-only` text (e.g. "Close" for toast close).
- **Skip link**: Provide a "Skip to main content" link (e.g. `SkipLink` from `@narada/ui`) in app layouts; ensure `<main id="main-content">` exists.

## Motion & Animation

- **No `transition-all` / `transition: all`.** Use property-specific transitions: `transition-colors`, `transition-opacity`, `transition-transform`, `transition-[property]` as appropriate.
- **Respect reduced motion.** Gate non-essential animations with `@media (prefers-reduced-motion: reduce)` or a `usePrefersReducedMotion` hook; shorten or disable durations in global CSS for reduced-motion users.

## Navigation & Interaction

- **Prefer `Link` for navigation.** Use Next.js `<Link href="...">` (or equivalent) instead of `onClick={() => router.push(...)}` for in-app navigation so that Cmd/Ctrl+click, middle-click, and keyboard work correctly.
- **Modals and sheets:** Apply `overscroll-contain` (or `overscroll-behavior: contain`) to scrollable content inside dialogs/sheets so background scroll does not move.

## Typography & Content

- **Use the shared ellipsis character.** Use the `ELLIPSIS` constant from `@shared/utils/text-segmentation` (or `packages/types` text utils) instead of the literal `"..."` in UI strings.
- **Placeholders are hints, not labels.** Ensure inputs have proper `label`/`aria-label`; use `…` (single character) not `...` in placeholders where truncation is implied.

## Forms & Inputs

- **Auth and sensitive inputs:** Set appropriate `autoComplete` (e.g. `email`, `current-password`, `new-password`) and `spellCheck={false}` on email fields.
- **Search/filter inputs:** Provide `aria-label` or an associated visible/hidden label.

## Date Formatting

- **Use shared `formatDate`.** Use `formatDate` from `@shared/utils/date` (wrapping `Intl.DateTimeFormat`) instead of ad-hoc `toLocaleDateString` for consistent, locale-aware date display.

## autoFocus

- **Gate autoFocus for desktop.** Use a desktop/mobile check (e.g. `useIsMobile()` from `@narada/ui`) and set `autoFocus={!isMobile}` so focus is not stolen on touch devices.

## List Performance

- **Large lists:** Use `VirtualizedTableBody` (for tables) or `VirtualizedList` (for flat lists) from `@narada/ui` when rendering many rows/items. Use stable callbacks and `React.memo` for row/item components.

## Optional Linting

Consider ESLint or custom rules to:

- Disallow `transition-all` in Tailwind/className.
- Warn on `onClick={() => router.push("...")}` in JSX in favor of `<Link>`.
- Warn on `"..."` string literals in UI components (where safe).

---

*See also: [Gayatri design system](./gayatri-ds.md), [DS approach](./ds-approach.md); Vercel Web Interface Guidelines; Cursor skill `.cursor/skills/web-design-guidelines`.*
