import type { Metadata } from 'next'

// Same reason app/login/layout.tsx exists: page.tsx below is 'use client' (the code/QR/polling
// state is all local), and a client component can't export `metadata` itself.
export const metadata: Metadata = { title: 'Link this device' }

export default function LinkDeviceLayout({ children }: { children: React.ReactNode }) {
  return children
}
