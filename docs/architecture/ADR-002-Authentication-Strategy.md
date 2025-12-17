# ADR-002: Authentication & Identity Strategy

**Date:** 2025-12-16  
**Status:** Accepted  
**Context:** Migration from Replit Auth to production-ready authentication system

---

## Context

VedicLMS was initially prototyped on Replit using Replit's OpenID Connect (OIDC) authentication. This worked for rapid prototyping but has several limitations for production deployment:

1. **Vendor Lock-in**: Replit Auth only works on Replit infrastructure
2. **Limited Social Login**: No built-in Google/Facebook OAuth support
3. **Tight Coupling**: OIDC logic embedded throughout codebase
4. **Deployment Constraints**: Cannot deploy to custom domains/servers without auth rewrites

### Requirements (from ADR-001-ADDENDUM)

- **Open Registration**: Users can self-register accounts
- **Admin Approval Queue**: Accounts start as `pending_approval`, blocked from login
- **Google OAuth**: Required for v1.0 release (primary auth method for target users)
- **Multi-Role Support**: Users can have any combination of roles (student, instructor, content_manager, admin)
- **Social Login Extensibility**: Must support adding Facebook, GitHub, etc. later
- **Password-based Auth**: Optional fallback for users without Google accounts

---

## Decision

**Adopt Passport.js with Local + Google OAuth strategies**

### Architecture

```typescript
Authentication Layer (Passport.js)
├── Local Strategy (email + password)
├── Google OAuth Strategy
└── [Future] Facebook, GitHub, Microsoft strategies

Session Management (express-session + PostgreSQL)
├── Connect-pg-simple store
└── 7-day session TTL

Authorization Layer (Custom Middleware)
├── Role-based access control (RBAC)
├── Status gating (pending_approval, active, inactive)
└── Batch-context permissions (instructors)
```

### Data Model

```typescript
interface User {
  id: string;                     // UUID
  email: string;                  // Unique
  passwordHash?: string;          // Nullable (social-only users)
  
  // OAuth provider tracking
  provider: 'local' | 'google' | 'facebook';
  providerId?: string;            // Provider's user ID
  
  // Profile
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  
  // Authorization
  roles: string[];                // ['student', 'instructor', 'admin']
  status: 'pending_approval' | 'active' | 'inactive';
  
  // Audit
  createdAt: timestamp;
  approvedAt?: timestamp;
  approvedBy?: string;            // Admin user ID
}
```

---

## Alternatives Considered

### Option 1: Lucia Auth (Modern TypeScript-first)

**Pros:**
- TypeScript-native, excellent DX
- OAuth built-in (Google, GitHub, etc.)
- Lightweight, no magic
- Great PostgreSQL support

**Cons:**
- ⚠️ Newer library (v3 released 2024)
- ⚠️ Smaller ecosystem and community
- ⚠️ Less battle-tested than Passport
- ⚠️ Learning curve for team

**Decision:** Rejected due to maturity concerns for production app with real users

---

### Option 2: Managed Auth (Clerk, Auth0, Supabase Auth)

**Pros:**
- ✅ Instant social login setup
- ✅ UI components included
- ✅ MFA, passwordless ready
- ✅ Security handled by vendor

**Cons:**
- ❌ Monthly costs ($25-$100+/month)
- ❌ Vendor lock-in
- ❌ Custom approval queue requires workarounds
- ❌ Less control over user lifecycle
- ❌ May conflict with domain requirements (batch assignment, role combinations)

**Decision:** Rejected due to cost and lack of control over approval workflow

---

### Option 3: Custom JWT-based Auth

**Pros:**
- Full control
- Stateless tokens
- Microservices-friendly

**Cons:**
- ❌ Significant development time (2-3 weeks)
- ❌ Security risks (token storage, refresh logic, CSRF)
- ❌ Need to build OAuth integrations from scratch
- ❌ Maintenance burden

**Decision:** Rejected as premature optimization (no microservices planned)

---

### Option 4: Passport.js (SELECTED)

**Pros:**
- ✅ Already installed (passport + passport-local)
- ✅ Mature & battle-tested (10+ years, millions of apps)
- ✅ 500+ strategies (Google, Facebook, GitHub, SAML, etc.)
- ✅ Express-native, well-documented
- ✅ Full control over data model
- ✅ Zero vendor lock-in
- ✅ Perfect for approval queue requirement
- ✅ Session-based auth (simpler for monolith)

**Cons:**
- ⚠️ Callback-based API (not async/await native)
- ⚠️ More boilerplate than managed services

**Decision:** SELECTED - Best balance of maturity, flexibility, and cost

---

## Implementation Approach

### Phase 0.0: Auth Migration (1-2 weeks)

#### Step 1: Cleanup Replit Auth (2 hours)
```bash
# Remove dependencies
npm uninstall openid-client passport-openid-client

# Delete files
rm server/replitAuth.ts

# Update .env
- REPLIT_DOMAINS, ISSUER_URL, REPL_ID
+ GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
```

#### Step 2: Install Passport.js (30 min)
```bash
npm install passport passport-local passport-google-oauth20 bcrypt
npm install -D @types/passport @types/passport-local @types/passport-google-oauth20 @types/bcrypt
```

#### Step 3: Update Database Schema (1 hour)
```sql
ALTER TABLE users
  ADD COLUMN password_hash TEXT,
  ADD COLUMN provider TEXT DEFAULT 'local' NOT NULL,
  ADD COLUMN provider_id TEXT,
  ALTER COLUMN roles TYPE TEXT[] USING ARRAY[roles],
  ALTER COLUMN status SET DEFAULT 'pending_approval';
```

#### Step 4: Implement Passport Strategies (4 hours)
- Local strategy with bcrypt password hashing
- Google OAuth strategy
- Serialization/deserialization
- Status gating (block pending_approval users)

#### Step 5: Create Auth Routes (2 hours)
```typescript
POST   /api/auth/register          # Open registration
POST   /api/auth/login             # Local auth
GET    /api/auth/google            # OAuth redirect
GET    /api/auth/google/callback   # OAuth callback
POST   /api/auth/logout
GET    /api/auth/me
```

#### Step 6: Update Server Setup (1 hour)
- Replace Replit Auth middleware with Passport
- Configure express-session with PostgreSQL store
- Add passport initialization

#### Step 7: Update Frontend (2 hours)
- Update useAuth hook to call new endpoints
- Add "Sign in with Google" button
- Update login/register forms

#### Step 8: Testing (2 hours)
- Unit tests for strategies
- Integration tests for auth flow
- Manual testing of approval queue

**Total Effort:** ~15 hours (2 days)

---

## Security Considerations

### Password Security
- **Hashing**: bcrypt with salt rounds = 10
- **Password Policy**: Minimum 8 characters (enforced client-side)
- **Future**: Add password strength meter, breach detection (Have I Been Pwned API)

### Session Security
```typescript
session({
  secret: process.env.SESSION_SECRET,  // 32+ random chars
  cookie: {
    httpOnly: true,                    // Prevent XSS
    secure: process.env.NODE_ENV === 'production',  // HTTPS only in prod
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
    sameSite: 'lax'                    // CSRF protection
  },
  resave: false,
  saveUninitialized: false
})
```

### OAuth Security
- **State Parameter**: CSRF protection (Passport handles)
- **Token Storage**: Never expose access tokens to frontend
- **Scope Minimization**: Request only `profile` and `email` from Google

### Status-Based Access Control
```typescript
// Login blocked for unapproved users
if (user.status === 'pending_approval') {
  return done(null, false, { 
    message: 'Your account is awaiting admin approval' 
  });
}
```

---

## Migration Path (Rollback Strategy)

### Feature Flags
```typescript
// Temporary flag during migration
const USE_PASSPORT = process.env.ENABLE_PASSPORT === 'true';

app.use(USE_PASSPORT ? passportAuth : replitAuth);
```

### Data Migration
```sql
-- Backfill provider for existing users
UPDATE users SET provider = 'local' WHERE provider IS NULL;

-- Convert roles array (already done in Phase 0)
-- ALTER TABLE users ALTER COLUMN roles TYPE TEXT[];
```

### Rollback Procedure
If critical issues found:
1. Set `ENABLE_PASSPORT=false` in environment
2. Restart server → reverts to Replit Auth
3. Fix issues on separate branch
4. Re-enable feature flag

---

## Consequences

### Positive

✅ **Production-Ready**: No dependency on Replit infrastructure  
✅ **Social Login**: Google OAuth from day 1, easy to add more providers  
✅ **Cost-Free**: No recurring SaaS fees  
✅ **Full Control**: Custom approval queue, multi-role support  
✅ **Flexibility**: Can add SAML, LDAP, custom providers later  
✅ **Standard Stack**: Passport is industry standard, easy to hire for  

### Negative

⚠️ **Maintenance**: We own the auth code (vs. managed service)  
⚠️ **Development Time**: ~2 days to implement (vs. instant with Clerk)  
⚠️ **Security Responsibility**: Must stay updated on vulnerabilities  

### Neutral

- Session-based auth (vs. JWT): Fine for monolith, may need tokens if we add mobile app
- Callback-based API: Not as clean as async/await, but manageable

---

## Success Metrics

### Functional Requirements
- [ ] Users can register with email/password
- [ ] Users can sign in with Google
- [ ] Unapproved users blocked from login
- [ ] Admin can approve/reject accounts
- [ ] Approved users auto-assigned 'student' role
- [ ] Multi-role support working (any combination)
- [ ] Sessions persist for 7 days
- [ ] Logout clears session

### Non-Functional Requirements
- [ ] Auth latency < 200ms (p95)
- [ ] Password hashing < 500ms
- [ ] Google OAuth redirect < 1s
- [ ] Zero production auth errors for 1 week

### Migration Success
- [ ] All Replit Auth code removed
- [ ] No regression in existing functionality
- [ ] Frontend auth flows unchanged (transparent migration)
- [ ] Database schema updated without data loss

---

## Future Enhancements

### Phase 2 (Post-MVP)
- Email verification for local accounts
- Password reset flow
- "Remember me" extended sessions
- Account linking (merge local + Google accounts)

### Phase 3 (Growth)
- Facebook, Microsoft, GitHub OAuth
- Multi-factor authentication (TOTP)
- Security event logging (login attempts, password changes)
- Account recovery via admin

### Phase 4 (Scale)
- Rate limiting (prevent brute force)
- CAPTCHA for registration
- Device fingerprinting
- Suspicious activity detection

---

## References

- [Passport.js Documentation](http://www.passportjs.org/)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [ADR-001-ADDENDUM: Domain Requirements](./ADR-001-ADDENDUM-Domain-Requirements.md)
- [MIGRATION-ROADMAP.md](../MIGRATION-ROADMAP.md)

---

## Approval

**Decision Maker:** Kashyap Kuchipudi  
**Date:** 2025-12-16  
**Status:** ✅ Accepted

**Next Action:** Begin Phase 0.0 implementation (Step 0.0.1: Remove Replit Auth)
