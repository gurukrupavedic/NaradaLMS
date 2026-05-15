/**
 * Reserved `users` row for automated operations (curriculum seed, contract tests, smoke scripts).
 * Same stable id across environments; not intended for interactive login.
 */
export const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000001";

export const SYSTEM_USER_EMAIL = "system@narada.local";

export const SYSTEM_USER = {
  id: SYSTEM_USER_ID,
  email: SYSTEM_USER_EMAIL,
  firstName: "System",
  lastName: "User",
} as const;
