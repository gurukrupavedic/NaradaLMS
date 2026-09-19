import type { Metadata } from 'next'

// Same reason as app/login/layout.tsx: the page is a client component, which can't export `metadata`.
export const metadata: Metadata = { title: 'Register' }

export default function CourseRegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
