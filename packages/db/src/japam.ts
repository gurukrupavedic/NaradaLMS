/**
 * The most japam one profile can have logged on a single day. Far above anything a person chants —
 * it exists to catch a typo (an extra zero) or a runaway client, and to keep the running total well
 * inside a Postgres `integer`. The `japamLog` table enforces it (`japamLog_count_valid`), and the API
 * checks requests against the same number so a refusal reads as a rule, not a database error.
 */
export const JAPAM_DAILY_MAX = 1_000_000
