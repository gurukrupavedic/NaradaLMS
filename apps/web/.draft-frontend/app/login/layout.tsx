import type { Metadata } from 'next'

// A `layout.tsx` purely to carry this — `app/login/page.tsx` is `'use client'` (the whole
// phone/OTP/profile flow is local component state), and a client component can't export
// `metadata` itself. A layout can, and needs nothing else here.
export const metadata: Metadata = { title: 'Sign in' }

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
