import type { Metadata } from 'next'

// Same reason as app/login/layout.tsx: the page itself is 'use client' (local form state), and a
// client component can't export `metadata` — a layout can, and needs nothing else here.
export const metadata: Metadata = { title: 'Register' }

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
