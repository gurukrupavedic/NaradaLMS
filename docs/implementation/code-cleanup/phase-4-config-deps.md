# Phase 4: Configuration and Dependency Cleanup

**Branch:** `cleanup-phase-4` from `cleanup`
**Risk:** Low — config changes, dependency removal (each verified independently)
**Estimated effort:** 1–2 hours
**Prerequisites:** Phase 2 complete (or Phase 3 — Phases 3 and 4 can run in parallel since they touch different areas)

---

## Agent Guardrails

1. **Read before edit.** Always read the target file before modifying. If the content does not match what this plan describes, STOP and report the discrepancy.
2. **One task at a time.** Complete a task, verify it, commit it, then move to the next.
3. **No behavior changes.** This is cleanup only. Do NOT change any business logic, API responses, UI behavior, or database queries.
4. **No new features.** Do NOT add features, refactor algorithms, or improve performance beyond what is explicitly described.
5. **Commit after each task.** Small, atomic commits. Message format: `cleanup(phase-4): <what was done>`
6. **Verify after each task.** Run the verification command specified. If it fails, fix the issue before proceeding.
7. **Do NOT touch** any file not explicitly listed in this document.

## Verification Commands (Run After Every Task)

```bash
npx tsc --noEmit
npx turbo run build
```

---

## Branch Setup

```bash
git checkout cleanup
git checkout -b cleanup-phase-4
```

---

## Task 4.1: Fix Committed `.env.development`

The file `.env.development` is tracked by git but should not be. It contains `VITE_NEW_UI_ENABLED=true`, a legacy Vite flag no longer needed (the app uses Next.js now).

**Steps:**

1. Add `.env.development` to `.gitignore`:
   ```bash
   echo ".env.development" >> .gitignore
   ```

2. Remove from git tracking (keeps the local file):
   ```bash
   git rm --cached .env.development
   ```

**Verify:** `git status` shows `.env.development` as deleted from index and `.gitignore` as modified.

**Commit:** `cleanup(phase-4): remove .env.development from git tracking`

---

## Task 4.2: Remove Unused Root Dependencies

Remove one dependency at a time. After each removal, verify the build still passes. If ANY removal breaks the build, immediately reinstall: `npm install <package>`.

### Dependency 1: `framer-motion`
Zero imports in any source file.
```bash
npm uninstall framer-motion
npx tsc --noEmit && npx turbo run build
```

### Dependency 2: `@radix-ui/react-aspect-ratio`
Zero imports in any source file.
```bash
npm uninstall @radix-ui/react-aspect-ratio
npx tsc --noEmit && npx turbo run build
```

### Dependency 3: `@radix-ui/react-checkbox`
Zero imports in any source file.
```bash
npm uninstall @radix-ui/react-checkbox
npx tsc --noEmit && npx turbo run build
```

### Dependency 4: `@radix-ui/react-hover-card`
Zero imports in any source file.
```bash
npm uninstall @radix-ui/react-hover-card
npx tsc --noEmit && npx turbo run build
```

### Dependency 5: `@jridgewell/trace-mapping`
Likely a transitive dependency accidentally added to direct dependencies.
```bash
npm uninstall @jridgewell/trace-mapping
npx tsc --noEmit && npx turbo run build
```

### Dependency 6: `@neondatabase/serverless` (verify before removing)
Read `server/db.ts` first. If this package is only used in a conditional branch for Neon database (and the app uses standard `pg` for PostgreSQL), it is safe to remove. If it's actively used in the primary code path, **DO NOT remove it**.
```bash
# Only if confirmed safe:
npm uninstall @neondatabase/serverless
npx tsc --noEmit && npx turbo run build
```

**Commit:** `cleanup(phase-4): remove unused npm dependencies`

---

## Task 4.3: Move Misplaced `@types` to devDependencies

`@types/express-rate-limit` and `@types/multer` are in `dependencies` but should be in `devDependencies` (they are only needed at build time).

```bash
npm uninstall @types/express-rate-limit @types/multer
npm install --save-dev @types/express-rate-limit @types/multer
```

**Verify:** `npx tsc --noEmit` passes.

**Commit:** `cleanup(phase-4): move @types packages to devDependencies`

---

## Task 4.4: Fix Broken npm Script

In the root `package.json`, the `smoke:batches` script references a file at the wrong path.

**Old (broken):**
```json
"smoke:batches": "tsx tests/admin-batches-smoke.ts"
```

**New (correct path):**
```json
"smoke:batches": "tsx scripts/test/admin-batches-smoke.ts"
```

**Verify:** The script path exists: `ls scripts/test/admin-batches-smoke.ts`

**Commit:** `cleanup(phase-4): fix broken smoke:batches script path`

---

## Task 4.5: Replace Deprecated `csurf`

The `csurf` package is deprecated and has known vulnerabilities. Replace with `csrf-csrf`.

### Step A: Read Current Usage

Read `server/index.ts` to understand exactly how `csurf` is used:
- Line 22: `import csrf from "csurf";`
- Find where `csrf()` middleware is applied (likely `app.use(csrf({ cookie: true }))` or similar)
- Read `server/types.d.ts` for any csurf type declarations

### Step B: Install Replacement

```bash
npm uninstall csurf
npm install csrf-csrf
```

### Step C: Update `server/index.ts`

Replace the csurf import and middleware setup with csrf-csrf equivalent. The `csrf-csrf` package uses a double-submit cookie pattern:

```typescript
// Old:
import csrf from "csurf";
// ... later:
app.use(csrf({ cookie: true }));

// New:
import { doubleCsrf } from "csrf-csrf";

const { doubleCsrfProtection, generateToken } = doubleCsrf({
    getSecret: () => config.jwtSecret,
    cookieName: "__csrf",
    cookieOptions: {
        httpOnly: true,
        sameSite: "strict",
        secure: config.nodeEnv === "production",
    },
    getTokenFromRequest: (req) => req.headers["x-csrf-token"] as string,
});

// ... later:
app.use(doubleCsrfProtection);
```

Read the actual current csurf configuration carefully and match the same behavior. The CSRF token endpoint should still work for the frontend.

### Step D: Update `server/types.d.ts`

If it has csurf type declarations (`declare module "csurf"`), remove them and add csrf-csrf types if needed.

### Step E: Update CSRF Token Endpoint

If there is a route that generates/returns CSRF tokens (often `GET /api/csrf-token`), update it to use `generateToken(req, res)` from csrf-csrf.

**Verify:** Start the API server. Verify:
1. Server starts without errors
2. CSRF token can be obtained
3. Login still works (CSRF protection doesn't block it)
4. `npx tsc --noEmit` passes

**Commit:** `cleanup(phase-4): replace deprecated csurf with csrf-csrf`

---

## Task 4.6: Fix Hardcoded Server Bind Address

In `server/index.ts` (around line 156), the server is hardcoded to bind to `127.0.0.1`, which prevents Docker containers from receiving external connections.

### Step A: Update `server/config.ts`

Read `server/config.ts` and add a `host` property to the config object:

```typescript
host: process.env.HOST || "0.0.0.0",
```

### Step B: Update `server/index.ts`

Change:
```typescript
server.listen(port, "127.0.0.1", () => {
    Logger.info(`serving on port ${port}`);
});
```

To:
```typescript
server.listen(port, config.host, () => {
    Logger.info(`serving on ${config.host}:${port}`);
});
```

**Verify:** Server starts successfully. `npx tsc --noEmit` passes.

**Commit:** `cleanup(phase-4): make server bind address configurable`

---

## Phase 4 Completion

### Merge into `cleanup`

```bash
git checkout cleanup
git merge cleanup-phase-4 --no-ff -m "Merge cleanup-phase-4: config and dependency cleanup"
git tag cleanup-phase-4-complete
```

### Full Phase Verification

```bash
npx tsc --noEmit
npx turbo run build
```

Start all 3 services and verify:
- API server starts on configured port
- CSRF protection works (login flow succeeds)
- Student portal loads
- Admin portal loads

### Summary of Changes

- `.env.development` removed from git tracking
- 4–6 unused npm dependencies removed
- 2 `@types` packages moved to devDependencies
- 1 broken npm script fixed
- 1 deprecated package replaced (`csurf` → `csrf-csrf`)
- Server bind address made configurable
