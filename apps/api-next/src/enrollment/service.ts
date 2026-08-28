import type { SchoolDb } from '@narada/db'

import { internalError, unprocessable } from '../error'
import * as repository from './repository'

export { hasSharedInstructorEnrollment } from './repository'

// A student can only be examined/evaluated on a chapter belonging to a track they're enrolled in
// as a student, and that enrollment must be unambiguous. Shared by exam creation (DD-012) and
// direct evaluation creation, once built, so the two invariants can't drift (PARITY_PLAN.md
// §10.5) — the resolved batchId is the immutable assessment context stored on the new row.
export async function resolveQualifyingBatch(
  db: SchoolDb,
  studentId: string,
  trackId: string,
): Promise<string> {
  const qualifying = await repository.findQualifyingBatches(db, studentId, trackId)
  if (qualifying.length === 0) {
    throw unprocessable('student is not enrolled in a batch for this chapter')
  }

  if (qualifying.length > 1) {
    throw unprocessable("student is enrolled in multiple batches for this chapter's track")
  }

  const [only] = qualifying
  if (!only) {
    throw internalError()
  }

  return only.batchId
}
