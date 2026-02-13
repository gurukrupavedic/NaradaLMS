# Phase 2: Critical Bug Fixes

> **Objective**: Fix bugs that cause crashes, broken features, or incorrect behavior. These are issues that would be immediately visible to users or testers.
>
> **Prerequisites**: Phase 1 completed and merged into `hardening`. You must be on the `hardening` branch.
>
> **Risk**: Low. Each fix is isolated and targeted.

---

## Branch (start of Phase 2)

Work for this phase must be done on a dedicated phase branch. **Do not work on `main` or push to `main`.**

```bash
git checkout hardening
git pull origin hardening   # if using a remote
git checkout -b hardening-phase-2
```

All tasks and commits for Phase 2 happen on `hardening-phase-2`.

---

## Task 2.1: Fix SSR Crashes in Student Portal's LearnChapter

**File**: `apps/student-portal/src/components/learning/LearnChapter.tsx`

Two browser-only APIs are called during server-side rendering, which will crash Next.js.

### Fix 2.1a: Guard `localStorage` access

**Before** (around line 90):
```typescript
const [learnMode, setLearnMode] = useState<boolean>(() => {
    const stored = localStorage.getItem("study-learn-mode");
    return stored ? JSON.parse(stored) : true;
});
```

**After**:
```typescript
const [learnMode, setLearnMode] = useState<boolean>(true);

// Hydrate from localStorage on client mount
useEffect(() => {
    const stored = localStorage.getItem("study-learn-mode");
    if (stored !== null) {
        setLearnMode(JSON.parse(stored));
    }
}, []);
```

### Fix 2.1b: Guard `new Audio()` instantiation

**Before** (around line 102):
```typescript
const previewAudioRef = useRef<HTMLAudioElement>(new Audio());
```

**After**:
```typescript
const previewAudioRef = useRef<HTMLAudioElement | null>(null);

// Initialize Audio on client mount
useEffect(() => {
    previewAudioRef.current = new Audio();
    return () => {
        // Cleanup: stop and release audio on unmount
        if (previewAudioRef.current) {
            previewAudioRef.current.pause();
            previewAudioRef.current.src = '';
            previewAudioRef.current = null;
        }
    };
}, []);
```

**Important**: After this change, every reference to `previewAudioRef.current` must be guarded with a null check. Search for `previewAudioRef.current` in the file and add `if (previewAudioRef.current)` guards where needed. For example:

**Before**:
```typescript
previewAudioRef.current.src = audioUrl;
previewAudioRef.current.play();
```

**After**:
```typescript
if (previewAudioRef.current) {
    previewAudioRef.current.src = audioUrl;
    previewAudioRef.current.play();
}
```

### Verification for Task 2.1
1. Run: `cd apps/student-portal && npx tsc --noEmit` — no compile errors
2. Run: `cd apps/student-portal && npm run build` — should build without SSR errors
3. Start the student portal and navigate to a chapter page — should load correctly
4. Audio should play when clicked

---

## Task 2.2: Fix Wrong `apiRequest` Call Signature in LearnChapter

**File**: `apps/student-portal/src/components/learning/LearnChapter.tsx`

Around line 158, `apiRequest` is called with the wrong signature. The `apiRequest` function from `@narada/api-client` expects `(endpoint, options)`, but it's being called as `(method, endpoint, body)`.

**Before**:
```typescript
apiRequest('POST', `/learning/chapters/${chapterId}/access`, {})
    .catch(() => { });
```

**After**:
```typescript
apiRequest(`/learning/chapters/${chapterId}/access`, { method: 'POST' })
    .catch(() => { });
```

### Verification for Task 2.2
1. Run: `cd apps/student-portal && npx tsc --noEmit`
2. Start the student portal, navigate to a chapter — the access tracking request should succeed (check browser network tab, confirm a POST to `/learning/chapters/X/access` returns 200)

---

## Task 2.3: Fix `useDropEnrollment` Double API Prefix

**File**: `apps/ops-portal/src/lib/hooks/useBatchRelations.ts`

The `useDropEnrollment` hook prepends `/api/` to the endpoint, but `apiRequest` already prepends `/api`. This results in a request to `/api/api/enrollments/...` which 404s.

**Before** (around line 117):
```typescript
export function useDropEnrollment(batchId: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ enrollmentId }: { enrollmentId: number }) => {
            return apiRequest(
                `/api/enrollments/${enrollmentId}/drop`,
                { method: "PATCH" }
            );
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [`/api/batches/${batchId}/enrollments`] });
        },
    });
}
```

**After**:
```typescript
export function useDropEnrollment(batchId: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ enrollmentId }: { enrollmentId: number }) => {
            return apiRequest(
                `/enrollments/${enrollmentId}/drop`,
                { method: "PATCH" }
            );
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [`/batches/${batchId}/enrollments`] });
        },
    });
}
```

**Also check**: Grep the entire ops-portal for other hooks that may have the same `/api/` prefix issue:
```bash
rg '"/api/' apps/ops-portal/src/lib/hooks/ --files-with-matches
```

Fix any other instances found with the same pattern (remove the `/api` prefix since `apiRequest` adds it).

### Verification for Task 2.3
1. Start the ops portal and the server
2. Navigate to a batch detail page with enrolled students
3. Attempt to drop a student — the operation should succeed
4. The enrollment list should refresh after dropping

---

## Task 2.4: Fix Ops Portal `QueryClient` SSR Leak

**File**: `apps/ops-portal/src/components/providers.tsx`

The `QueryClient` is created at module level, which means it's shared across all requests during SSR. This can leak data between users.

**Before**:
```typescript
'use client';

import {
    QueryClient,
    QueryClientProvider,
} from '@tanstack/react-query';
import { ReactNode } from 'react';
import { Toaster } from "@narada/ui";

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <Toaster />
        </QueryClientProvider>
    );
}
```

**After**:
```typescript
'use client';

import {
    QueryClient,
    QueryClientProvider,
} from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { Toaster } from "@narada/ui";
import { ThemeProvider } from "@narada/ui";

export function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 30 * 1000, // 30 seconds
                retry: 1,
                refetchOnWindowFocus: false,
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                {children}
                <Toaster />
            </ThemeProvider>
        </QueryClientProvider>
    );
}
```

**Also update student portal** to add sensible defaults:

**File**: `apps/student-portal/src/components/providers.tsx`

**Before**:
```typescript
const [queryClient] = useState(() => new QueryClient());
```

**After**:
```typescript
const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
}));
```

### Verification for Task 2.4
1. Both portals should still load and function normally
2. Verify that data fetching still works (login, view batches, view progress)

---

## Task 2.5: Fix `useAuth` Error Handling

Both portals have identical `useAuth` hooks that swallow all errors as "not authenticated." This masks real issues like network failures or server errors.

**File**: `apps/student-portal/src/hooks/useAuth.ts`
**File**: `apps/ops-portal/src/hooks/useAuth.ts`

Apply the same change to BOTH files:

**Before**:
```typescript
queryFn: async () => {
    try {
        const response = await apiRequest("/auth/me");
        return response.user as AuthUser;
    } catch (err) {
        // Quick fix: assumes any error means not authenticated for now
        return null;
    }
},
```

**After**:
```typescript
queryFn: async () => {
    try {
        const response = await apiRequest("/auth/me");
        return response.user as AuthUser;
    } catch (err: unknown) {
        // 401 means not authenticated — this is expected
        // Other errors (network, 500) should propagate so React Query can retry
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('401') || message.includes('Unauthorized')) {
            return null;
        }
        // Re-throw non-auth errors so React Query retries them
        throw err;
    }
},
retry: (failureCount, error) => {
    // Don't retry auth check failures, but retry network errors
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('401') || message.includes('Unauthorized')) {
        return false;
    }
    return failureCount < 2;
},
```

**Also fix**: Remove the stale comment on line 5 of both files:
```typescript
// REMOVE this line:
import { apiRequest } from "../lib/api"; // Updated to use the correct apiFetch from lib/api
// REPLACE with:
import { apiRequest } from "../lib/api";
```

### Verification for Task 2.5
1. Start both portals
2. Login should still work
3. When NOT logged in, navigating to a protected page should redirect to login (not show an error)
4. If the server is stopped, the portal should show an error state (not silently fail)

---

## Task 2.6: Fix Hardcoded `localhost:5000` Redirects in Ops Portal Layouts

**Files**:
- `apps/ops-portal/src/app/admin/layout.tsx`
- `apps/ops-portal/src/app/instructor/layout.tsx`
- `apps/ops-portal/src/app/content/layout.tsx`

All three layouts redirect unauthenticated users to `http://localhost:5000/login`. This should redirect to the ops portal's own login page at `/`.

**Before** (in each layout):
```typescript
window.location.href = "http://localhost:5000/login";
```

**After** (in each layout):
```typescript
router.push("/");
```

### Verification for Task 2.6
1. Clear cookies/logout from the ops portal
2. Try to navigate directly to `/admin`, `/instructor`, `/content`
3. Should redirect to `/` (the login page), NOT to localhost:5000

---

## Task 2.7: Fix Hardcoded Google OAuth URL

**File**: `apps/student-portal/src/components/auth/StudentAuthPage.tsx`
**File**: `apps/ops-portal/src/components/auth/OpsAuthPage.tsx`

Both files hardcode `http://localhost:5000/api` as the fallback for Google OAuth.

**Before** (in both files):
```typescript
const handleGoogleLogin = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    window.location.href = `${apiUrl}/auth/google`;
};
```

**After** (in both files):
```typescript
const handleGoogleLogin = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
        console.error('NEXT_PUBLIC_API_URL environment variable is not set');
        return;
    }
    window.location.href = `${apiUrl}/auth/google`;
};
```

**Also**: Create `.env.local` files for development if they don't exist:

**File**: `apps/student-portal/.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

**File**: `apps/ops-portal/.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

**File**: `apps/student-portal/.env.example` (for documentation)
```
# API server URL (required)
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

**File**: `apps/ops-portal/.env.example`
```
# API server URL (required)
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Add `.env.local` to `.gitignore` if not already there. The `.env.example` files SHOULD be committed.

### Verification for Task 2.7
1. Confirm `.env.local` files exist in both portals
2. Google login button should still work (redirects to the server's OAuth endpoint)
3. If you remove `NEXT_PUBLIC_API_URL` from `.env.local`, the Google button should log an error to console instead of redirecting to localhost

---

## Task 2.8: Fix OpsAuthPage Post-Login Redirect

**File**: `apps/ops-portal/src/components/auth/OpsAuthPage.tsx`

After successful login, the page always redirects to `/admin`, even for instructor-only users.

**Before** (around line 140):
```typescript
setTimeout(() => {
    window.location.href = "/admin";
}, 500);
```

**After**:
```typescript
// Redirect based on user's primary role
setTimeout(() => {
    const user = queryClient.getQueryData<any>(["auth", "me"]);
    const roles = user?.roles || [];
    if (roles.includes('admin')) {
        window.location.href = "/admin";
    } else if (roles.includes('instructor')) {
        window.location.href = "/instructor";
    } else if (roles.includes('content_manager')) {
        window.location.href = "/content";
    } else {
        window.location.href = "/admin"; // Fallback
    }
}, 500);
```

### Verification for Task 2.8
1. Login as an instructor-only user — should redirect to `/instructor`
2. Login as an admin user — should redirect to `/admin`
3. Login as a content manager — should redirect to `/content`

---

## Phase 2 Completion Checklist

- [ ] SSR crash: `localStorage` access guarded
- [ ] SSR crash: `new Audio()` guarded with cleanup
- [ ] Wrong `apiRequest` call signature fixed in LearnChapter
- [ ] `useDropEnrollment` double `/api/` prefix fixed
- [ ] `QueryClient` SSR leak fixed in ops portal
- [ ] `useAuth` error handling improved in both portals
- [ ] Hardcoded `localhost:5000` redirects replaced with `router.push("/")`
- [ ] Google OAuth URL made environment-driven
- [ ] `.env.local` and `.env.example` files created for both portals
- [ ] Post-login redirect in ops portal is role-aware
- [ ] `npm run verify` passes
- [ ] Both portals build and function correctly
- [ ] All work committed on `hardening-phase-2`

---

## Merge (end of Phase 2)

Merge this phase into `hardening` only. **Do not merge into `main`.**

```bash
git checkout hardening
git merge hardening-phase-2 --no-ff -m "Merge hardening-phase-2: Critical bug fixes"
git tag hardening-phase-2-complete   # optional
git push origin hardening --tags    # if using a remote
```

Proceed to [Phase 3](phase-3-server-hardening.md) or [Phase 4](phase-4-portal-refactoring.md): create `hardening-phase-3` or `hardening-phase-4` from `hardening` when starting the next phase.
