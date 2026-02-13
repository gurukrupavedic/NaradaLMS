// Batch & Cohort domain events (PascalCase to match system-admin subscriptions)
export const BATCH_EVENTS = {
  created: 'BatchCreated',
  updated: 'BatchUpdated',
  enrollmentAdded: 'StudentEnrolled',
  enrollmentDropped: 'StudentDropped',
  coInstructorAssigned: 'CoInstructorAssigned',
  coInstructorRemoved: 'CoInstructorRemoved',
} as const;
