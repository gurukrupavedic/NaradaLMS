# VedicLMS Scripts Directory

This directory contains utility scripts for database management, testing, data seeding, and administrative tasks.

## ⚠️ Important Safety Warning

**NEVER run these scripts against the PRODUCTION database unless you are absolutely certain of what you are doing.**
Most scripts in `seed/` and `db/` are destructive or modify data significantly.

## Quick Reference

| Category | Path | Description |
|----------|------|-------------|
| **Database** | `db/reset-db.ts` | **DESTRUCTIVE**: Drops all tables and recreates schema |
| **Database** | `test/db-reset.ps1` | **DESTRUCTIVE**: Windows PowerShell wrapper for full DB reset |
| **Seeding** | `seed/create-30-students.ts` | Creates 30 SLMTS users with active student memberships |
| **Seeding** | `seed/create-sample-batches.ts` | Creates 10 sample SLMTS batches using membership-based instructor lookup |
| **Proficiency** | `utils/full-proficiency-reset.ts` | **DESTRUCTIVE**: Resets/Generates proficiency for ALL students |

## Script Categories

### 🛠️ Database Management

- **`db/reset-db.ts`**
  - *Usage*: `npm run db:reset` (via package.json)
  - *Purpose*: Completely wipes the database schema and recreates it using Drizzle.
  - *Note*: Development only.

- **`test/db-reset.ps1`**
  - *Usage*: `.\scripts\test\db-reset.ps1`
  - *Purpose*: Robust PowerShell script for Windows users to reset the DB. Handles connection checking and Drizzle push.

### 🌱 Data Seeding

- **`seed/create-sample-users.ts`**
  - *Usage*: `npx tsx scripts/seed/create-sample-users.ts`
  - *Purpose*: Creates 10 basic users (`test1` to `test10`) with password `welcome123` and pending SLMTS student memberships.

- **`seed/create-30-students.ts`**
  - *Usage*: `npx tsx scripts/seed/create-30-students.ts`
  - *Purpose*: Creates 30 realistic SLMTS users with active student memberships.

- **`seed/create-approved-users.ts`**
  - *Usage*: `npx tsx scripts/seed/create-approved-users.ts`
  - *Purpose*: Creates users (`test11` to `test30`) with active SLMTS memberships and mixed membership roles.

- **`seed/create-sample-batches.ts`**
  - *Usage*: `npx tsx scripts/seed/create-sample-batches.ts`
  - *Purpose*: Creates 10 standard SLMTS batches (Morning/Evening, etc.) for testing enrollment flows.

- **`seed/assign-secondary-instructors.ts`**
  - *Usage*: `npx tsx scripts/seed/assign-secondary-instructors.ts`
  - *Purpose*: Assigns 2 co-instructors to existing SLMTS batches using active membership roles. Run this *after* creating batches.

### 📊 Proficiency & Progress

- **`utils/check-and-reset-proficiency.ts`**
  - *Usage*: `npx tsx scripts/utils/check-and-reset-proficiency.ts`
  - *Purpose*: Ensures all *enrolled* students have proficiency records. Fills gaps if found.

- **`utils/full-proficiency-reset.ts`**
  - *Usage*: `npx tsx scripts/utils/full-proficiency-reset.ts`
  - *Purpose*: Checks *every* student (enrolled or not) against *every* chapter and creates missing records.
  - *Warning*: high volume operation.

- **`utils/reset-all-proficiency.ts`**
  - *Usage*: `npx tsx scripts/utils/reset-all-proficiency.ts`
  - *Purpose*: Sets `proficiency_level = 9` (Not Started) for all existing records.

### 🔧 Utilities

- **`utils/list-users.ts`**
  - *Usage*: `npx tsx scripts/utils/list-users.ts`
  - *Purpose*: Lists the most recent 20 users with membership summaries by org.

- **`utils/update-user-role.ts`**
  - *Usage*: `npx tsx scripts/utils/update-user-role.ts`
  - *Purpose*: Hardcoded utility to grant `student, admin` roles on the SLMTS membership for `kashyap.kuchipudi@gmail.com`.

- **`utils/check-instructor-batches.ts`**
  - *Usage*: `npx tsx scripts/utils/check-instructor-batches.ts`
  - *Purpose*: Visualizes which instructors are assigned to which batches.

- **`utils/test-e2e-batches.ts`**
  - *Usage*: `npx tsx scripts/utils/test-e2e-batches.ts`
  - *Purpose*: Simulates an end-to-end batch creation and enrollment flow.

### 🧪 Tests & Smoke Scripts

Located in `test/`, these are used for manual verification of specific features:
- `admin-batches-smoke.ts`: Verifies batch management.
- `auth-test.ts`: Verifies authentication flows.
  - Uses membership approval semantics rather than legacy account status toggles.
- `content-smoke.ts`: Verifies content structure.

---
*Maintained by the Antigravity Team*
