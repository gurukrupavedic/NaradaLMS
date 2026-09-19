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
| names none, school has **one** course | that course |
| names none, school has **several** | `422` — the caller has to say which |
| names none, school has **none** | no course; reads are simply empty |

So a single-course school (SLMTS today) works without the app sending anything, and a multi-course school
can never show a mixed view by accident.

With a course, these lists are limited to it: tracks, batches (accessible, open, per-profile), the
dashboard and profile detail (batches, marks, exams, results, pending requests), exams, enrollment
requests, registrations. **By-id endpoints are not** (`/batches/:id`, `/chapters/:id`, …): the header is
context, not authorization — batch roles and school roles still decide what anyone may open. Tracks and
chapters are readable by any school member, as before.

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
  if not, they are told so and shown the courses they are part of. This is a courtesy, not a lock — see
  "Which course a request is about": access to records is still decided by batch and school roles.
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

Whether a course is a **content boundary**. Today any school member can open any published track or
chapter by id, whatever course it is in. Making a student's access follow their enrollment is an
access-policy change, separate from scoping lists.
