# Course hostnames

A school can run several courses (Vedam, Smartam, …), and each one lives at its own address:

```
vedam.slmts.naradas.app      → the Vedam course of SLMTS
smartam.slmts.naradas.app    → the Smartam course of SLMTS
```

Being at an address *is* being in that course. This doc covers how that works, what has to be set up
outside the repo, and how to roll it out safely.

## How it works

1. The browser asks the web app for `vedam.slmts.naradas.app/v1/...`. The web app's `proxy.ts` rewrites
   every `/v1/*` call to the API.
2. On the way through, the proxy reads the **`Host` header**, takes the one label in front of the base
   domain (`vedam`), and stamps it on the request as **`x-course-slug`**. It first deletes any
   `x-course-slug` the caller sent, so a course can only come from the address — never from a header a
   client chose. (`lib/course-host.ts` owns the parsing; it is deliberately strict — see its tests.)
3. The API resolves the header to a course and limits course-owned **reads** to it.

The course comes from the hostname rather than a cookie on purpose: a cookie is shared by every tab,
so a person with Vedam open in one tab and Smartam in another would send whichever course was written
last. The hostname is different in each tab and stores nothing.

### What "in a course" changes

| Request | Behaviour |
| --- | --- |
| `x-course-slug: vedam` | Course-owned lists are Vedam's only. |
| No header (bare base domain, local dev, an API client) | School-wide, exactly as before. |
| A slug that isn't a course | `404 course not found`, so a mistyped subdomain fails loudly. |

Limited to the course: tracks, batch lists (accessible, open, per-profile), the dashboard and profile
detail (batches, marks, exams, results, pending requests), exams, enrollment requests, registrations.
A new **registration** is filed under the course of the address it was submitted from.

**Not** limited: by-id endpoints (`/batches/:id`, `/chapters/:id`, `/exams/:id`, …). The course is *where
you are*, not what you're allowed to see — batch roles and school roles still decide access, so a link
to another course's chapter works if you're permitted to open it.

The header is **context, not authorization**: never rely on it to keep someone out of data.

## Configuration

| Variable | Where | Example | Effect |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_BASE_DOMAIN` | web (build-time) | `slmts.naradas.app` | Turns hostname → course on. Unset, no address is a course. Also enables the course switcher and shares the profile cookie across addresses. |
| `COOKIE_DOMAIN` | API | `.slmts.naradas.app` | Shares the **session cookie** across every course address (one sign-in for all). Unset, it stays host-only. Leading dot. |
| `TRUSTED_ORIGINS` | API | `…,https://*.slmts.naradas.app` | Wildcard patterns are supported; needed so sign-in and OAuth accept each course address. |

Set the two domain values together. `COOKIE_DOMAIN` without the web variable would share the session
but leave the app unaware of courses; the web variable without `COOKIE_DOMAIN` would mean signing in
separately on each course.

Where the address is *outside* the base domain (local dev, a Vercel preview URL), everything stays
host-only and course-less, so existing environments keep working untouched.

## One-time infrastructure (not in the repo)

1. **DNS.** A wildcard record for `*.slmts.naradas.app` pointing at the web host.
2. **Web host.** Add `*.slmts.naradas.app` as a domain on the web project (on Vercel, a wildcard domain
   needs the domain's nameservers delegated to Vercel for the wildcard certificate — check the current
   Vercel requirements before you start; this is the step most likely to need lead time).
3. **Google OAuth.** Google does **not** allow wildcard redirect URIs. For **each course address**, add
   `https://<course>.slmts.naradas.app/v1/auth/callback/google` under *Authorized redirect URIs* in
   Google Cloud Console (the callback is built from the address the browser is on — see the comment in
   `packages/auth/src/index.ts`). Skipping this breaks Google sign-in and "connect Google" on that
   course only, with Google's own redirect_uri_mismatch page.
4. **Env vars** above, on the web project and the API service.

## Rolling it out

The code is inert until `NEXT_PUBLIC_APP_BASE_DOMAIN` is set, so deploy first and switch it on last:

1. Merge and deploy. Nothing changes for anyone.
2. Do the DNS, web-host and Google steps. Confirm `vedam.slmts.naradas.app` loads the app.
3. Set `TRUSTED_ORIGINS` (wildcard) and `COOKIE_DOMAIN` on the API, and `NEXT_PUBLIC_APP_BASE_DOMAIN` on
   the web project, and redeploy both.
4. Verify on `vedam.slmts.naradas.app`: the course name shows beside the wordmark; the dashboard, exams
   and admin lists show Vedam only; a registration submitted there appears under Vedam.
5. Check a mistyped address (`nope.slmts.naradas.app`): the header says "no such course".

Existing sessions on the old address keep working. A profile cookie set before this change is host-only
and can sit alongside the new shared one for up to 30 days; if a person sees the wrong profile,
signing out and in once clears it.

## Adding a course

1. Insert a `course` row (`slug` = the subdomain, e.g. `smartam`). Courses are seeded, not managed in the app.
2. Register `https://smartam.slmts.naradas.app/v1/auth/callback/google` in Google Cloud Console.
   DNS, the web domain and `TRUSTED_ORIGINS` are already covered by the wildcards.
3. Create its tracks and batches (a batch's course is its track's).

## Local development

Browsers resolve `*.localhost` to your machine, so with `NEXT_PUBLIC_APP_BASE_DOMAIN=localhost` set,
`http://vedam.localhost:3001` is the Vedam course and `http://localhost:3001` is course-less. (Chrome
and Firefox do this out of the box; Safari may not.)
