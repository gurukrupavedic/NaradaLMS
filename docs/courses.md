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

## How the web app picks a course

The pick is a `narada-course` cookie, sent as `x-course-slug` on every API call, exactly like the selected
profile (`narada-profile-id` → `x-profile-id`). Like that cookie it is shared by every tab; the header always
names the course, so a tab is never ambiguous.

- **`CourseGate`** wraps every signed-in page. Nothing course-scoped loads until a course is settled,
  because a multi-course school refuses a request that names none. It uses the courses from
  `GET /me/courses`: the one you picked, or your only one, or — if you have several and none is
  picked — a chooser. A pick you can no longer see is dropped.
- **The header** shows the course beside the wordmark, with a dropdown when you have more than one.
  Switching reloads the app: cached data is for the course that was selected when it was fetched.
- **Who sees which courses:** an admin sees all; anyone else sees the courses their profile is part of
  (an enrollment in any status, or the registration that created the profile).
- **Sign-out** clears the pick, so the next person on the device chooses their own.

## Registration links

Each course has its own link: `/register/vedam`. The course is taken from the link and sent with the
application, so it can't be filed under whichever course the browser last used. Plain `/register` is the
form itself for a one-course school and a chooser for several. `GET /courses` and `GET /courses/:slug`
are public for this reason.

## Adding a course

1. Insert a `course` row (`slug` is what appears in the registration link and the header).
2. Create its tracks and batches (a batch's course is its track's).
3. Its registration link is `/register/<slug>`; people already enrolled elsewhere see it in their
   dropdown once they have an enrollment in it.

## Not decided yet

Whether a course is a **content boundary**. Today any school member can open any published track or
chapter by id, whatever course it is in. Making a student's access follow their enrollment is an
access-policy change, separate from scoping lists.
