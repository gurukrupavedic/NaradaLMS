// Batch & Cohort domain events
export const BATCH_EVENTS = {
  created: 'batch.created',
  updated: 'batch.updated',
  enrollmentAdded: 'batch.enrollment.added',
  enrollmentDropped: 'batch.enrollment.dropped',
  coInstructorAssigned: 'batch.coinstructor.assigned',
  coInstructorRemoved: 'batch.coinstructor.removed',
} as const;
