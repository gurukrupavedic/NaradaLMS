# Technical Debt: Pattern C API Client Refactor

**Date Created**: 2026-02-01  
**Priority**: 🟡 Medium  
**Effort Estimate**: 1 week  
**Risk if Ignored**: 🟢 Low (server-side protection sufficient)  
**Status**: Backlog

---

## Problem Statement

Currently, the codebase uses **3 different patterns** for making API requests:

1. **Pattern A** (✅ Good): `queryKey` with default `getQueryFn` - Uses centralized API client
2. **Pattern B** (✅ Fixed): `apiRequest()` direct calls - Uses centralized API client
3. **Pattern C** (⚠️ Technical Debt): Direct `fetch()` calls - **Bypasses all centralized logic**

Pattern C creates maintenance and UX issues because it bypasses:

- ❌ Centralized CSRF token handling
- ❌ Centralized error handling (401/403 redirects)
- ❌ Request/response interceptors
- ❌ Consistent URL prefix handling

## Context

During Phase 0 CSRF fix (2026-02-01), we discovered 10 files using Pattern C. Analysis revealed:

- ✅ **Server-side CSRF protection works** - Invalid POSTs are blocked (403 Forbidden)
- ⚠️ **Frontend UX suffers** - Failed POSTs show generic error messages
- ⚠️ **Inconsistent patterns** - Developers must remember to add CSRF manually

**Security Note**: This is **NOT a security vulnerability**. The server CSRF middleware protects all POST/PUT/DELETE requests regardless of frontend implementation. However, it creates poor developer experience and fragile code.

---

## Files Requiring Refactor

### High Priority (POST requests without CSRF)

1. ✅ **LearnChapterPage.tsx** - `POST /api/learning/chapters/:id/access`  
   - **Status**: Fixed in Phase 0B
   - **Impact**: Chapter access tracking now works

### Medium Priority (GET requests, but bypassing error handling)

1. **LearnChapterPage.tsx** - 5 additional `fetch()` calls
   - Lines 114, 126, 138, 150, 162
   - All GET requests (no CSRF needed)
   - Missing centralized 401 handling

2. **ChapterEditorContext.tsx** - 1 `fetch()` call
   - Line 46: `GET /api/content/chapters/:id/details`
   - Missing centralized error handling

### Low Priority (Special cases)

1. **useAudioManagement.ts** - 1 `fetch()` call
   - Line 62: `POST /api/content/chapters/:id/audio`
   - **Special**: Uses FormData (multipart/form-data)
   - Cannot use `apiClient` (sets Content-Type: application/json)
   - Needs custom wrapper for FormData + CSRF

2. **useSystemSettings.ts** - 1 `fetch()` call  
   - Line 30: `GET /api/admin/settings/:key`
   - Missing centralized error handling

3. **apiClient.ts** - 1 `fetch()` call (DO NOT CHANGE)
   - Line 18: `GET /api/csrf-token`
   - **Critical**: Bootstrap fetch, must remain as-is

---

## Proposed Solution

### Phase 1: Refactor GET requests (4 hours)

Replace direct `fetch()` with `apiRequest()` from `queryClient.ts`:

**Before**:

```typescript
const response = await fetch(`/api/chapters/${id}/details`, {
  credentials: 'include'
});
if (!response.ok) throw new Error('Failed to fetch');
return response.json();
```

**After**:

```typescript
import { apiRequest } from '@/lib/queryClient';

const response = await apiRequest('GET', `/api/chapters/${id}/details`);
return response.json();
```

**Benefits**:

- ✅ Centralized error handling
- ✅ Automatic 401 redirect to login
- ✅ Consistent URL handling
- ✅ Easier to add interceptors later

### Phase 2: Handle FormData special case (2 hours)

Create `apiClient` wrapper for FormData uploads:

**File**: `client/src/lib/apiClient.ts`

```typescript
// Add new function
export async function apiUploadFormData(
  endpoint: string,
  formData: FormData
): Promise<Response> {
  // Get CSRF token
  const token = await getCsrfToken();
  
  // Don't set Content-Type - browser will set multipart/form-data with boundary
  return fetch(`/api${endpoint}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'X-CSRF-Token': token,
    },
    body: formData,
  });
}
```

**Usage in useAudioManagement.ts**:

```typescript
import { apiUploadFormData } from '@/lib/apiClient';

const response = await apiUploadFormData(
  `/content/chapters/${chapterId}/audio`,
  formData
);
```

### Phase 3: Add centralized error handling (1 day)

Create error interceptor in `apiClient.ts`:

```typescript
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const response = await fetch(`/api${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...getCsrfHeaders(options.method),
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // Centralized error handling
  if (response.status === 401) {
    // Redirect to login
    window.location.href = '/auth';
    throw new Error('Unauthorized');
  }

  if (response.status === 403) {
    // CSRF token expired, refresh and retry once
    csrfToken = null;
    throw new Error('Forbidden - CSRF token expired');
  }

  return response;
}
```

### Phase 4: Integration tests (1 day)

Add tests to verify:

- CSRF tokens included in POSTs
- 401 redirects to login
- 403 triggers token refresh
- FormData uploads work

---

## Implementation Checklist

### Files to Refactor

- [ ] `LearnChapterPage.tsx` (5 GET calls)
  - [ ] Line 114: chapter details
  - [ ] Line 126: text segments
  - [ ] Line 138: audio files
  - [ ] Line 150: segment mappings
  - [ ] Line 162: student progress

- [ ] `ChapterEditorContext.tsx` (1 GET call)
  - [ ] Line 46: chapter details

- [ ] `useSystemSettings.ts` (1 GET call)
  - [ ] Line 30: system settings

- [ ] `useAudioManagement.ts` (1 POST FormData)
  - [ ] Create `apiUploadFormData` wrapper
  - [ ] Line 62: audio upload

### New Code to Create

- [ ] Add `apiUploadFormData()` to `apiClient.ts`
- [ ] Add centralized 401/403 handling to `apiClient.ts`
- [ ] Add integration tests for CSRF protection

---

## Acceptance Criteria

1. ✅ All direct `fetch()` calls use `apiRequest` or `apiUploadFormData`
2. ✅ CSRF tokens automatically included in all POSTs
3. ✅ 401 errors automatically redirect to login
4. ✅ 403 errors trigger CSRF token refresh
5. ✅ Zero `/api/api/` requests in server logs
6. ✅ FormData uploads work correctly
7. ✅ Integration tests pass

---

## Testing Strategy

### Manual Testing

1. **Chapter Access** (Fixed in Phase 0B)
   - Open student learning page
   - Verify POST succeeds without errors

2. **File Upload**
   - Upload audio file in Content Studio
   - Verify CSRF token included
   - Verify upload succeeds

3. **Session Expiry**
   - Let session expire (or manually clear cookies)
   - Try to access protected page
   - Verify redirect to login (not generic error)

4. **CSRF Token Expiry**
   - Manually corrupt CSRF cookie
   - Try POST request
   - Verify token refresh and retry (or clear error)

### Automated Testing

```typescript
// Test: CSRF token included in POST
test('apiRequest includes CSRF token in POST', async () => {
  const mockFetch = vi.fn().mockResolvedValue(new Response());
  global.fetch = mockFetch;
  
  await apiRequest('/test', { method: 'POST' });
  
  expect(mockFetch).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      headers: expect.objectContaining({
        'X-CSRF-Token': expect.any(String)
      })
    })
  );
});

// Test: 401 redirects to login
test('apiRequest redirects on 401', async () => {
  global.fetch = vi.fn().mockResolvedValue(
    new Response(null, { status: 401 })
  );
  
  await expect(apiRequest('/test')).rejects.toThrow();
  expect(window.location.href).toBe('/auth');
});
```

---

## Migration Strategy

### Safe Rollout

1. **Phase 1**: Refactor non-critical GET requests
2. **Phase 2**: Add FormData wrapper and refactor uploads
3. **Phase 3**: Add centralized error handling
4. **Phase 4**: Monitor for 1 week, verify no regressions

### Rollback Plan

If issues arise:

```bash
git revert <commit-hash>
# Specific files can be restored individually
git checkout HEAD~1 -- client/src/features/student/pages/LearnChapterPage.tsx
```

---

## Dependencies

- ✅ Phase 0 CSRF fix complete (apiRequest prefix stripping)
- ⏸️ Awaiting Phase 0 merge to main
- ⏸️ Stage 0 completion

---

## Effort Breakdown

| Task | Effort | Risk |
|------|--------|------|
| Refactor GET requests | 4 hours | Low |
| FormData wrapper | 2 hours | Low |
| Centralized error handling | 1 day | Medium |
| Integration tests | 1 day | Low |
| Code review & testing | 4 hours | Low |
| **Total** | **5-6 days** | **Low** |

---

## Business Impact

### If NOT Fixed

- ⚠️ UX: Generic error messages on session expiry
- ⚠️ DX: Developers must manually add CSRF to each POST
- ⚠️ Maintenance: 3 different patterns to maintain
- ✅ Security: No impact (server protects)

### If Fixed

- ✅ UX: Automatic login redirect on session expiry
- ✅ DX: Single pattern, easier to onboard new developers
- ✅ Maintenance: One place to update (apiClient)
- ✅ Future-ready: Easy to add interceptors (analytics, logging)

---

## Related Documents

- [Phase 0 CSRF Fix Plan](file:///C:/Users/kashy/.gemini/antigravity/brain/e7dde455-fca4-4c72-8b3f-ecb4f50bc5f9/csrf-fix-plan.md)
- [Security Audit Report](file:///C:/Users/kashy/.gemini/antigravity/brain/e7dde455-fca4-4c72-8b3f-ecb4f50bc5f9/security-approval.md)
- [Code Audit Results](file:///C:/Users/kashy/.gemini/antigravity/brain/e7dde455-fca4-4c72-8b3f-ecb4f50bc5f9/audit-results.md)

---

## Decision Log

**Date**: 2026-02-01  
**Decision**: Fix Pattern B immediately, defer Pattern C refactor  
**Rationale**: Pattern B blocks 3 pages, Pattern C only affects UX, server protects security  
**Approved By**: User (via plan review)

---

**Last Updated**: 2026-02-01  
**Next Review**: After Stage 0 completion  
**Owner**: TBD
