# Courses

A school runs one or more courses (Vedam, Smartam, …). A course owns its tracks, and through them its
chapters, batches, exams and evaluations. Courses are seeded, not managed from the app. The data model
and the one-active-batch-per-course rule are in `data-model.md`; this doc is how the app knows which
course you are in.

## Which course a request is about

`X-Course-Slug`, resolved by one rule everywhere (`apps/api/src/courses/service.ts`):

| Request | Result |
| --- | --- |
| names a course | that course (`404` if there is no such course) |
| names none | `400` — the header is required |

There is no default — not even for a school with a single course. A rule that changed with the number of
courses would break every client that never sent the header the day a second course was added, and a
forgotten header fails loudly instead of quietly showing (or filing under) the wrong course. The web app
always sends it, because every page that makes these requests is under `/<course>/…`.

These lists are limited to the course: tracks, batches (accessible, open, per-profile), the
dashboard and profile detail (batches, marks, exams, results, pending requests), exams, enrollment
requests, registrations.

## Courses are a content gate

A course's **content** — its tracks and chapters — can only be read by someone who is part of it:

- **Part of a course** means the caller's profile has an enrollment in it (any status — a finished batch
  is still your record) or was created from a registration for it. An admin is part of every course. This
  is the one rule behind both `GET /me/courses` (what the dropdown offers) and the gate; a test holds them
  together (`courses/contentGate.integration.test.ts`).
- **By id** (`GET /tracks/:id`, `GET /chapters/:id`): content in a course you're not part of is a **`404`**,
  the same as if it didn't exist, so guessing an id discloses nothing — the way a draft chapter already
  behaves. The **content decides, not the header**: sending `x-course-slug: vedam` for a Smartam chapter
  changes nothing.
- **By course** (`GET /tracks`, `GET /me/dashboard`, `GET /profiles/:id/detail`, which carry a course's
  track catalogue): naming a course you're not part of is a **`403`** — the request said which course it
  wants, so "not yours" reveals nothing new.
- A caller with no active profile who isn't an admin is part of nothing, so they read no course content.
- **Batches, enrollments, exams and evaluations need no separate gate:** they are already limited by the
  caller's batch roles, and a batch belongs to exactly one course. Writes to content are admin-only.
- **Not covered:** audio files themselves. A chapter response carries signed download URLs; anyone who
  was handed one can fetch the file until it expires. The gate is on the chapter, not the bucket.

Anything else with an id (`/batches/:id`, `/exams/:id`, …) is unchanged: the header is context, and batch
and school roles decide who may open it.

## Where the course lives in the web app

In the URL, always as the first path segment after the school:

```
<school slug>.naradas.app/<course slug>/<route segments>
                          /vedam/dashboard    /vedam/admin/batches/V-12    /smartam/register
```

The address is the only place the course is kept, so what a page shows and what its requests ask for
cannot disagree — two tabs can be in two courses, and a shared link opens the course it names. The web
client sends the course from the address as `x-course-slug` on every API call, the way the school
reaches the API as `x-school-slug`. (It is read from `window.location` at request time, not held in
state, so it is never stale.)

- **Reserved words.** A course slug can't be one of the app's own top-level routes (`login`, `register`,
  `dashboard`, `admin`, `settings`, …), or `/<course>/…` would be ambiguous. The list is
  `packages/db/src/courseSlug.ts`; it is enforced by a `CHECK` on `course.slug` and by the importer, and
  a web test fails if a new top-level route is added without reserving it.
- **`/`** sends a signed-in person into their course: one course goes straight to `/<course>/dashboard`,
  several get a chooser, none is told so. Signed out it is `/login`. It uses `GET /me/courses`.
- **`/<course>/…`** first checks the course exists (`GET /courses/:slug`; an unknown one gets a "no
  course called …" page). The signed-in pages then check the person is part of it (`GET /me/courses`);
  if not, they are told so and shown the courses they are part of. The API enforces the same rule on
  content (see "Courses are a content gate"), so this page is the friendly face of a real check.
- **The header** shows the course beside the wordmark, with a dropdown when you have more than one.
  Switching is a full page load to that course's dashboard, so nothing cached for one course can appear
  under another.
- **Who sees which courses:** an admin sees all; anyone else sees the courses their profile is part of
  (an enrollment in any status, or the registration that created the profile).
- **Outside a course:** `/login`, `/link-device`, `/register` (a chooser, or straight to the form for a
  one-course school), and `/settings/approve-device` (where a new device's QR code points — it is about
  the person's account, not a course).

## Registration links

Each course has its own link: `/vedam/register`. The course is in the address, so an application can't
be filed under some other course. `GET /courses` and `GET /courses/:slug` are public for this reason.

## Adding a course

1. Insert a `course` row (`slug` is the first path segment of every page in the course, so it must not be a reserved word — see above).
2. Create its tracks and batches (a batch's course is its track's).
3. Its registration link is `/<slug>/register`; people already enrolled elsewhere see it in their
   dropdown once they have an enrollment in it.

## Not decided yet

How a **staff member with no batch** (an admin is fine — they see every course) gets into a course. A
non-admin is part of a course only through an enrollment or their own registration, so an instructor
who hasn't been given a batch yet reads no content and, at `/`, is told they are not in a course.
