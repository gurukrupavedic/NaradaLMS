# TODO - Common

## Overview
Cross-cutting concerns, testing, documentation, and infrastructure tasks that affect frontend and backend.

---

## TESTING & QUALITY ASSURANCE

**1. E2E testing: add Playwright or Cypress test suite**
   - **Type:** Hardening / QA
   - **Criticality:** Medium (reduces regression risk)
   - **Risk:** Medium (setup complexity; maintenance burden)
   - **Estimated effort:** 4-6 hours (initial setup + sample tests)
   - **Dependencies:** None
   - **Current State:** Manual testing only; no automated E2E tests.
   - **What needs fixing:** Set up Playwright or Cypress; write tests for critical flows: register → approve → login → content creation → learning.
   - **Why it matters:** Catches regressions early; safer refactoring; CI/CD integration ready.
   - **Priority:** Medium (implement after hardening items stabilize)

**2. Unit test coverage: aim for 70%+ coverage on critical services**
   - **Type:** Hardening / QA
   - **Criticality:** Medium (reduces bugs in critical code paths)
   - **Risk:** Low (unit tests are low-risk)
   - **Estimated effort:** 3-5 hours
   - **Dependencies:** None
   - **Current State:** Minimal unit test coverage.
   - **What needs fixing:** Add tests for: (a) `database-storage.ts` (critical CRUD); (b) validation functions; (c) auth services.
   - **Why it matters:** Safer refactoring; documents API behavior; faster debugging.
   - **Priority:** Medium (start with critical paths)

**3. Integration test suite: test API + DB interactions**
   - **Type:** Hardening / QA
   - **Criticality:** Medium (tests full stack)
   - **Risk:** Medium (DB setup required; slower tests)
   - **Estimated effort:** 5-8 hours
   - **Dependencies:** None; works best after unit tests
   - **Current State:** No integration tests.
   - **What needs fixing:** Set up test DB; write tests for key routes (create chapter, upload audio, create mappings).
   - **Why it matters:** Catches edge cases; verifies end-to-end flows.
   - **Priority:** Medium (after hardening items + unit tests)

---

## DOCUMENTATION

**4. API documentation: auto-generate OpenAPI/Swagger from routes**
   - **Type:** Enhancement / Documentation
   - **Criticality:** Low (DX improvement; not critical for learning)
   - **Risk:** Low (documentation only; no code changes)
   - **Estimated effort:** 2-3 hours
   - **Dependencies:** OpenAPI spec exists (`openapi.yaml`)
   - **Current State:** Manual `openapi.yaml` exists but may be out of sync with routes.
   - **What needs fixing:** (a) Use `@types/express-async-errors` + route decorators to auto-generate docs; OR (b) Manually update `openapi.yaml` to match current routes.
   - **Why it matters:** Clearer API contracts; easier frontend integration.
   - **Priority:** Low (maintain manually until automation is feasible)

**5. Runbook: troubleshooting and debugging guide**
   - **Type:** Documentation
   - **Criticality:** Low (support & onboarding)
   - **Risk:** Low (documentation only)
   - **Estimated effort:** 2-3 hours
   - **Dependencies:** None
   - **Current State:** Scattered across PHASE docs and copilot-instructions.md.
   - **What needs fixing:** Create `docs/TROUBLESHOOTING.md` with: (a) common dev issues (DB connection, env vars, npm conflicts); (b) debugging tips; (c) known issues.
   - **Why it matters:** Faster onboarding for new developers; reduces support burden.
   - **Priority:** Low (nice-to-have)

**6. Architecture decision log: record major decisions**
   - **Type:** Documentation
   - **Criticality:** Low (knowledge retention)
   - **Risk:** Low (documentation only)
   - **Estimated effort:** 2-3 hours (per future ADR)
   - **Dependencies:** ADR-001, ADR-002 exist; continue pattern
   - **Current State:** ADRs are in place; continue adding for major decisions.
   - **What needs fixing:** When making major tech choices (auth provider, DB schema, API design), document in `docs/architecture/ADR-NNN-*.md`.
   - **Why it matters:** Preserves decision rationale; helps future maintainers.
   - **Priority:** Ongoing (add as decisions are made)

---

## INFRASTRUCTURE & DEVOPS

**7. CI/CD pipeline: set up GitHub Actions for testing & deployment**
   - **Type:** Enhancement / Ops
   - **Criticality:** Medium (enables safe deployments)
   - **Risk:** Medium (pipeline configuration can block deployments if misconfigured)
   - **Estimated effort:** 3-4 hours
   - **Dependencies:** Tests must be in place first (items 1, 2, 3)
   - **Current State:** No GitHub Actions workflow; manual testing before push.
   - **What needs fixing:** Create `.github/workflows/test.yml` to run tests on PR; add build + deploy steps for main branch.
   - **Why it matters:** Automated quality gates; safe deployments; reduces human error.
   - **Priority:** Medium (implement after testing infrastructure is solid)

**8. Environment management: standardize .env setup across dev/staging/prod**
   - **Type:** Enhancement / Ops
   - **Criticality:** Medium (prevents config mistakes)
   - **Risk:** Low (isolated to env config)
   - **Estimated effort:** 1-2 hours
   - **Dependencies:** None
   - **Current State:** `.env` exists; staging/prod configs unclear.
   - **What needs fixing:** (a) Document required env vars in `docs/ENVIRONMENT-SETUP.md`; (b) Create `.env.example` template; (c) Add validation on startup.
   - **Why it matters:** Reduces "works on my machine" problems; clearer onboarding.
   - **Priority:** Medium (do early to prevent misconfigurations)

**9. Database backup & recovery strategy**
   - **Type:** Enhancement / Ops
   - **Criticality:** High (data loss prevention)
   - **Risk:** Medium (requires careful testing)
   - **Estimated effort:** 2-3 hours (research + setup)
   - **Dependencies:** Neon PostgreSQL setup
   - **Current State:** No documented backup strategy.
   - **What needs fixing:** (a) Document Neon backup features; (b) Set up automated backups; (c) Test recovery procedure.
   - **Why it matters:** Prevents data loss; essential for production.
   - **Priority:** High (implement before going live)

---

## PERFORMANCE & MONITORING

**10. Logging & observability: add structured logging & error tracking**
   - **Type:** Enhancement / Ops
   - **Criticality:** Medium (helps debugging in production)
   - **Risk:** Low (isolated to logging layer)
   - **Estimated effort:** 2-3 hours
   - **Dependencies:** None
   - **Current State:** Console logs exist; no structured logging or error tracking (Sentry, LogRocket, etc.).
   - **What needs fixing:** (a) Use Winston or Pino for structured logging; (b) Add error tracking service (Sentry); (c) Export metrics.
   - **Why it matters:** Faster debugging; visibility into production issues.
   - **Priority:** Medium (implement before significant user traffic)

**11. Performance profiling: identify bottlenecks**
   - **Type:** Enhancement / Performance
   - **Criticality:** Low (optimization is lower priority than stability)
   - **Risk:** Low (profiling is safe; changes are optional)
   - **Estimated effort:** 2-3 hours
   - **Dependencies:** Load testing tools
   - **Current State:** No profiling data; suspected N+1 queries (see Backend item 9).
   - **What needs fixing:** Use Chrome DevTools, database profiler, and load testing (k6, ab) to identify slow endpoints.
   - **Why it matters:** Guides optimization priorities.
   - **Priority:** Low (after core features stable)

---

## SECURITY

**12. Security audit & hardening**
   - **Type:** Hardening / Security
   - **Criticality:** High (protects user data)
   - **Risk:** Medium (changes may impact features)
   - **Estimated effort:** 4-6 hours
   - **Dependencies:** None
   - **Current State:** Basic Passport.js auth in place; other security measures unclear.
   - **What needs fixing:** (a) Review OWASP Top 10; (b) Add CSRF protection; (c) Enable HTTPS; (d) Secure cookies (HttpOnly, SameSite); (e) Rate limiting; (f) SQL injection prevention (use ORM exclusively).
   - **Why it matters:** Protects user data; builds trust; required for production.
   - **Priority:** High (implement before launch)

**13. Data privacy & GDPR compliance (if applicable)**
   - **Type:** Hardening / Legal
   - **Criticality:** High (regulatory requirement)
   - **Risk:** Medium (impacts data handling)
   - **Estimated effort:** 4-8 hours (audit + implementation)
   - **Dependencies:** Product/legal decision on GDPR applicability
   - **Current State:** No privacy policy or data deletion mechanisms.
   - **What needs fixing:** (a) Privacy policy; (b) Data export feature; (c) User deletion cascade.
   - **Why it matters:** Legal compliance; user trust.
   - **Priority:** High (before collecting user data at scale)

---

## DEPLOYMENT & RELEASE

**14. Release process & versioning strategy**
   - **Type:** Enhancement / Ops
   - **Criticality:** Medium (clear versioning)
   - **Risk:** Low (process definition only)
   - **Estimated effort:** 1-2 hours
   - **Dependencies:** None
   - **Current State:** No formal release process; no semantic versioning.
   - **What needs fixing:** (a) Define semantic versioning (major.minor.patch); (b) Create release checklist; (c) Tag releases on GitHub.
   - **Why it matters:** Clear version history; easier rollbacks.
   - **Priority:** Low (formalize when ready for first release)

   **15. Verify `/fonts` assets in production**
      - **Type:** Verification / Ops
      - **Criticality:** Medium (ensures multilingual text renders correctly)
      - **Risk:** Low (read-only asset check)
      - **Estimated effort:** 15–30 minutes
      - **Dependencies:** Build artifacts present; production server running
      - **Current State:** Dev server confirmed `/fonts` reachable; production path relies on static `dist/public` serving
      - **What needs fixing:** On a release candidate, run build, start prod server, and confirm `/fonts/*` assets serve. Validate font CSS usage and fallbacks across Telugu/Devanagari/IAST views.
      - **Acceptance Criteria:** `/fonts/JIMS-Regular.otf` loads under production server; UI pages render with JIMS, AdishilaSanVedic (semi-bold), and AdishilaSan per script.
      - **Priority:** Medium (before production deployment)

---

## Priority Matrix

| Priority | Items | Target | Notes |
|----------|-------|--------|-------|
| **High** | 9, 12, 13 | ASAP | Critical for production readiness |
| **Medium** | 1, 2, 3, 7, 8, 10 | 2-4 weeks | Quality & stability |
| **Low** | 4, 5, 6, 11, 14 | 4+ weeks | DX & polish |

---

## Notes
- Testing (items 1–3) unblocks CI/CD (item 7).
- Security (items 12–13) is critical path for production launch.
- Monitoring (item 10) becomes essential once users are onboarded.
- Documentation (items 4–6) should be ongoing, not a discrete task.

---

## Completed Items

(None yet)
