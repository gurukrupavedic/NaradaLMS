# API Design

This document defines the HTTP API for the Narada LMS backend. See [data-model.md](data-model.md) for the underlying schema and role system.

## Conventions

**Base URL:** All routes are prefixed with `/v1`.

**School context:** Each school is accessed by sending `X-School-Slug`. Middleware resolves the school, sets the Postgres `search_path` to the school's schema, and attaches the school context to the request. BetterAuth's `activeOrganizationId` is not used for tenant selection. **Course context:** `X-Course-Slug` says which course a request is about — the web app's proxy stamps it from the hostname (`vedam.slmts.naradas.app` → `vedam`; see `docs/course-hostnames.md`). With it, course-owned **lists** are limited to that course (tracks, batches, the dashboard and profile detail, exams, enrollment requests, registrations). Without it they are school-wide, as before, and a slug that isn't a course is `404 course not found`. A request that *creates* something course-owned (a registration) files it under that course; with no header, a school that has exactly one course uses it, and a school with several answers `422` rather than guessing. The header is context, not authorization — by-id endpoints are not filtered by it. Routes under `/v1/schools` are the exception — they operate on the shared schema and require super-admin access.

**Authentication:** BetterAuth session cookies. Every route except BetterAuth's own auth endpoints requires a valid session. The authenticated user's `shared.user.id` is available on the request context.

**Response envelope:** All responses use a consistent envelope with the appropriate HTTP status code.

```ts
// Success (2xx)
{
  ok: true,
  data: T
}

// Error (4xx, 5xx)
{
  ok: false,
  error: {
    code: string,      // machine-readable, e.g. "RESOURCE_NOT_FOUND"
    message: string,   // human-readable
    details?: unknown  // present for validation failures and other structured errors
  }
}
```

**Cursor-based pagination:** List endpoints that can grow unboundedly accept `?cursor=<opaque>&limit=<int>`. The response includes a `nextCursor` field. When `nextCursor` is `null`, there are no more results.

```ts
// Paginated response
{
  ok: true,
  data: {
    items: T[],
    nextCursor: string | null
  }
}
```

**Common error codes:**

| HTTP Status | Code               | Meaning                                                 |
| ----------- | ------------------ | ------------------------------------------------------- |
| 400         | `INVALID_REQUEST` / `VALIDATION_FAILED` | Malformed request, or request body/params/query failed validation |
| 401         | `UNAUTHENTICATED`                   | No valid session                                        |
| 403         | `PERMISSION_DENIED`                 | Valid session but insufficient role/permission          |
| 404         | `RESOURCE_NOT_FOUND`                | Resource does not exist                                 |
| 409         | `RESOURCE_CONFLICT`                 | Duplicate or state conflict (e.g. duplicate enrollment) |
| 422         | `UNPROCESSABLE_INPUT`               | Valid request but domain rules prevent it               |
| 500         | `INTERNAL_ERROR`                    | Unexpected server failure                               |

---

## Profile

BetterAuth handles signup, login, and session management. Profile data (phone, city) is stored on the `enrollment` record — there is no separate profile table.

### `GET /v1/profile`

Return the current user's school memberships for the school picker.

**Access:** Authenticated user. This endpoint is not school-scoped and does not require `X-School-Slug`.

```ts
// Response 200
{
  ok: true,
  data: {
    isSuperAdmin: boolean,
    memberships: Array<{
      organizationId: string,
      organizationName: string,
      organizationSlug: string,
      role: "owner" | "admin" | "member"
    }>
  }
}
```

### `PATCH /v1/batches/:batchId/enrollments/me`

Update the current user's profile fields on one batch enrollment.

**Access:** Authenticated user in a school context.

```ts
// Request (phone or city required)
{
  phone?: string,
  city?: string
}

// Response 200
{
  ok: true
}
```

---

## Schools

Operate on the public schema. Require super-admin access. Not scoped to `X-School-Slug`.

### `GET /v1/schools`

List all schools.

**Access:** Super Admin.

```ts
// Response 200
{
  ok: true,
  data: Array<{
    id: string,
    name: string,
    slug: string,
    createdAt: string
  }>
}
```

### `PATCH /v1/schools/:schoolId`

Update school metadata.

**Access:** Super Admin.

```ts
// Request (all fields optional)
{
  name?: string,
  slug?: string
}

// Response 200
{
  ok: true,
  data: {
    id: string,
    name: string,
    slug: string,
    createdAt: string
  }
}
```

---

## Tracks

### `GET /v1/tracks`

List all tracks with their chapters. Students only see tracks that contain published chapters.

**Access:** All school members.

```ts
// Response 200
{
  ok: true,
  data: Array<{
    id: string,
    name: string,
    order: number,
    chapters: Array<{
      id: string,
      trackId: string,
      code: string,
      title: string,
      status: "draft" | "published",
      order: number,
      script: "te" | "sa" | "en" | null,
      textUrl: string | null
    }>
  }>
}
```

Students receive chapters filtered to `status: "published"` only.

### `GET /v1/tracks/:trackId`

Single track with full chapter list.

**Access:** All school members.

```ts
// Response 200
{
  ok: true,
  data: {
    id: string,
    name: string,
    order: number,
    chapters: Array<{
      id: string,
      trackId: string,
      code: string,
      title: string,
      status: "draft" | "published",
      order: number,
      script: "te" | "sa" | "en" | null,
      textUrl: string | null
    }>
  }
}
```

### `POST /v1/tracks`

Create a track.

**Access:** Admin.

```ts
// Request
{
  name: string
}

// Response 201
{
  ok: true,
  data: {
    id: string,
    name: string,
    order: number
  }
}
```

Order is auto-assigned at the end of the track list.

### `PUT /v1/tracks/order`

Replace the full track order.

**Access:** Admin.

```ts
// Request
{
  ids: string[]
}

// Response 200
{
  ok: true,
  data: Array<{
    id: string,
    name: string,
    order: number
  }>
}
```

The request must include every track exactly once.

### `PATCH /v1/tracks/:trackId`

Update track metadata.

**Access:** Admin.

```ts
// Request (all fields optional)
{
  name?: string
}

// Response 200
{
  ok: true,
  data: {
    id: string,
    name: string,
    order: number
  }
}
```

---

## Chapters

### `GET /v1/chapters/:chapterId`

Full chapter with text metadata, segments, audio assets, and mappings.

**Access:** School members with `content:read`. Draft chapters require `draft:read`; otherwise the API returns `403 FORBIDDEN`.

```ts
// Response 200
{
  ok: true,
  data: {
    id: string,
    trackId: string,
    code: string,
    title: string,
    status: "draft" | "published",
    order: number,
    script: "te" | "sa" | "en" | null,
    textUrl: string | null,
    segments: Array<{
      id: string,
      chapterId: string,
      start: number,
      end: number
    }>,
    audioAssets: Array<{
      id: string,
      chapterId: string,
      label: string | null,
      url: string,
      duration: number,
      audioMappings: Array<{
        segmentId: string,
        audioAssetId: string,
        audioStart: number,
        audioEnd: number
      }>
    }>
  }
}
```

### `POST /v1/chapters`

Create a new chapter in a track.

**Access:** Admin.
Chapter `code` must be unique within the track.

```ts
// Request
{
  trackId: string,
  code: string,
  title: string
}

// Response 201
{
  ok: true,
  data: {
    id: string,
    trackId: string,
    code: string,
    title: string,
    status: "draft",
    order: number,
    script: null,
    textUrl: null
  }
}
```

New chapters start as `draft` with auto-assigned order.

### `PUT /v1/tracks/:trackId/chapters/order`

Replace the full chapter order for one track.

**Access:** Admin.

```ts
// Request
{
  ids: string[]
}

// Response 200
{
  ok: true,
  data: Array<{
    id: string,
    trackId: string,
    code: string,
    title: string,
    status: "draft" | "published",
    order: number,
    script: "te" | "sa" | "en" | null,
    textUrl: string | null
  }>
}
```

The request must include every chapter in the track exactly once.

### `PATCH /v1/chapters/:chapterId`

Update chapter metadata or status.

**Access:** Admin.

```ts
// Request (all fields optional)
{
  title?: string,
  code?: string,
  status?: "draft" | "published",
  trackId?: string
}

// Response 200
{
  ok: true,
  data: {
    id: string,
    trackId: string,
    code: string,
    title: string,
    status: "draft" | "published",
    order: number,
    script: "te" | "sa" | "en" | null,
    textUrl: string | null
  }
}
```

---

## Chapter Text

Chapter text is stored directly on `chapter` as `script` and an internal text object key. API responses expose that field as `textUrl`, resolved to a fresh download URL. There is no revision table in the current code.

### `POST /v1/chapters/:chapterId/script/presign`

Create a pending staged upload and get a presigned R2 URL for uploading the chapter text file.

**Access:** Admin.

```ts
// Request
{
  contentType?: "text/plain" // default "text/plain"
}

// Response 200
{
  ok: true,
  data: {
    uploadUrl: string,
    uploadId: string,
    expiresAt: string
  }
}
```

### `POST /v1/chapters/:chapterId/script`

Complete a staged text upload and apply it to the chapter. Existing segments for the chapter are deleted.

**Access:** Admin.

```ts
// Request
{
  uploadId: string,
  script: "te" | "sa" | "en"
}

// Response 200
{
  ok: true,
  data: {
    id: string,
    trackId: string,
    code: string,
    title: string,
    status: "draft" | "published",
    order: number,
    script: "te" | "sa" | "en",
    textUrl: string
  }
}
```

---

## Segments

### `GET /v1/chapters/:chapterId/segments`

List segments for a chapter, ordered by start offset.

**Access:** School members with `content:read`. Draft chapters require `draft:read`.

```ts
// Response 200
{
  ok: true,
  data: Array<{
    id: string,
    chapterId: string,
    start: number,
    end: number
  }>
}
```

### `PUT /v1/chapters/:chapterId/segments`

Replace all segments for a chapter. This is a full replacement — the server deletes existing segments and inserts the new set. The server validates that segments don't overlap.

**Access:** Admin.

```ts
// Request
{
  segments: Array<{
    start: number,
    end: number
  }>
}

// Response 200
{
  ok: true,
  data: Array<{
    id: string,
    chapterId: string,
    start: number,
    end: number
  }>
}
```

Server-assigned UUIDs replace any client-side draft IDs. Replacing segments cascades: audio mappings referencing deleted segments are also removed.

---

## Audio

### `POST /v1/chapters/:chapterId/audio/presign`

Create a pending staged upload and get a presigned R2 URL for uploading an audio file.

**Access:** Admin.

```ts
// Request
{
  contentType: string
}

// Response 200
{
  ok: true,
  data: {
    uploadUrl: string,
    uploadId: string,
    expiresAt: string
  }
}
```

The client uploads directly to R2 using the presigned URL, then calls `POST /v1/chapters/:chapterId/audio` with `uploadId` to complete the staged upload and register the asset.

### `POST /v1/chapters/:chapterId/audio`

Complete a staged audio upload and register an audio asset after the R2 upload completes.

**Access:** Admin.

```ts
// Request
{
  uploadId: string,
  label?: string,
  duration: number
}

// Response 201
{
  ok: true,
  data: {
    id: string,
    chapterId: string,
    label: string | null,
    url: string,
    objectKey: string,
    duration: number
  }
}
```

### `DELETE /v1/chapters/:chapterId/audio/:audioId`

Remove an audio asset. Cascades to delete all audio mappings referencing this asset. The R2 object is also deleted.

**Access:** Admin.

```ts
// Response 204
// No response body
```

---

## Audio Mappings

### `PUT /v1/audio/:audioId/mappings`

Replace all mappings for an audio asset. Full replacement — the server validates that all referenced segments exist and that time ranges don't overlap.

**Access:** Admin.

```ts
// Request
{
  mappings: Array<{
    segmentId: string,
    audioStart: number,
    audioEnd: number
  }>
}

// Response 200
{
  ok: true,
  data: Array<{
    segmentId: string,
    audioAssetId: string,
    audioStart: number,
    audioEnd: number
  }>
}
```

---

## Batches

### `GET /v1/batches`

List batches. Admins see all batches. Users see only batches they are enrolled in.

**Access:** All school members.

**Query params:** `?status=active`, `?cursor=`, `?limit=`

```ts
// Response 200
{
  ok: true,
  data: {
    items: Array<{
      id: string,
      code: string,
      trackId: string,
      startDate: string | null,
      status: "active" | "completed" | "upcoming",
      scheduledAt: string | null,
      meetingUrl: string | null
    }>,
    nextCursor: string | null
  }
}
```

### `GET /v1/batches/:batchId`

Batch detail with enrolled members.

**Access:** Admin, or enrolled members of this batch.

```ts
// Response 200
{
  ok: true,
  data: {
    id: string,
    code: string,
    trackId: string,
    startDate: string | null,
    status: "active" | "completed" | "upcoming",
    scheduledAt: string | null,
    meetingUrl: string | null,
    members: Array<{
      userId: string,
      userName: string,
      userEmail: string,
      role: "instructor" | "ta" | "student",
      phone: string | null,
      city: string | null,
      joinedAt: string | null
    }>
  }
}
```

### `POST /v1/batches`

Create a batch.

**Access:** Admin.

```ts
// Request
{
  code: string,
  trackId: string,
  startDate?: string,
  scheduledAt?: string,
  meetingUrl?: string
}

// Response 201
{
  ok: true,
  data: {
    id: string,
    code: string,
    trackId: string,
    startDate: string | null,
    status: "upcoming",
    scheduledAt: string | null,
    meetingUrl: string | null
  }
}
```

New batches start as `upcoming`.

### `PATCH /v1/batches/:batchId`

Update batch metadata. Setting `status` to `"completed"` also ends the batch's students' active seats (their enrollments become `inactive`), so they can join their next batch in the course; staff enrollments are unaffected.

**Access:** Admin.

```ts
// Request (all fields optional)
{
  code?: string,
  status?: "active" | "completed" | "upcoming",
  startDate?: string,
  scheduledAt?: string,
  meetingUrl?: string
}

// Response 200
{
  ok: true,
  data: {
    id: string,
    code: string,
    trackId: string,
    courseId: string,       // the track's course; never set by the client
    startDate: string | null,
    status: "active" | "completed" | "upcoming",
    scheduledAt: string | null,
    meetingUrl: string | null
  }
}
```

---

## Enrollment

### `POST /v1/batches/:batchId/members`

Add a member to a batch.

**Access:** Admin, or Instructor/TA in this batch.

```ts
// Request
{
  userId: string,
  role: "instructor" | "ta" | "student"
}

// Response 201
{
  ok: true,
  data: {
    userId: string,
    batchId: string,
    phone: string | null,
    city: string | null,
    role: "instructor" | "ta" | "student",
    joinedAt: string | null
  }
}
```

Returns `409 CONFLICT` if the user is already enrolled in this batch — or, for a student, if they already hold an `active` seat in another batch of the same course (a student has at most one live batch per course). Putting a student back from a break fails the same way if they have since joined another batch in the course.

### `DELETE /v1/batches/:batchId/members/:userId`

Remove a member from a batch.

**Access:** Admin, or Instructor/TA in this batch.

```ts
// Response 204
// No response body
```

---

## Evaluations

### `POST /v1/batches/:batchId/evaluations`

Create an evaluation for a student on a chapter.

**Access:** Instructor/TA in this batch.

```ts
// Request
{
  studentId: string,
  chapterId: string,
  level: ProficiencyLevel,
  notes?: string
}

// Response 201
{
  ok: true,
  data: {
    id: string,
    studentId: string,
    chapterId: string,
    level: ProficiencyLevel,
    notes: string | null,
    evaluatorId: string,
    evaluatedAt: string
  }
}
```

`evaluatorId` and `evaluatedAt` are set server-side.

### `GET /v1/batches/:batchId/evaluations`

List evaluation history for a batch.

**Access:** Admin, or Instructor/TA in this batch.

**Query params:** `?cursor=`, `?limit=`

```ts
// Response 200
{
  ok: true,
  data: {
    items: Array<{
      id: string,
      studentId: string,
      chapterId: string,
      level: ProficiencyLevel,
      notes: string | null,
      evaluatorId: string,
      evaluatedAt: string
    }>,
    nextCursor: string | null
  }
}
```

Results are ordered by `evaluatedAt` descending.

### `GET /v1/batches/:batchId/evaluations/:studentId`

List evaluation history for one student in a batch.

**Access:** The student can read their own evaluations. Instructor/TA in the batch can read any student's evaluations.

**Query params:** `?cursor=`, `?limit=`

```ts
// Response 200
{
  ok: true,
  data: {
    items: Array<{
      id: string,
      studentId: string,
      chapterId: string,
      level: ProficiencyLevel,
      notes: string | null,
      evaluatorId: string,
      evaluatedAt: string
    }>,
    nextCursor: string | null
  }
}
```

Results are ordered by `evaluatedAt` descending.

---

## Courses

### `GET /v1/courses`

Every course in the school. Needs `X-School-Slug`; no session (the public registration page is course-specific too). Not limited by `X-Course-Slug` — it is the list a course switcher needs.

```ts
// Response 200
{ ok: true, data: { items: Array<{ id: string, slug: string, name: string }> } }
```

---

## Exams

### `GET /v1/exams`

List exam sittings. Students see their own. Instructors/TAs also see sittings for students in
batches they teach. Super-admins see all.

**Access:** Authenticated school member.

**Query params:** `?status=scheduled`, `?cursor=`, `?limit=`

```ts
type ExamResult = {
  examId: string,
  aksharaShuddhi: number,        // 0–50
  swaraShuddhi: number,          // 0–30
  niyantranaAnargalata: number,  // 0–20
  shraavyata: number,            // 0–5
  pratishakyaGrammar: number,    // 0–5
  childrenBonus: 0 | 5 | 10,     // derived from year of birth
  total: number,                 // up to 120
  outcome: "athiUttamam" | "prathamaSreni" | "dwitiyaSreni" | "level2" | "level1" | "reappear",
  level: ProficiencyLevel | null, // what the outcome grants; null for "reappear"
  notes: string | null,
  evaluatorId: string,
  evaluatedAt: string
}

// Response 200
{
  ok: true,
  data: {
    items: Array<{
      id: string,
      trackId: string,
      studentId: string,
      batchId: string,
      scheduledAt: string,
      status: "scheduled" | "inProgress" | "completed" | "cancelled",
      track: { id: string, name: string },
      result: ExamResult | null      // null until the sitting is completed
    }>,
    nextCursor: string | null
  }
}
```

### `GET /v1/exams/:examId`

One sitting, same shape as a list item.

### `POST /v1/exams`

Schedule a track exam for a student.

**Access:** Super Admin, or Instructor/TA in the batch the student is enrolled in for that track.

```ts
// Request
{
  studentId: string,
  trackId: string,
  scheduledAt: string
}

// Response 201
{
  ok: true,
  data: {
    id: string,
    trackId: string,
    studentId: string,
    batchId: string,
    scheduledAt: string,
    status: "scheduled"
  }
}
```

### `PATCH /v1/exams/:examId`

Update a sitting (reschedule, change status). A sitting is completed only by recording a result.

**Access:** Super Admin, or Instructor/TA in the sitting's batch.

```ts
// Request (all fields optional)
{
  scheduledAt?: string,
  status?: "scheduled" | "inProgress" | "cancelled"
}

// Response 200 — the bare sitting, as for POST
```

### `POST /v1/exams/:examId/results`

Grade a sitting. Completes it, stores the marks, and — when the outcome grants a level — writes that
level as a new evaluation on every published chapter of the track.

**Access:** School admin only.

```ts
// Request — whole marks only; the children's bonus, total, outcome and level are derived by the
// server and any value sent for them is ignored
{
  aksharaShuddhi: number,        // 0–50
  swaraShuddhi: number,          // 0–30
  niyantranaAnargalata: number,  // 0–20
  shraavyata: number,            // 0–5
  pratishakyaGrammar: number,    // 0–5
  notes?: string
}

// Response 200 — the completed sitting, with its result
```

Errors: `409` if the sitting is already completed or cancelled (or another result won a race);
`422` if the student has no year of birth on file, since the children's bonus can't be worked out.

The outcome is set by the total (marks plus the bonus): 105+ Athi Uttamam (L4 with the
distinction), 95–104 Prathama Sreni (L4), 85–94 Dwitiya Sreni (L3), 75–84 L2, 65–74 L1, below 65
Reappear (no level, and no chapter is touched). Unlike a teacher's evaluation, a result may lower a
chapter's grade.

---

## Student

### `GET /v1/student/chapters/:chapterId`

Chapter content optimized for the student learning view. Only returns published chapters.

**Access:** Student (must be enrolled in a batch whose track contains this chapter).

```ts
// Response 200
{
  ok: true,
  data: {
    id: string,
    trackId: string,
    code: string,
    title: string,
    status: "published",
    order: number,
    textUrl: string | null,
    script: "te" | "sa" | "en" | null,
    segments: Array<{
      id: string,
      chapterId: string,
      start: number,
      end: number
    }>,
    audioAssets: Array<{
      id: string,
      chapterId: string,
      label: string | null,
      url: string,
      duration: number,
      audioMappings: Array<{
        segmentId: string,
        audioAssetId: string,
        audioStart: number,
        audioEnd: number
      }>,
    }>,
    currentLevel: ProficiencyLevel | null
  }
}
```

`currentLevel` is the student's most recent evaluation level for this chapter, or `null` when no evaluation exists.
