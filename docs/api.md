# API Design

This document defines the HTTP API for the Narada LMS backend. See [data-model.md](data-model.md) for the underlying schema and role system.

## Conventions

**Base URL:** All routes are prefixed with `/v1`.

**School context:** Each school is accessed by sending `X-School-Slug`. Middleware resolves the school, sets the Postgres `search_path` to the school's schema, and attaches the school context to the request. Routes under `/v1/schools` are the exception — they operate on the shared schema and require super-admin access.

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

School creation is currently an operator action, not an HTTP endpoint. Use
`SCHOOL_NAME="..." SCHOOL_SLUG="..." pnpm schools:create` to create a school and provision
its database schema.

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

Get a presigned R2 URL for uploading the chapter text file. Each response uses a fresh object key under the chapter's text prefix.

**Access:** Admin.

```ts
// Response 200
{
  ok: true,
  data: {
    uploadUrl: string,
    objectKey: string
  }
}
```

### `POST /v1/chapters/:chapterId/script`

Apply an uploaded text object to the chapter. Existing segments for the chapter are deleted.

**Access:** Admin.

```ts
// Request
{
  objectKey: string,
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

Get a presigned R2 URL for uploading an audio file.

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
    uploadId: string
  }
}
```

The client uploads directly to R2 using the presigned URL, then calls `POST /v1/chapters/:chapterId/audio` to register the asset.

### `POST /v1/chapters/:chapterId/audio`

Register an uploaded audio asset after the R2 upload completes.

**Access:** Admin.

```ts
// Request
{
  uploadId: string,
  label?: string,
  duration: number
}

// Response 201 for a new asset, 200 for an idempotent retry
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
      status: "active" | "inactive" | "completed",
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

Update batch metadata.

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
    status: "active",
    joinedAt: string | null
  }
}
```

Returns `409 CONFLICT` if the user is already enrolled in this batch.

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

## Exams

### `GET /v1/batches/:batchId/exams`

List exams for a batch. Students only see their own exams.

**Access:** Admin, Instructor/TA in this batch, or Student (own exams only).

**Query params:** `?status=scheduled`, `?cursor=`, `?limit=`

```ts
// Response 200
{
  ok: true,
  data: {
    items: Array<{
      id: string,
      batchId: string,
      studentId: string,
      scheduledAt: string,
      status: "scheduled" | "inProgress" | "completed" | "cancelled"
    }>,
    nextCursor: string | null
  }
}
```

### `POST /v1/batches/:batchId/exams`

Schedule an exam for a student.

**Access:** Admin, or Instructor/TA in this batch.

```ts
// Request
{
  studentId: string,
  scheduledAt: string
}

// Response 201
{
  ok: true,
  data: {
    id: string,
    batchId: string,
    studentId: string,
    scheduledAt: string,
    status: "scheduled"
  }
}
```

### `PATCH /v1/batches/:batchId/exams/:examId`

Update an exam (reschedule, change status).

**Access:** Admin, or Instructor/TA in this batch.

```ts
// Request (all fields optional)
{
  scheduledAt?: string,
  status?: "scheduled" | "inProgress" | "completed" | "cancelled"
}

// Response 200
{
  ok: true,
  data: {
    id: string,
    batchId: string,
    studentId: string,
    scheduledAt: string,
    status: "scheduled" | "inProgress" | "completed" | "cancelled"
  }
}
```

### `POST /v1/batches/:batchId/exams/:examId/results`

Record results for an exam. Creates one evaluation per chapter and links them to the exam via `exam_result`.

**Access:** Admin, or Instructor/TA in this batch.

```ts
// Request
Array<{
  chapterId: string,
  level: ProficiencyLevel,
  notes?: string
}>

// Response 200
{
  ok: true,
  data: {
    id: string,
    batchId: string,
    studentId: string,
    scheduledAt: string,
    status: "scheduled" | "inProgress" | "completed" | "cancelled",
    results: Array<{
      examId: string,
      chapterId: string,
      evaluationId: string
    }>
  }
}
```

Each result creates an `evaluation` row and an `exam_result` row linking it to the exam. Recording results does not change the exam status; use `PATCH /v1/batches/:batchId/exams/:examId` to mark an exam as `"completed"`.

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
