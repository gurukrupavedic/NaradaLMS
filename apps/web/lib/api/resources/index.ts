/**
 * One function per endpoint, named after it, grouped by domain — the app's only client for
 * `apps/api` (through `lib/api/client.ts`, which injects the profile/course headers and handles
 * 401s). `catalog.ts`'s `saveTrack` (`subtitle`) is the exception: it still goes through the local
 * store in `lib/api/store.ts`, with no real endpoint behind it.
 */
export * from './profiles'
export * from './counters'
export * from './registrations'
export * from './dashboard'
export * from './exams'
export * from './exam-slots'
export * from './batches'
export * from './enrollment'
export * from './catalog'
export * from './content'
