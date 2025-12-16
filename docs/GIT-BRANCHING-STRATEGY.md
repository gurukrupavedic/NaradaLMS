# Git Branching Strategy for Option B Migration

## Core Rule: Never Work on Main

```
┌──────────────────────────────────────────────────────┐
│                    MAIN BRANCH                       │
│                                                      │
│  ✓ Always working                                    │
│  ✓ ChapterEditor always works                        │
│  ✓ Can deploy anytime                                │
│  ✗ Never commit here directly                        │
│  ✗ Never merge broken code here                      │
└──────────────────────────────────────────────────────┘
              ↑ (only merges via pull request)
              │
              └────────────────────────────────────────┐
                                                       │
                    FEATURE BRANCHES                   │
                    (each developer works here)        │
                                                       │
                  phase-0-infrastructure               │
                  phase-1-identity                     │
                  phase-2-content                      │
                  ... etc
```

---

## Workflow for Each Phase

### Step 1: Create Branch from Main

```bash
# Make sure you're on main
git checkout main
git pull origin main

# Create branch for this phase
git checkout -b phase-0-infrastructure

# Now you're on the new branch
git branch  # You should see:
# * phase-0-infrastructure
#   main
```

---

### Step 2: Do All Your Work on This Branch

```bash
# Make changes
# Edit files
# Test locally
git add .
git commit -m "Add database schema for batches table"
git commit -m "Create EventBus infrastructure"
git commit -m "Create module folder structure"

# Keep committing as you work
```

---

### Step 3: Test Everything Before Merging

```bash
# Run all your tests
npm run check          # TypeScript type check
npm test               # Unit tests
npm run build          # Build check
npm run dev            # Manual testing (ChapterEditor works?)

# Test the specific thing you changed
# For phase-0: npm run db:push (verify schema works)
```

---

### Step 4: Push Branch to GitHub

```bash
# Push your work
git push origin phase-0-infrastructure

# Now your branch is on GitHub (safe backup)
```

---

### Step 5: Create Pull Request

On GitHub:
1. Go to your repo
2. Click "Pull Requests"
3. Click "New Pull Request"
4. Base: `main` ← Target branch (where you want to merge)
5. Compare: `phase-0-infrastructure` ← Your work branch
6. Click "Create Pull Request"
7. Add description:
   ```
   ## Phase 0: Infrastructure Setup
   
   - Created module folder structure for all 6 modules
   - Updated database schema with batches, enrollments, audit_logs tables
   - Created EventBus for cross-module communication
   - Created auth middleware
   - Verified npm run db:push works
   
   Testing:
   - ✓ TypeScript check passes
   - ✓ Database migration succeeds
   - ✓ ChapterEditor still works
   - ✓ No compilation errors
   ```

---

### Step 6: Wait for Checks to Pass

GitHub will run checks (if configured):
```
✓ Tests pass
✓ Build succeeds
✓ No merge conflicts
```

If something fails:
```bash
# Go back to your branch
git checkout phase-0-infrastructure

# Fix the issue
# (edit files, test)

# Commit and push
git add .
git commit -m "Fix database schema issue"
git push origin phase-0-infrastructure

# PR automatically updates (no need to create new one)
```

---

### Step 7: Review and Merge

Once everything passes:
1. Review the changes yourself one more time
2. Click "Merge Pull Request" button
3. Confirm merge
4. Delete branch (GitHub offers this)

```bash
# Locally, update to main
git checkout main
git pull origin main

# Your changes are now in main
# The phase branch can be deleted
```

---

## Timeline Example: Full 8-Week Process

```
MAIN BRANCH:
└─ Commit: "Initial setup" (current state)
   │
   ├─── branch: phase-0-infrastructure ─────────────┐
   │    (Week 1, 10 commits)                        │
   │                                                 │
   │    Commits:                                    │
   │    - Add batches table                         │
   │    - Add enrollments table                     │
   │    - Add audit_logs table                      │
   │    - Create EventBus                           │
   │    - Create auth middleware                    │
   │    - Create folder structure                   │
   │                                                 │
   │    [Test: npm run db:push ✓]                   │
   │    [PR created, reviewed, merged] ──────────────→ Merged to main
   │                                                 │
   └─ Commit: "Phase 0: Infrastructure setup"
      │
      ├─── branch: phase-1-identity ────────────────┐
      │    (Week 2-3, 20 commits)                   │
      │                                              │
      │    Commits:                                 │
      │    - Create IdentityService class          │
      │    - Add getUser method                     │
      │    - Add hasRole method                     │
      │    - Create IdentityStorage class           │
      │    - Create identity.routes.ts              │
      │    - Create middleware wrappers             │
      │    - Add unit tests                         │
      │                                              │
      │    [Test: npm run dev + manual testing ✓]   │
      │    [PR created, reviewed, merged] ──────────→ Merged to main
      │                                              │
      └─ Commit: "Phase 1: Identity module complete"
         │
         ├─── branch: phase-2-content ──────────────┐
         │    (Week 3-4, 30 commits)                │
         │                                           │
         │    Commits:                              │
         │    - Create ContentService class         │
         │    - Add createChapter method            │
         │    - Add publishChapter method           │
         │    - Migrate chapter routes              │
         │    - Migrate segment routes              │
         │    - Add tests                           │
         │    - Test ChapterEditor ✓                │
         │                                           │
         │    [Test: ChapterEditor works perfectly] │
         │    [PR created, reviewed, merged] ──────→ Merged to main
         │                                           │
         └─ Commit: "Phase 2: Content module complete"
            │
            ├─── branch: phase-3-design ───────────┐
            │    (Week 5, 5 commits)               │
            │                                       │
            │    Commits:                          │
            │    - Create media-pipeline skeleton  │
            │    - Create batch-cohort skeleton    │
            │    - Create learning-delivery ...    │
            │                                       │
            │    [PR created, reviewed, merged] ──→ Merged to main
            │
            └─ (phases 4-7 follow same pattern)
```

---

## Branch Naming Convention

```
phase-0-infrastructure      ← Infrastructure (DB, EventBus, middleware)
phase-1-identity            ← Identity & Access module
phase-2-content             ← Content & Publishing module
phase-3-design              ← Design remaining modules (before implementation)
phase-4-media               ← Media Pipeline module
phase-5-batch               ← Batch & Cohort module
phase-6-learning            ← Learning Delivery module
phase-7-admin               ← System Admin module + cleanup
```

**Alternative naming if you prefer:**
```
migration/phase-0           ← With prefix
feature/identity-module     ← Descriptive
refactor/modular-structure  ← Purpose-based
```

---

## Protection Rules (Prevent Accidents)

If you want to prevent direct commits to main, you can set up branch protection on GitHub:

1. Go to repo Settings
2. Click "Branches"
3. Add branch protection rule
4. Branch name: `main`
5. Check:
   - ✓ "Require pull request reviews before merging"
   - ✓ "Require status checks to pass before merging"
   - ✓ "Include administrators" (if you want to enforce even for yourself)

Now:
- ✗ Can't commit directly to main
- ✓ Must go through pull request
- ✓ Tests must pass
- ✓ Audit trail of what went where

---

## During a Phase: Multiple Commits

```bash
# Day 1: Create service class
git add server/modules/identity-access/service.ts
git commit -m "Create IdentityService class with 5 methods"
git push origin phase-1-identity

# Day 2: Add storage class
git add server/modules/identity-access/storage.ts
git commit -m "Create IdentityStorage for database queries"
git push origin phase-1-identity

# Day 3: Add middleware
git add server/shared/middleware/auth.ts
git commit -m "Create auth middleware"
git push origin phase-1-identity

# Day 4: Test everything
# npm run check, npm run test, npm run dev
# All passes? Create PR

# OR if tests fail:
# Fix the issue
git add .
git commit -m "Fix TypeScript error in IdentityService"
git push origin phase-1-identity
# (PR auto-updates)
```

---

## If Something Breaks During a Phase

### Scenario 1: You Made a Mistake in Your Branch

```bash
# You're on phase-1-identity
# You realize you made an error

# Option A: Fix and commit
git add .
git commit -m "Fix: Remove incorrect validation"
git push origin phase-1-identity

# Option B: Go back to previous commit
git log  # See all your commits
# Find the commit you want
git revert <commit-hash>  # Creates new commit that undoes it
git push origin phase-1-identity

# Either way, you're fixing your own branch
# Main is still safe
```

### Scenario 2: Phase Breaks Main After Merge

```bash
# Oh no, Phase 1 was merged but broke ChapterEditor
# Revert the merge
git revert -m 1 <merge-commit-hash>

# This creates a new commit that undoes the merge
git push origin main

# Main is safe again
# Now go back to phase-1-identity branch
git checkout phase-1-identity
# Fix the issue
# Re-submit PR
```

---

## Cleanup After Merge

### After Phase is Merged:

```bash
# On main
git checkout main
git pull origin main

# Delete the old branch (remote)
git push origin --delete phase-0-infrastructure

# Delete locally
git branch -d phase-0-infrastructure

# Verify
git branch  # Only shows main now
```

---

## Quick Reference Cheat Sheet

```bash
# START a phase
git checkout main
git pull origin main
git checkout -b phase-X-description

# DURING a phase (repeat as needed)
git add .
git commit -m "Clear description of change"
git push origin phase-X-description

# TEST before merging
npm run check      # TypeScript
npm test           # Unit tests
npm run build      # Build
npm run dev        # Manual test

# CREATE PR
# (Do this on GitHub UI)

# MERGE (after PR approved)
# (Click button on GitHub, delete branch)

# UPDATE local main
git checkout main
git pull origin main

# START next phase
git checkout -b phase-Y-description
```

---

## Example: Full Week 1 (Phase 0)

```bash
# Monday: Start branch
git checkout main
git pull origin main
git checkout -b phase-0-infrastructure

# Monday: Add database schema
# (Edit shared/schema.ts)
git add shared/schema.ts
git commit -m "Add batches, enrollments, audit_logs tables to schema"
git push origin phase-0-infrastructure

# Tuesday: Create EventBus
# (Create server/shared/events/event-bus.ts)
git add server/shared/events/event-bus.ts
git commit -m "Create EventBus for cross-module communication"
git push origin phase-0-infrastructure

# Wednesday: Create auth middleware
# (Create server/shared/middleware/auth.ts)
git add server/shared/middleware/auth.ts
git commit -m "Create auth middleware and requireRole wrapper"
git push origin phase-0-infrastructure

# Thursday: Create folder structure
# (Create empty folders and files)
git add server/modules/identity-access/
git add server/modules/content-publishing/
git add server/modules/media-pipeline/
# ... (all 6 modules)
git commit -m "Create modular folder structure for all 6 modules"
git push origin phase-0-infrastructure

# Friday: Test everything
npm run check        # ✓ Passes
npm run db:push      # ✓ Database migrates successfully
npm run build        # ✓ Compiles

# Create PR on GitHub
# Add description with testing results
# Wait for checks to pass
# Review code yourself
# Click "Merge Pull Request"
# GitHub shows: "Pull request successfully merged and closed"
# Delete branch

# Back to local main
git checkout main
git pull origin main
git branch          # Only shows main
# Ready for Phase 1!
```

---

## Why This Matters

**Without this strategy:**
```
Main branch:
├─ Working version
├─ You commit while building Phase 1
├─ Oops, you broke something
├─ But it's mixed with 50 other changes
├─ Hard to find what broke
├─ Might break ChapterEditor for days
└─ Deploy is risky
```

**With this strategy:**
```
Main branch:
├─ Phase 0 merged ✓ (tested, working)
├─ Phase 1 merged ✓ (tested, working)
├─ Oops, Phase 2 breaks something
├─ But Phase 2 hasn't merged yet
├─ Easy to fix in phase-2 branch
├─ Retest and re-merge
├─ Main never broken
└─ Deploy is safe
```

---

## One More Thing: Reverting Accidental Merges

```bash
# Oh no, I merged Phase 1 but it breaks ChapterEditor
# Don't panic, revert the merge

git log main
# Find the merge commit (looks like "Merge pull request #123")
git revert -m 1 <merge-commit-hash>

# This creates a new commit that undoes the merge
git push origin main

# ChapterEditor works again!
# Now go fix Phase 1 and re-submit
```

---

## Summary

- ✓ Always create a branch for each phase
- ✓ Do all work on the branch
- ✓ Test thoroughly before PR
- ✓ Create PR and let GitHub run checks
- ✓ Merge only after everything passes
- ✓ Delete branch after merge
- ✓ Main is ALWAYS safe
- ✓ ChapterEditor NEVER breaks unexpectedly
- ✓ Easy to rollback if needed

