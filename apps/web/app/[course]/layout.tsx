import { CourseBoundary } from '@/components/course-boundary'

/**
 * Everything under `/<course>/…` — the signed-in app and the course's public registration form alike.
 * The course is the URL's first segment (`lib/course-path.ts`), so this is where "does that course
 * exist?" is answered once, before any page under it loads data.
 */
export default function CourseLayout({ children }: { children: React.ReactNode }) {
  return <CourseBoundary>{children}</CourseBoundary>
}
