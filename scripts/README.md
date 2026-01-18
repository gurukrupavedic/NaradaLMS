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
| **Seeding** | `seed/create-30-students.ts` | Creates 30 test students with full profile data |
| **Proficiency** | `utils/full-proficiency-reset.ts` | **DESTRUCTIVE**: Resets/Generates proficiency for ALL students |

## Script Categories

### 🛠️ Database Management
- **`db/reset-db.ts`**: Complete DB reset (Node/TS).
- **`test/db-reset.ps1`**: Complete DB reset (PowerShell).

### 🌱 Data Seeding
- **`seed/create-sample-users.ts`**: Creates 10 basic users.
- **`seed/create-30-students.ts`**: Creates 30 detailed student profiles.
- **`seed/create-approved-users.ts`**: Creates pre-approved users (test11-test30).
- **`seed/create-sample-batches.ts`**: Creates 10 sample batches.
- **`seed/assign-secondary-instructors.ts`**: Assigns co-instructors.

### 📊 Proficiency & Progress
- **`utils/check-and-reset-proficiency.ts`**: Audit/fix enrollment proficiency.
- **`utils/full-proficiency-reset.ts`**: Reset EVERYTHING.
- **`utils/reset-all-proficiency.ts`**: Set all to 'Not Started'.

### 🔧 Utilities
- **`utils/list-users.ts`**: List recent users.
- **`utils/update-user-role.ts`**: Promote kashyap to admin.
- **`utils/check-instructor-batches.ts`**: Batch assignment visualization.
- **`utils/test-e2e-batches.ts`**: Batch logic verification.

### 🧪 Tests
- `test/admin-batches-smoke.ts`: Batch management smoke test.
- `test/auth-test.ts`: Authentication flows.
- `test/content-smoke.ts`: Content structure.
