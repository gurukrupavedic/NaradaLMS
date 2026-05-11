# Multi-Tenancy Task Coverage Matrix

Sequenced execution reference. Execute rows in ascending **Seq** unless noted parallel-safe.

> **Warning — ID mapping:** `MT-2.x` **does not** match **roadmap slice 2.x** one-to-one. For example, roadmap **2.2** (login/register) is **not** the same row as MT-2.2 (org middleware). **Authoritative order:** [implementation-roadmap.md](./implementation-roadmap.md) + [implementation-checklist.md](./implementation-checklist.md) + [implementation-status.md](./implementation-status.md).

**Execution mode**

- **Individual** — do in isolation (touches many files or high risk).
- **Parallel-safe** — may batch if no file overlap.

**Note:** Seq **16** (`MT-1.4`) runs **after** Layer 2 tasks **6–15** complete, even though it appears mid-table for readability.

---

## Task matrix


| Seq | Task ID   | Area          | Mode          | Task detail                                                                                        | Primary outputs                                                 | Verification                                          |
| --- | --------- | ------------- | ------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------- |
| 1   | MT-0.1    | Cross-cutting | Individual    | Branch + clean DB policy                                                                           | branch name; empty migration test                               | migrations apply on fresh DB                          |
| 2   | MT-0.2    | Verification  | Individual    | Baseline typecheck/tests                                                                           | baseline log                                                    | recorded failures                                     |
| 3   | MT-1.1a   | Schema        | Individual    | Add `organizations` + `user_organizations` + `users.is_super_admin`; generated migrations + migrate tooling; **no** drop of `users.roles`/`users.status` yet | Drizzle + `./migrations/*.sql`                                  | schema matches [schema-design.md](./schema-design.md) expand phase |
| 4   | MT-1.2    | Seed          | Parallel-safe | Seed `slmts`, `rr` orgs                                                                            | seed script/SQL                                                 | org slugs resolvable                                  |
| 5   | MT-1.3    | Seed          | Individual    | Dev super-admin + test memberships                                                                 | seed docs                                                       | login path reachable post-Layer-2                     |
| 6   | MT-2.1    | Auth          | Individual    | JWT payload + Express.User typing                                                                  | `jwt.utils`, `shared/types`                                     | compile                                               |
| 7   | MT-2.2    | Auth          | Individual    | Org context middleware                                                                             | `req.orgId` / equivalent                                        | 403 without context on scoped routes                  |
| 8   | MT-2.3    | Auth          | Individual    | `requireOrgRole` / `requireSuperAdmin`                                                             | auth middleware                                                 | org admin vs super-admin matrix                       |
| 9   | MT-2.4    | Identity      | Individual    | Register -> pending membership for tenant from request                                             | identity routes/service                                         | DB row `pending`                                      |
| 10  | MT-2.5    | Identity      | Individual    | Login allows no active membership; pending UX contract                                             | login handler                                                   | [api-contract-changes.md](./api-contract-changes.md)  |
| 11  | MT-2.6    | Identity      | Parallel-safe | `GET /api/auth/me` memberships payload                                                             | route + service                                                 | UI can render pending                                 |
| 12  | MT-2.7    | Identity      | Parallel-safe | `POST /api/auth/switch-org`                                                                        | route                                                           | JWT updates `currentOrgId`                            |
| 13  | MT-2.8    | Governance    | Individual    | Super-admin-only membership approve/reject/roles                                                   | admin user routes                                               | org admin gets 403                                    |
| 14  | MT-2.9    | Governance    | Parallel-safe | Super-admin grant/revoke                                                                           | routes + audit                                                  | audit event recorded                                  |
| 15  | MT-2.10   | OAuth         | Individual    | Google OAuth parity with membership approval policy                                                | passport callbacks                                              | no stray global status bypass                         |
| 16  | MT-1.4    | Schema        | Individual    | **After Layer 2:** drop `users.roles`/`users.status`/`users_status_check`; cleanup tracker empty; contract migration | Drizzle + SQL                                                   | [legacy-users-columns-cleanup.md](./legacy-users-columns-cleanup.md) clear; typecheck no legacy refs |
| 17  | MT-3.A.1  | Data          | Individual    | `org_id` Pass A tables + backfill + uniques                                                        | migrations                                                      | NOT NULL enforced                                     |
| 18  | MT-3.A.2  | API           | Individual    | Handlers filter Pass A by org                                                                      | route modules                                                   | isolation spot-check                                  |
| 19  | MT-3.B.1  | Data          | Individual    | `org_id` Pass B + `audit_logs` nullable org                                                        | migrations                                                      | indexes                                               |
| 20  | MT-3.B.2  | API           | Individual    | Handlers filter Pass B by org                                                                      | route modules                                                   | no cross-org joins                                    |
| 21  | MT-3.B.3  | Data          | Individual    | Enrollment/progress uniqueness org-scoped if required                                              | migration + queries                                             | one-active rule per org semantics                     |
| 22  | MT-4.1    | Student UI    | Individual    | Tenant config module + `TENANT` env                                                                | `config/tenants`                                                | two ports show two brands                             |
| 23  | MT-4.2    | Student UI    | Parallel-safe | Replace hardcoded SLMTS assets                                                                     | components                                                      | visual parity SLMTS                                   |
| 24  | MT-4.3    | Client        | Parallel-safe | Tenant header on auth API calls                                                                    | student `api` layer                                             | correct org on register                               |
| 25  | MT-5.1    | Admin UI      | Individual    | Super-admin gate on User Management                                                                | admin routes/pages                                              | non-super-admin blocked                               |
| 26  | MT-5.2    | Admin UI      | Parallel-safe | Multi-org user list + org filter                                                                   | grid + query params                                             | matches API                                           |
| 27  | MT-5.3    | Admin UI      | Parallel-safe | Admin shell org switcher + auth refresh + org-scoped admin cache invalidation                     | shell/header UI + switch hook                                   | switch updates `auth/me` and refreshes org data       |
| 28  | MT-6.1    | Pilot         | Individual    | Pilot checklist execution                                                                          | notes in [verification-strategy.md](./verification-strategy.md) | sign-off                                              |


---

## Recommended bundles

### Bundle A — Foundation

MT-0.1, MT-0.2, MT-1.1a, MT-1.2

### Bundle B — Auth core (serial)

MT-2.1 -> MT-2.5 -> MT-2.8 (do not parallelize until JWT+middleware stable)

### Bundle G — Schema contract (after Bundle B)

MT-1.4 only — requires [legacy-users-columns-cleanup.md](./legacy-users-columns-cleanup.md) complete.

### Bundle C — Data isolation Pass A

MT-3.A.1 -> MT-3.A.2

### Bundle D — Data isolation Pass B

MT-3.B.1 -> MT-3.B.2 -> MT-3.B.3

### Bundle E — Student chameleon

MT-4.1 -> MT-4.2 -> MT-4.3

### Bundle F — Admin UI governance

MT-5.1 -> MT-5.2 -> MT-5.3 after MT-2.8 (and after Layer 3 org-scoped data is meaningful)

---

## Gate references

- After Bundle B: auth + governance smoke (super-admin vs org admin).
- After Bundle G: legacy user columns dropped; full typecheck green on `multi-tenancy`.
- After Bundle D: cross-org isolation smoke.
- After Bundle E: two-tenant local branding smoke.
