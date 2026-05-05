/** Postgres SQLSTATE for unique_violation */
export const PG_UNIQUE_VIOLATION = "23505";

type PgLike = { code?: string; constraint?: string; cause?: unknown };

function walkPgError(error: unknown): PgLike | undefined {
  let current: unknown = error;
  const seen = new Set<unknown>();
  for (let i = 0; i < 10 && current && typeof current === "object" && !seen.has(current); i++) {
    seen.add(current);
    const node = current as PgLike;
    if (typeof node.code === "string") return node;
    current = node.cause;
  }
  return undefined;
}

export function getPostgresErrorCode(error: unknown): string | undefined {
  return walkPgError(error)?.code;
}

export function getPostgresConstraintName(error: unknown): string | undefined {
  const name = walkPgError(error)?.constraint;
  return typeof name === "string" ? name : undefined;
}

export function isPostgresUniqueViolation(error: unknown): boolean {
  return getPostgresErrorCode(error) === PG_UNIQUE_VIOLATION;
}
