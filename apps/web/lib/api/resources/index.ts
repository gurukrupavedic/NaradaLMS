/**
 * One function per endpoint, named after it, grouped by domain — the app's only client for
 * `apps/api` (through `lib/api/client.ts`, which injects the profile/course headers and handles
 * 401s).
 */
export * from './profiles'
export * from './course-details'
export * from './registrations'
export * from './dashboard'
export * from './exams'
export * from './exam-slots'
export * from './batches'
export * from './enrollment'
export * from './catalog'
export * from './content'
