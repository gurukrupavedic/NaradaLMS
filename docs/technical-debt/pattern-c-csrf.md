# Technical Debt: Pattern C (Direct Fetch vs apiRequest)

**Date**: 2026-02-01
**Status**: Open
**Priority**: Medium (P2)

## Overview

"Pattern C" refers to the usage of the native browser `fetch()` API directly within React components or hooks, instead of using the standardized `apiRequest` utility from `@/lib/queryClient`.

**Why this is an issue:**

1. **CSRF Protection**: `apiRequest` automatically handles CSRF token injection headers. Direct `fetch()` requires manual credential inclusion (`credentials: 'include'`) and relies on cookie-based auth which might be flaky without CSRF headers for non-GET requests (though mostly okay for GETs).
2. **Error Handling**: `apiRequest` has standardized error parsing and 401 handling (redirect to login). Direct `fetch()` requires manual error checking (`if (!res.ok)`).
3. **Prefixing**: `apiRequest` handles the API prefix consistency.

## Remaining Instances

While critical mutations and many queries were migrated in Phase 0, the following locations still use direct `fetch()`:

### 1. `features/student/pages/LearnChapterPage.tsx`

The following queries still use `fetch` with `credentials: 'include'`:

- `audioFiles` query (fetching `/api/audio-files/:id`)
- `mappings` query (fetching `/api/segment-mappings/:id`)
- `progress` query (fetching `/api/learning/progress`)

**Remediation:**
Replace:

```typescript
const response = await fetch(`/api/audio-files/${chapterId}`, {
  credentials: 'include'
});
if (!response.ok) throw new Error('...');
return response.json();
```

With:

```typescript
const response = await apiRequest('GET', `/api/audio-files/${chapterId}`);
return response.json();
```

### 2. General Audit Needed

A global search for `fetch(` in `client/src` should be performed to identify any other lingering instances, particularly in:

- `features/student/**`
- `features/learning/**`

## Plan

This debt should be addressed in **Stage 1 (Cleanup)** or before complex feature work in these components to avoid inconsistent auth behavior.
