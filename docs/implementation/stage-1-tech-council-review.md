# 🦅 Tech Council Review: Stage 1 Execution Plan

**Date:** 2026-02-02
**Subject:** Review of `docs/implementation/stage-1-execution-plan.md`

The Tech Council has reviewed the proposed Stage 1 Execution Plan. Below are the findings, consolidated by domain expertise.

---

## 1. 🎨 Frontend Specialist (Next.js & UI)

**Status:** ✅ **APPROVED with NOTES**

* **Positive:** The "Tiptap Adapter Layer" is a crucial insight. Wrapping the editor in a provider to mock the missing global context is the correct approach to avoid rewriting the editor logic immediately.
* **Concern (Tailwind):** The plan mentions moving components to `packages/ui` but implies a simple move.
  * **Risk:** `packages/ui` needs a shared Tailwind configuration (`packages/tailwind-config`) that is exported and consumed by both `apps/student-portal` and `apps/ops-portal`. If we just copy-paste the config, we duplicate design tokens.
  * **Requirement:** Add a step in **Phase 0** to create `packages/tailwind-config` and ensure `packages/ui/tailwind.config.ts` extends it.
* **Next.js 15:** Confirming we are using **App Router**. The plan implies it, but we should be explicit.
  * *Note:* Using App Router for "Student Portal" is fine, but for "Ops Portal" (Admin), moving from a complex SPA (Vite) to App Router might be high friction due to `use client` proliferation.
  * *Proposal:* For Stage 1, we should be comfortable making the Ops Portal almost entirely `use client` at the top level if needed to speed up migration, then optimize in Stage 2.

## 2. ⚙️ Backend Specialist (API & Node)

**Status:** ⚠️ **APPROVED with CAUTION**

* **Critique:** "Phase 3: API Extraction" suggests removing `client/` and `server/`.
  * **Risk:** The "Monolith" currently runs on port 5000. The plan has the "API" also on port 5000.
  * **Transition:** We must ensure that during Phases 1 & 2 (Dual Boot), the Monolith *is* the API. Phase 3 effectively "trims" the frontend from the monolith, turning it into the standalone API. The plan handles this well by deleting the `client/` folder in Phase 3.
* **Missing:** **Session/Auth Compatibility**.
  * The plan moves to `HttpOnly` cookies.
  * *Question:* Does the *current* monolith use this? If not, the moment we introduce `stage-1-phase-0` (Security), the *existing* frontend (Vite) inside the monolith might break if it expects tokens in LocalStorage or headers.
  * *Requirement:* detailed verification in Phase 0 that the *legacy* Vite frontend can handle the new `HttpOnly` cookie structure, OR we must accept that the legacy frontend is deprecated immediately (which contradicts the "Zero-Regression" goal).
  * *Fix:* Verify `client/src/api/axios.ts` (or similar) in the legacy code checks for changes needed to support credentials/cookies *before* we enforce valid cookies in the API.

## 3. 🛡️ Security Auditor

**Status:** 🟢 **STRONG APPROVAL**

* **Highlights:**
  * Moving to `HttpOnly` cookies is the single most important security upgrade.
  * Strict CORS whitelisting is correctly identified.
  * Tiptap sanitization via an adapter is a smart containment strategy.
* **CSP Warning:**
  * **Risk:** Phase 3 mentions `helmet`. Introducing strict Content Security Policy (CSP) often breaks rich text editors (Tiptap) that use inline styles or `eval`-like behavior.
  * **Requirement:** Phase 3 verification must explicitly test Tiptap in "Strict" CSP mode. We may need `unsafe-inline` for styles temporarily.

## 4. 🛠️ DevOps Engineer

**Status:** ⚠️ **CONDITIONAL APPROVAL**

* **Environment Variables:**
  * **Concern:** The plan relies on `dotenv-cli`. This is fine for local dev, but for Production (Docker), we should NOT bake `.env` files into the image.
  * **Requirement:** The `docker-compose.yml` and final `Dockerfile` must demonstrate injecting env vars (CONFIG) at runtime or container start, not build time.
* **CI/CD Pipeline:**
  * The `turbo.json` looks good.
  * *Missing:* A "Prune" step for Docker builds (`turbo prune --scope=...`) is standard/best-practice for monorepo Dockerfiles to reduce context size. We need to ensure the Dockerfile uses this.

## 5. 🗄️ Database Architect

**Status:** 🟡 **NEEDS CLARIFICATION**

* **Schema Changes:**
  * The **Strategy** (Phase 2) mentioned adding `organization_id`.
  * The **Execution Plan** is strangely silent on this.
  * *Observation:* Stage 1 is "Structural Split". It seems we are **deferring** the Multi-tenancy (Stage 3) and Chameleon (Stage 2) logic.
  * *Verdict:* This is acceptable *if intentional*. We are just moving files first.
  * *Requirement:* Explicitly state in the Detailed Plan that **Database Schema remains unchanged** in Stage 1. We are sharing the existing DB.

---

## 📋 Consolidated Recommendations for Detailed Plan

1. **Add Phase 0.5: Shared Config:** Explicitly create `packages/tailwind-config` and `packages/eslint-config` to ensure consistent linting/styling across the new apps.
2. **Clarify Cookie Auth in Legacy:** Add a task to patch the Legacy Vite App to support the new HttpOnly cookie *before* the API requires it.
3. **Docker Prune:** Use `turbo prune` in the Dockerfile instructions.
4. **CSP Config:** Configure Helmet with Tiptap-friendly CSP policies.
5. **Scope Validation:** Explicitly state "No Database Schema changes in Stage 1".
