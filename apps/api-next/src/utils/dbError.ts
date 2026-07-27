import { AppError, conflict, unprocessable } from '../error'

// Postgres SQLSTATE codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
const UNIQUE_VIOLATION = '23505'
const FOREIGN_KEY_VIOLATION = '23503'

export function translateDbError(error: unknown): AppError | null {
  const code = getPgErrorCode(error)
  if (code === UNIQUE_VIOLATION) {
    return conflict('a resource with these values already exists')
  }

  if (code === FOREIGN_KEY_VIOLATION) {
    return unprocessable('referenced resource does not exist')
  }

  return null
}

/**
 * Every constraint a service currently gives domain-specific meaning to (HARDENING_PLAN.md H7 /
 * DD-001 §3.1). The value is the real Postgres constraint name from the generated migrations
 * (`packages/db/drizzle/school/0000_organic_jasper_sitwell.sql`); the camelCase key is what
 * services reference, so a typo in the raw name is a compile error instead of a silently-ignored
 * mapping entry.
 */
export const DbConstraint = {
  batchTrackIdFk: 'batch_trackId_track_id_fk',
  batchCodeUnique: 'batch_code_unique',
  examStudentIdFk: 'exam_studentId_profile_id_fk',
  examChapterIdFk: 'exam_chapterId_chapter_id_fk',
  evaluationStudentIdFk: 'evaluation_studentId_profile_id_fk',
  evaluationChapterIdFk: 'evaluation_chapterId_chapter_id_fk',
  evaluationEvaluatorIdFk: 'evaluation_evaluatorId_profile_id_fk',
} as const

export type DbConstraint = (typeof DbConstraint)[keyof typeof DbConstraint]

type ConstraintMapping = Partial<Record<DbConstraint, () => AppError>>

/**
 * Maps a known constraint name (per the error's `.constraint`) to a domain-specific `AppError`,
 * for callers that know the operation context. Returns `null` if the constraint is missing or
 * unrecognized, so the caller can fall through to `translateDbError`'s generic mapping.
 */
export function translateKnownConstraint(error: unknown, mapping: ConstraintMapping): AppError | null {
  const constraint = unwrapPgError(error)?.constraint
  if (constraint && constraint in mapping) {
    return mapping[constraint as DbConstraint]?.() ?? null
  }

  return null
}

/**
 * Runs `operation`, translating any thrown error whose constraint is a key in `mapping` to the
 * matching domain `AppError`. An error with no recognized constraint propagates unchanged, so
 * the global `translateDbError` fallback still gets a fair shot at it.
 */
export async function withConstraintMapping<T>(
  operation: () => Promise<T>,
  mapping: ConstraintMapping,
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw translateKnownConstraint(error, mapping) ?? error
  }
}

function getPgErrorCode(error: unknown): string | undefined {
  return unwrapPgError(error)?.code
}

/**
 * Drizzle wraps every query error in a `DrizzleQueryError` whose real pg error (with `.code` and
 * `.constraint`) is nested in `.cause`, not directly on the thrown value. This unwraps up to a
 * few levels of `.cause` to find the first object exposing a string `.code` or `.constraint`,
 * while still handling a plain `{ code }`-shaped object (e.g. in tests) directly.
 */
function unwrapPgError(error: unknown): { code?: string; constraint?: string } | undefined {
  let current: unknown = error
  for (let i = 0; i < 5; i++) {
    if (typeof current === 'object' && current !== null) {
      const code = 'code' in current ? (current as { code: unknown }).code : undefined
      const constraint =
        'constraint' in current ? (current as { constraint: unknown }).constraint : undefined
      if (typeof code === 'string' || typeof constraint === 'string') {
        return {
          code: typeof code === 'string' ? code : undefined,
          constraint: typeof constraint === 'string' ? constraint : undefined,
        }
      }

      if ('cause' in current) {
        current = (current as { cause: unknown }).cause
        continue
      }
    }

    return undefined
  }
  return undefined
}
