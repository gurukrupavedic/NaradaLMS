'use client'

// A regular error.tsx never catches a throw in the layout.tsx of its OWN segment (the boundary
// is nested inside that layout, not wrapping it) — only an error.tsx from a PARENT segment can.
// (student)/layout.tsx and admin/layout.tsx each run requireAuthenticatedProfile(), which can
// throw (e.g. the API being unreachable); this root-level boundary is what actually catches
// that now, so global-error.tsx stays pure defense-in-depth for a genuine root-layout failure.
export { RouteError as default } from '@/components/route-error'
