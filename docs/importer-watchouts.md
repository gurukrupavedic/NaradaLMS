# Importer: what to watch out for

> **Temporary.** Written while PR #166 (courses in the URL, a course as a content gate, a required
> course on every scoped read) was open, for whoever works on `tools/src/import-school.ts` next. Fold
> anything still true into `production-import-runbook.md` and delete this file when the importer work
> has merged. Counts below are from the `seed-data/` snapshot at the time (2026-09-19); recompute if
> the spreadsheet is re-parsed.

> **Status (importer rewritten for `seed-data/slmts.xlsx` + `seed-data/rr.xlsx`).** Section 1's fix is now
> built: every registration-sheet row becomes an approved registration, and the dry run refuses any
> profile that would be part of no course. The counts below describe the old single-workbook snapshot —
> see `production-import-runbook.md` for the current ones, and `seed-data/source-data-issues.md` for what needs
> fixing in the spreadsheets first (it and the data are gitignored). Still true and still worth reading: sections 2–4 and 6. Section 7
> changed shape: the two workbooks are **two schools** (`slmts` with course `ved`, `rr` with course
> `pur`), each imported with its own `--slug` from `seed-data/<slug>/`; there is no `--course` flag.

## 1. The blocker: 418 imported people would be locked out

A non-admin can read a course's content (tracks, chapters, the dashboard) only if they are **part of
that course**. "Part of" means, and only means:

- their profile has an **enrollment** in it (any status — a finished or dropped batch still counts), or
- they were created from a **registration** for it (`registration.convertedProfileId = profile.id`).

Admins and owners are part of every course by role. Nobody else is. The rule lives in
`AccessPolicy#canReadCourseContent` and is the same one behind `GET /me/courses` (the course dropdown,
and what `/` uses to decide where to send someone).

**The importer creates no `registration` rows.** It copies each person's registration-sheet details
onto their `profile` and stops. So in the current seed data:

| | profiles |
| --- | --- |
| total | 1,212 |
| with at least one enrollment | 794 — fine |
| **with no enrollment** | **418 — part of no course** |

All 418 have registration metadata (they applied, and were never put in a batch). After import they
would read no content, `/` would tell them "You're not part of a course yet", and they could not
request a batch — every course page is behind that check. Before courses existed they could log in and
ask for a batch.

### The fix (agreed direction, not yet built)

Have the importer create an **approved registration** per person who needs one:
`status = 'approved'`, `courseId` = the course being imported, `convertedProfileId` = their profile.
That is the shape the app produces when an admin approves an application, so the gate and the dropdown
need no change.

The alternative — treat everyone as part of the course whenever the school has exactly one — is less
code, but when a second course is added those people would silently lose the first one.

Decisions to make and things that will bite:

- **Which people?** Only the 418 that need it, or all 1,053 with metadata (635 of which are enrolled
  and don't need it)? Every row shows up under **Approved** in the admin registrations list. Fewer rows
  is less noise; all rows is a truer history.
- **`registration` has NOT NULL columns the source data may not fill.** `firstName`, `lastName`,
  `yearOfBirth`, `phone`. Among the 418: **2 have no `yearOfBirth`** (the column is mandatory because a
  certification exam's children's bonus is computed from it). Decide: skip those two, fix them in the
  source, or give them a value on purpose. Don't let the insert fail halfway.
- **Names:** the source has one `name` string (`"Jane  Q  Doe"`, double spaces and all).
  Registration wants `firstName` and `lastName`, both non-empty. All 418 have at least two words; pick a
  split rule and apply it consistently.
- **Phone format differs by table.** `user.phoneNumber` is E.164 (`+911234567890`); `profile.phone` is
  the raw sheet value without the `+` (`911234567890`). `registration.phone` is validated as E.164 by the
  API (`CreateRegistrationSchema`), so take it from the **user**, not the profile.
- **Shared phones.** 127 users have more than one profile (households sharing one login), and 26
  phone numbers repeat among the 418. `registration.phone` is indexed, not unique, so this is allowed —
  but don't dedupe registrations by phone.
- **Idempotency.** `registration` has no natural unique key. `onConflictDoNothing` only helps if the id
  is deterministic, otherwise a second `--commit` inserts duplicates. The runbook already says Step 6 is
  not safely re-runnable; a new table makes that worse, so either derive the id from the profile id or
  insert only where no registration already points at that profile.
- **Validate against the API's own schema**, as the importer already does for enrollments and
  evaluations: run the would-be registration rows through `RegistrationSchema` /
  `CreateRegistrationSchema` in the dry run so a bad row is named up front, not midway through the
  transaction.
- **`createdAt`** defaults to now. The metadata has a `registrationTimestamp`; use it if the admin list
  should show when people really applied. `reviewedAt` / `reviewedBy` can stay null.

### Add a check that would have caught this

The dry run validates row shape but never asks "can this person reach any content afterwards?". Add:

- **Dry-run validation:** every imported profile must have an enrollment or (once the importer writes
  one) a registration. Name every offender.
- **Step 7 of the runbook:** a query against the school schema (`$SCHEMA` as in the runbook):

```sql
SELECT count(*) FROM "$SCHEMA".profile p
WHERE NOT EXISTS (SELECT 1 FROM "$SCHEMA".enrollment e WHERE e."profileId" = p.id)
  AND NOT EXISTS (SELECT 1 FROM "$SCHEMA".registration r WHERE r."convertedProfileId" = p.id);
-- Expect 0. Anyone left is part of no course and can read no content.
```

Also add `registration` to the Step 7 row counts.

## 2. Rules the database and API already enforce — keep the importer inside them

- **One course per run.** `--course <slug>` (default `vedam`) stamps every track, batch and enrollment.
  The slug is checked by `assertCourseSlug`; the same rule is a `CHECK` on `course.slug` (migration
  0018): lowercase letters, digits and hyphens, and **not a reserved word** (`admin`, `login`,
  `register`, `settings`, …) because the course is the first path segment of every URL. The list is
  `packages/db/src/courseSlug.ts`.
- **Course consistency is enforced by composite foreign keys**: a batch's `courseId` must equal its
  track's, an enrollment's must equal its batch's. The importer stamps them; don't add a path that
  writes them separately.
- **One active student seat per course** (a partial unique index). The dry run already names any student
  with more than one `active` student enrollment. `break`, `dropped` and `inactive` don't hold a seat.
  Seed data: 957 enrollments (716 student / 144 ta / 97 instructor; 623 active / 283 inactive / 51
  break) pass.
- **Silent skips.** Inserts use `onConflictDoNothing` on `batch.code` (unique across the *school*),
  `(chapter.trackId, chapter.code)` and `(track.courseId, track.order)`. A collision drops the row with
  no error, and the final log prints how many rows were *loaded*, not *inserted*. This matters the moment
  a second course is imported: its batch codes must not reuse the first course's. Consider counting
  what was actually inserted (`.returning()`) and failing when it differs.
- **Evaluations:** the importer deliberately allows `level4` (13 chapters in the current data), which the
  live API refuses to a teacher. Everything else is checked against `CreateEvaluationSchema`.
- **Not imported on purpose:** exams and exam results. A track's certification is now its latest
  `examResult` (needs the real mark sheet), so `track-certifications.json` is unused.

## 3. Who passes the gate after import

| Person | Passes? | Why |
| --- | --- | --- |
| student with any enrollment, any status | yes | enrollment in the course |
| instructor / TA (imported as org `member`) | yes | their enrollment in the batch |
| person with a converted registration, no batch | yes | registration path |
| **profile with neither** | **no** | part of no course |
| owner / admin (Step 8) | yes | role, no enrollment needed |
| non-admin with no active profile | no | part of nothing |

The check is **per profile**, not per login. A household login with several profiles gets a different
answer for each, and the profile chosen at sign-in decides what they can read.

Staff who are not admins and hold no enrollment are also locked out — the same open question as PR
#166's "staff with no batch". Nothing in the current seed data hits it (every instructor/TA row is an
enrollment), but it will if staff are ever imported without a batch.

## 4. Things that changed underneath the runbook

- **`X-Course-Slug` is required.** Any script, `curl`, or smoke test that calls a course-scoped
  endpoint (`/tracks`, `/me/dashboard`, `/batches`, `/batches/open`, `/exams`, `/enrollment-requests`,
  `/registrations`, `/profiles/:id/batches`, `/profiles/:id/detail`) without it now gets a `400`, even
  for a school with one course. Endpoints that are not course-scoped (`/courses`, `/me/courses`,
  `/profile`, `/profiles`) are unaffected.
- **App URLs moved:** `/dashboard` → `/vedam/dashboard` etc. Any link or instruction in the runbook or a
  message to imported people should use `/`, which finds their course, or the course-prefixed path.
  Registration links are `/<course>/register`.
- **Deploy order:** API before web (the new web needs `GET /me/courses` and `GET /courses/:slug`).
- **Migrations run on API boot.** Migration 0018 adds the slug `CHECK`; it fails the boot if a course
  row already has a reserved or invalid slug. Only `vedam` is ever created by the 0017 backfill, but
  check staging/prod before deploying if anyone added courses by hand.

## 5. Existing gaps this work does not change

- **76 of 1,054 imported users have no phone number**, so they cannot sign in (OTP only). Unrelated to
  the gate; see the runbook's "Known gap" section.
- **Everyone is imported as org `member`.** Nobody can administer the school until Step 8 assigns an
  owner.

## 6. After importing: try these accounts

Sign in (or impersonate in a local copy) as each and check `/`, the dashboard, one chapter, and the
course switcher:

1. an **active student** — lands in `/vedam/dashboard`, sees their batch and marks
2. a student whose **only enrollment is inactive** — still gets in
3. an **applicant with no batch** (one of the 418) — gets in, sees open batches, can request one
4. an **instructor / TA** — sees their batch and roster
5. a **household login with several profiles** — switch profile at sign-in; each behaves per its own
   enrollment
6. the **owner** from Step 8 — sees everything with no enrollment
7. someone with **no phone** — confirm they simply can't sign in, and that this isn't mistaken for a
   gate problem

## 7. Later: a second course

Import it as a separate run with its own `--course` and its own data directory. Before that: batch codes
must be unique across the whole school, track `order` is per course, and anyone in both courses needs
enrollments in each (each is a separate seat, so a student may be `active` in one batch per course).
