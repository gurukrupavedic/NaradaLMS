/**
 * The most a profile can have logged against one counter (`counterLog`) on a single day. Far above
 * anything a person does — it exists to catch a typo (an extra zero) or a runaway client, and to keep
 * the running total well inside a Postgres `integer`. The table enforces it (`counterLog_count_valid`),
 * and the API checks requests against the same number so a refusal reads as a rule, not a database error.
 */
export const COUNTER_DAILY_MAX = 1_000_000
