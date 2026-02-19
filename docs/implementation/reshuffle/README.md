# Role & Portal Reshuffle

This directory holds the implementation plan and phase details for the Role & Portal Reshuffle (4 roles → 3 roles, two portals).

## Summary (Implemented)

- **Roles:** student, instructor, admin (`content_manager` removed).
- **Student portal (port 3000):** Learn section (all users) + Batches & Progress (instructor role) at `/instructor/batches`, `/instructor/students`.
- **Ops portal (port 3001):** Admin only. Admin Center includes Content Studio at `/content`, User Management, Batch Admin, Audit Logs, Settings.

## Dev database migration (one-off)

If you have existing users with the `content_manager` role in development:

- Run a one-off query to reassign them (e.g. set role to `admin` or remove the role) as needed.
- No deployment migration script is required; the application no longer references `content_manager`.

**TODO:** When writable, remove `content_manager` from the `roles` array in `scripts/seed/create-approved-users.ts` so new seeds use only the three roles.

## Manual doc updates (if EPERM on save)

If saving to docs or .github fails with EPERM, apply these edits by hand:

- **docs/essentials/product-guide.md:** Replace "student, instructor, content_manager, admin" with "student, instructor, admin"; update §3.1 roles table to three roles (Admin includes content); §3.3 content workflow → "Admins" and ops portal paths; role-guard table: Content Studio `['admin']`, Instructor in student portal; schema/users comment and roadmap item.
- **docs/essentials/domain-requirements.md:** "Four roles" → "Three roles"; remove content_manager from role lists; "Only admin can publish" and "Drafts visible only to admin".
- **.github/copilot-instructions.md:** users roles → three roles; Batch Management URLs (ops vs student portal); useRoleGuard examples: remove content_manager, document admin-only and instructor+admin; Pages Requiring Guards: ops portal admin-only, student portal /instructor/*.
