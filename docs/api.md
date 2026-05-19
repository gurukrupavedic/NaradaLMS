# API Design

This document defines the HTTP API for the Narada LMS backend. See [data-model.md](data-model.md) for the underlying schema and role system.

## Conventions

**Base URL:** All routes are prefixed with `/v1`.

**School context:** Each school is accessed via its subdomain (`<slug>.narada.com`). A DNS rewrite proxies this to the API with an `X-School-Id` header. Middleware resolves the school, sets the Postgres `search_path` to the school's schema, and attaches the school context to the request. Routes under `/v1/schools` are the exception — they operate on the shared schema and require super-admin access.

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
    code: string,   // machine-readable, e.g. "CHAPTER_NOT_FOUND"
    message: string  // human-readable
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

| HTTP Status | Code | Meaning |
|-------------|------|---------|
| 400 | `VALIDATION_ERROR` | Request body or params failed validation |
| 401 | `UNAUTHORIZED` | No valid session |
| 403 | `FORBIDDEN` | Valid session but insufficient role/permission |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Duplicate or state conflict (e.g. duplicate enrollment) |
| 422 | `UNPROCESSABLE` | Valid request but domain rules prevent it |

---

## Auth

BetterAuth handles signup, login, and session management. These routes handle the Narada-specific profile layer.

### `POST /v1/auth/register`

Create a school profile for the authenticated user. Called after BetterAuth signup when the user first accesses a school.

**Access:** Authenticated user without an existing profile in this school.

```ts
// Request
{
  name: string,
  phone?: string,
  city?: string
}

// Response 201
{
  ok: true,
  data: {
    profile: {
      id: string,
      userId: string,
      name: string,
      phone: string | null,
      city: string | null,
      role: "user"
    }
  }
}
```

New profiles default to `role: "user"`. Admin role is assigned by an existing admin or super-admin.

### `GET /v1/auth/me`

Return the current user's profile and role within this school.

**Access:** Authenticated user with a profile in this school.

```ts
// Response 200
{
  ok: true,
  data: {
    profile: {
      id: string,
      userId: string,
      name: string,
      phone: string | null,
      city: string | null,
      role: "admin" | "user"
    },
    isSuperAdmin: boolean
  }
}
```

---

## Schools

Operate on the shared schema. Require super-admin access. Not scoped to `X-School-Id`.

### `GET /v1/schools`

List all schools.

**Access:** Super Admin.

```ts
// Response 200
{
  ok: true,
  data: {
    items: Array<{
      id: string,
      name: string,
      slug: string
    }>
  }
}
```

### `POST /v1/schools`

Create a school and provision its database schema.

**Access:** Super Admin.

```ts
// Request
{
  name: string,
  slug: string
}

// Response 201
{
  ok: true,
  data: {
    school: {
      id: string,
      name: string,
      slug: string
    }
  }
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
    school: {
      id: string,
      name: string,
      slug: string
    }
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
  data: {
    items: Array<{
      id: string,
      name: string,
      order: number,
      chapters: Array<{
        id: string,
        code: string,
        title: string,
        status: "draft" | "published",
        order: number
      }>
    }>
  }
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
    track: {
      id: string,
      name: string,
      order: number,
      chapters: Array<{
        id: string,
        code: string,
        title: string,
        status: "draft" | "published",
        order: number
      }>
    }
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
    track: {
      id: string,
      name: string,
      order: number
    }
  }
}
```

Order is auto-assigned as the next value.

### `PATCH /v1/tracks/:trackId`

Update track metadata or reorder.

**Access:** Admin.

```ts
// Request (all fields optional)
{
  name?: string,
  order?: number
}

// Response 200
{
  ok: true,
  data: {
    track: {
      id: string,
      name: string,
      order: number
    }
  }
}
```

---

## Chapters

### `GET /v1/chapters/:chapterId`

Full chapter with current revision, segments, audio assets, and mappings.

**Access:** All school members. Students can only access published chapters.

```ts
// Response 200
{
  ok: true,
  data: {
    chapter: {
      id: string,
      trackId: string,
      code: string,
      title: string,
      status: "draft" | "published",
      order: number,
      currentRevision: {
        id: string,
        script: "te" | "sa" | "en",
        textUrl: string,
        revision: number,
        createdAt: string
      } | null,
      segments: Array<{
        id: string,
        start: number,
        end: number
      }>,
      audioAssets: Array<{
        id: string,
        label: string | null,
        url: string,
        duration: number
      }>,
      audioMappings: Array<{
        segmentId: string,
        audioAssetId: string,
        audioStart: number,
        audioEnd: number
      }>
    }
  }
}
```

`currentRevision` is the revision with the highest `revision` number. `segments` and `audioMappings` are for the current revision only.

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
    chapter: {
      id: string,
      trackId: string,
      code: string,
      title: string,
      status: "draft",
      order: number
    }
  }
}
```

New chapters start as `draft` with auto-assigned order.

### `PATCH /v1/chapters/:chapterId`

Update chapter metadata or status.

**Access:** Admin.

```ts
// Request (all fields optional)
{
  title?: string,
  code?: string,
  status?: "draft" | "published",
  order?: number,
  trackId?: string
}

// Response 200
{
  ok: true,
  data: {
    chapter: {
      id: string,
      trackId: string,
      code: string,
      title: string,
      status: "draft" | "published",
      order: number
    }
  }
}
```

---

## Chapter Revisions

### `GET /v1/chapters/:chapterId/revisions`

List all revisions for a chapter.

**Access:** Admin.

```ts
// Response 200
{
  ok: true,
  data: {
    items: Array<{
      id: string,
      script: "te" | "sa" | "en",
      textUrl: string,
      revision: number,
      createdAt: string
    }>
  }
}
```

### `POST /v1/chapters/:chapterId/revisions`

Upload new chapter text and create a revision. The text file is uploaded to R2 and a new revision row is created with an incremented revision number.

**Access:** Admin.

```ts
// Request (multipart/form-data)
// Fields:
//   script: "te" | "sa" | "en"
//   file: text file

// Response 201
{
  ok: true,
  data: {
    revision: {
      id: string,
      script: "te" | "sa" | "en",
      textUrl: string,
      revision: number,
      createdAt: string
    }
  }
}
```

---

## Segments

### `GET /v1/revisions/:revisionId/segments`

List segments for a revision, ordered by start offset.

**Access:** All school members.

```ts
// Response 200
{
  ok: true,
  data: {
    items: Array<{
      id: string,
      start: number,
      end: number
    }>
  }
}
```

### `PUT /v1/revisions/:revisionId/segments`

Replace all segments for a revision. This is a full replacement — the server deletes existing segments and inserts the new set. The server validates that segments don't overlap and are within text bounds.

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
  data: {
    items: Array<{
      id: string,
      start: number,
      end: number
    }>
  }
}
```

Server-assigned UUIDs replace any client-side draft IDs. Replacing segments cascades: audio mappings referencing deleted segments are also removed.

---

## Audio

### `POST /v1/chapters/:chapterId/audio/upload-url`

Get a presigned R2 URL for uploading an audio file.

**Access:** Admin.

```ts
// Request
{
  filename: string,
  contentType: string
}

// Response 200
{
  ok: true,
  data: {
    uploadUrl: string,
    objectKey: string
  }
}
```

The client uploads directly to R2 using the presigned URL, then calls `POST /audio` to register the asset.

### `POST /v1/chapters/:chapterId/audio`

Register an uploaded audio asset after the R2 upload completes.

**Access:** Admin.

```ts
// Request
{
  objectKey: string,
  label?: string,
  duration: number
}

// Response 201
{
  ok: true,
  data: {
    audioAsset: {
      id: string,
      label: string | null,
      url: string,
      duration: number
    }
  }
}
```

### `DELETE /v1/chapters/:chapterId/audio/:audioId`

Remove an audio asset. Cascades to delete all audio mappings referencing this asset. The R2 object is also deleted.

**Access:** Admin.

```ts
// Response 204
{
  ok: true,
  data: null
}
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
  data: {
    items: Array<{
      segmentId: string,
      audioAssetId: string,
      audioStart: number,
      audioEnd: number
    }>
  }
}
```

---

## Batches

### `GET /v1/batches`

List batches. Admins see all batches. Users see only batches they are enrolled in.

**Access:** All school members.

**Query params:** `?status=active,upcoming` (comma-separated filter), `?cursor=`, `?limit=`

```ts
// Response 200
{
  ok: true,
  data: {
    items: Array<{
      id: string,
      code: string,
      trackId: string,
      trackName: string,
      startDate: string | null,
      status: "active" | "completed" | "upcoming",
      scheduledAt: string | null,
      meetingUrl: string | null,
      memberCount: number
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
    batch: {
      id: string,
      code: string,
      trackId: string,
      trackName: string,
      startDate: string | null,
      status: "active" | "completed" | "upcoming",
      scheduledAt: string | null,
      meetingUrl: string | null,
      members: Array<{
        userId: string,
        name: string,
        role: "instructor" | "ta" | "student",
        status: "active" | "inactive" | "completed",
        joinedAt: string
      }>
    }
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
    batch: {
      id: string,
      code: string,
      trackId: string,
      trackName: string,
      startDate: string | null,
      status: "upcoming",
      scheduledAt: string | null,
      meetingUrl: string | null
    }
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
  scheduledAt?: string | null,
  meetingUrl?: string | null
}

// Response 200
{
  ok: true,
  data: {
    batch: {
      id: string,
      code: string,
      trackId: string,
      trackName: string,
      startDate: string | null,
      status: "active" | "completed" | "upcoming",
      scheduledAt: string | null,
      meetingUrl: string | null
    }
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
    member: {
      userId: string,
      name: string,
      role: "instructor" | "ta" | "student",
      status: "active",
      joinedAt: string
    }
  }
}
```

Returns `409 CONFLICT` if the user is already enrolled in this batch.

### `DELETE /v1/batches/:batchId/members/:userId`

Remove a member from a batch.

**Access:** Admin, or Instructor/TA in this batch.

```ts
// Response 204
{
  ok: true,
  data: null
}
```

---

## Batch Matrix

### `GET /v1/batches/:batchId/matrix`

Student-by-chapter proficiency grid. Returns the current (most recent) proficiency level for each student-chapter pair.

**Access:** Admin, or Instructor/TA in this batch.

```ts
// Response 200
{
  ok: true,
  data: {
    chapters: Array<{
      id: string,
      code: string,
      title: string
    }>,
    students: Array<{
      userId: string,
      name: string
    }>,
    cells: Array<{
      studentId: string,
      chapterId: string,
      level: ProficiencyLevel
    }>
  }
}
```

`ProficiencyLevel` is one of: `"notStarted"`, `"practicing"`, `"level1"`, `"level2"`, `"level3"`, `"level4"`, `"absent"`.

Only students with `enrollment.role = "student"` appear in the matrix. Only published chapters in the batch's track are included.

---

## Evaluations

### `POST /v1/evaluations`

Create an evaluation for a student on a chapter.

**Access:** Admin, or Instructor/TA evaluating a student in their own batch.

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
    evaluation: {
      id: string,
      studentId: string,
      chapterId: string,
      level: ProficiencyLevel,
      notes: string | null,
      evaluatorId: string,
      evaluatedAt: string
    }
  }
}
```

`evaluatorId` and `evaluatedAt` are set server-side.

### `GET /v1/evaluations`

Query evaluation history.

**Access:** Admin sees all. Instructor/TA see evaluations for students in their batches. Students see only their own.

**Query params:** `?studentId=`, `?chapterId=`, `?cursor=`, `?limit=`

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

**Query params:** `?status=scheduled,completed` (comma-separated), `?cursor=`, `?limit=`

```ts
// Response 200
{
  ok: true,
  data: {
    items: Array<{
      id: string,
      batchId: string,
      studentId: string,
      studentName: string,
      scheduledAt: string,
      status: "scheduled" | "in_progress" | "completed" | "cancelled"
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
  scheduledAt: string,
  chapterIds: string[]
}

// Response 201
{
  ok: true,
  data: {
    exam: {
      id: string,
      batchId: string,
      studentId: string,
      scheduledAt: string,
      status: "scheduled",
      chapters: Array<{
        id: string,
        code: string,
        title: string
      }>
    }
  }
}
```

`chapterIds` determines which chapters will be examined. Exam results are recorded per chapter.

### `PATCH /v1/exams/:examId`

Update an exam (reschedule, change status).

**Access:** Admin, or Instructor/TA in the exam's batch.

```ts
// Request (all fields optional)
{
  scheduledAt?: string,
  status?: "scheduled" | "in_progress" | "completed" | "cancelled"
}

// Response 200
{
  ok: true,
  data: {
    exam: {
      id: string,
      batchId: string,
      studentId: string,
      scheduledAt: string,
      status: "scheduled" | "in_progress" | "completed" | "cancelled"
    }
  }
}
```

### `POST /v1/exams/:examId/results`

Record results for an exam. Creates one evaluation per chapter and links them to the exam via `exam_result`.

**Access:** Admin, or Instructor/TA in the exam's batch.

```ts
// Request
{
  results: Array<{
    chapterId: string,
    level: ProficiencyLevel,
    notes?: string
  }>
}

// Response 201
{
  ok: true,
  data: {
    results: Array<{
      chapterId: string,
      evaluationId: string,
      level: ProficiencyLevel
    }>
  }
}
```

Each result creates an `evaluation` row and an `exam_result` row linking it to the exam. The exam's status is automatically set to `"completed"`.

---

## Student Dashboard

### `GET /v1/student/dashboard`

Aggregated view of the student's enrolled batches, track progress, and upcoming exams.

**Access:** Student (own data only).

```ts
// Response 200
{
  ok: true,
  data: {
    batches: Array<{
      id: string,
      code: string,
      trackName: string,
      status: "active" | "completed" | "upcoming",
      role: "student",
      progress: number,
      chapters: Array<{
        id: string,
        code: string,
        title: string,
        level: ProficiencyLevel
      }>
    }>,
    nextClass: {
      batchCode: string,
      trackName: string,
      scheduledAt: string,
      meetingUrl: string | null
    } | null,
    upcomingExams: Array<{
      id: string,
      batchCode: string,
      scheduledAt: string,
      chapters: Array<{
        id: string,
        code: string,
        title: string
      }>
    }>,
    recentEvaluations: Array<{
      chapterId: string,
      chapterCode: string,
      chapterTitle: string,
      level: ProficiencyLevel,
      evaluatedAt: string
    }>
  }
}
```

`progress` is the percentage of published chapters in the track where the student's current proficiency is beyond `notStarted` and `absent`.

### `GET /v1/student/chapters/:chapterId`

Chapter content optimized for the student learning view. Only returns published chapters.

**Access:** Student (must be enrolled in a batch whose track contains this chapter).

```ts
// Response 200
{
  ok: true,
  data: {
    chapter: {
      id: string,
      code: string,
      title: string,
      textUrl: string,
      script: "te" | "sa" | "en",
      segments: Array<{
        id: string,
        start: number,
        end: number
      }>,
      audioAssets: Array<{
        id: string,
        label: string | null,
        url: string,
        duration: number
      }>,
      audioMappings: Array<{
        segmentId: string,
        audioAssetId: string,
        audioStart: number,
        audioEnd: number
      }>,
      currentLevel: ProficiencyLevel
    }
  }
}
```

`currentLevel` is the student's most recent evaluation level for this chapter, defaulting to `"notStarted"`.
