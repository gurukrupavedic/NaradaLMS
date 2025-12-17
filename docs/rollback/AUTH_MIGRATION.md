# Phase 0 Rollback: Auth Migration

If you need to revert the Passport.js local auth changes and restore a minimal auth state, follow these steps.

## What was changed in Phase 0

- **Schema:** Added `users` table with `provider`, `providerId`, `passwordHash`, `status` columns; added `sessions` table for express-session.
- **Server:** Added Passport.js local strategy, session store (PostgreSQL), auth routes at `/api/auth/*`.
- **Environment:** Requires `SESSION_SECRET` and `DATABASE_URL`.
- **Client:** Auth system expects `/api/auth/me` and session-based cookies.

## Rollback Steps

### 1. Database Reset (if needed)
If you want to clear all auth-related tables:

```powershell
npm run db:reset
```

This drops the `public` schema and recreates it with a fresh schema from Drizzle.

### 2. Revert Code Changes
If you need to remove Passport.js entirely:

```bash
git log --oneline | grep -i auth
git show <commit-hash>  # Review what was changed
git revert <commit-hash>  # Revert the commit
```

Or selectively remove:
- Delete `server/auth/passport-config.ts`
- Delete `server/routes/auth.routes.ts`
- Remove `import { authRouter }` and `app.use('/api/auth', authRouter)` from `server/index.ts`
- Remove auth middleware from session setup in `server/index.ts`

### 3. Revert Dependencies
If removing Passport completely:

```bash
npm remove passport passport-local passport-google-oauth20 bcrypt express-session connect-pg-simple
```

### 4. Revert Environment
Remove these from `.env`:
- `SESSION_SECRET`
- `GOOGLE_CLIENT_ID` (if set)
- `GOOGLE_CLIENT_SECRET` (if set)

Keep `DATABASE_URL` and PG* variables for other features.

## If You Want to Keep Replit Auth

Contact Replit support or check [Replit Auth Docs](https://docs.replit.com/docs/replit-auth). You'll need to:
1. Reinstall Replit Auth SDK
2. Update `server/index.ts` to use Replit Auth middleware
3. Adjust schema to match Replit's user table structure
4. Update client `useAuth` hook to call Replit Auth endpoints

## Notes

- Phase 0 auth is **local-only** (no Google OAuth yet). Rollback is straightforward.
- The approval gating (`status = 'pending_approval'`) exists by design; reverting auth removes this gating entirely.
- Session data is stored in PostgreSQL; reverting deletes session state.
- If you rollback, future phases (Identity & Access, admin approval UI) will need to be rebuilt from scratch.

## Quick Recovery

If you just want to reset the database schema without code changes:

```powershell
npm run db:reset
```

This clears the auth tables and reapplies the current Drizzle schema, keeping all code intact.
