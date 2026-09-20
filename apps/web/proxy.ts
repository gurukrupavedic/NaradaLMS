import { NextRequest, NextResponse } from 'next/server'

import { isUnlocked, PREVIEW_COOKIE, PREVIEW_UNLOCK_PATH } from '@/lib/preview-unlock'

/**
 * Gate on cookie presence only — not a real session check. Validating the session would mean this
 * proxy making its own round trip to api-next on every navigation, and a stale-but-present
 * cookie already fails safely downstream: `lib/api/client.ts`'s calls 401 and the screen renders
 * whatever this app's normal error state is for a failed query. This layer exists to stop the
 * *common* case — no cookie at all — from ever reaching a page that assumes one, not to be the
 * only line of defence.
 *
 * `/` is where a signed-in person is sent into their course (`components/root-redirect.tsx` — it has
 * to ask the API which courses they are part of, which a proxy that only looks at cookies can't), so
 * it is gated like every other protected route: signed out, it's `/login`.
 *
 * The course is the first path segment (`/vedam/dashboard` — `lib/course-path.ts`). This proxy doesn't
 * need to know which courses exist: it gates on the session alone, and the page under `/<course>/`
 * checks the course itself.
 */
const SESSION_COOKIE = 'better-auth.session_token'
// better-auth prefixes its own cookie with `__Secure-` whenever it considers the connection secure
// (api-next's `API_BASE_URL` starting with `https://`, true on every deployed environment — see
// better-auth's own `dist/cookies/index.mjs`), so the plain name above only ever matches in local
// dev over http. Without this, every deployed environment sees `hasSession` as permanently false —
// `/dashboard` bounces back to `/login` no matter what, which loops right back to profile selection
// after a real sign-in since `getAuthSession()` there still succeeds (it hits api-next directly and
// doesn't care which cookie name the browser used).
const SECURE_SESSION_COOKIE = `__Secure-${SESSION_COOKIE}`
const PROFILE_COOKIE = 'narada-profile-id'
// `/link-device` is where a brand-new device shows its code/QR — by definition reached before
// that device has any session at all, so it has to stay public. `/settings/approve-device` is the
// opposite (the *trusted* device's approve form) and stays behind the normal gate on purpose.
// `/register` is a prospective student's application, filed before they have any account at all —
// same reasoning as `/link-device`.
const PUBLIC_PATHS = new Set(['/login', '/link-device', '/register'])
// A registration link names its course (`/vedam/register`), and is public for the same reason
// `/register` itself is: the applicant has no account yet.
const COURSE_REGISTER_PATH = /^\/[^/]+\/register\/?$/
const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.has(pathname) || COURSE_REGISTER_PATH.test(pathname)

// Fronts every route with a maintenance page instead of the app's real response — auth included,
// since a reader with no session shouldn't see a working sign-in form for a site that isn't open.
// Read directly off process.env rather than through @narada/env: this file runs before any page,
// so it can't pay for that package's full server validation (DATABASE_URL, R2 credentials, ...)
// just to check one flag.
const COMING_SOON_PATH = '/coming-soon'

// api-next's own origin, read directly off process.env for the same reason as COMING_SOON_MODE
// above (this proxy runs before @narada/env's full server validation would be worth paying for).
// Mirrors next.config.ts's former `apiUrl` — that file's own `/v1/*` rewrite is gone now that this
// proxy performs it directly (see the `/v1/` branch below).
const API_BASE_URL = process.env.API_BASE_URL

// Better-auth's OAuth flow (packages/auth/src/index.ts) needs to know which origin the browser is
// actually on, to build a redirect_uri that survives the round trip through Google and back
// through this proxy's own /v1/* rewrite to api-next. X-Forwarded-Host looked like the standard
// way to carry that, but the reverse proxy fronting api-next doesn't forward it unmodified, so
// better-auth never sees the real value. This header is a stand-in this proxy controls end to
// end instead: stamped below from the request actually received, on every /v1/* call — never read
// back from (or let through from) the incoming request, so it can't be forged by a caller hitting
// api-next directly.
//
// This has to be a `rewrite()` this proxy issues itself, to an explicit api-next destination URL,
// rather than a `next()` that lets next.config.ts's own `/v1/*` rewrite carry the request the rest
// of the way: a proxy/middleware's request-header mutations don't propagate into a *separate*
// external rewrite defined in next.config.ts — those are two different layers in Next's request
// pipeline, and headers set here would otherwise never reach api-next at all.
const APP_ORIGIN_HEADER = 'x-app-origin'

function hasSession(request: NextRequest): boolean {
  const session = request.cookies.get(SESSION_COOKIE) ?? request.cookies.get(SECURE_SESSION_COOKIE)
  return Boolean(session && request.cookies.get(PROFILE_COOKIE))
}

// TEMPORARY(preview-unlock)
function hasPreviewAccess(request: NextRequest): Promise<boolean> {
  return isUnlocked(request.cookies.get(PREVIEW_COOKIE)?.value, process.env.PREVIEW_PASSWORD)
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // OTP send/verify and OAuth sign-in have to reach api-next before any session exists, and
  // better-auth's redirect_uri resolution (see APP_ORIGIN_HEADER above) needs this header on
  // every one of these calls — so this is handled before the coming-soon/session gating below,
  // not folded into it.
  if (pathname.startsWith('/v1/')) {
    if (!API_BASE_URL) return NextResponse.next()

    const headers = new Headers(request.headers)
    headers.set(APP_ORIGIN_HEADER, request.nextUrl.origin)
    const destination = new URL(`${API_BASE_URL}${pathname.replace(/^\/v1/, '')}${request.nextUrl.search}`)
    return NextResponse.rewrite(destination, { request: { headers } })
  }

  // TEMPORARY(preview-unlock): a browser that has entered `PREVIEW_PASSWORD` (see
  // lib/preview-unlock.ts) skips the maintenance page and gets the app's normal behaviour below.
  if (process.env.COMING_SOON_MODE === 'true' && !(await hasPreviewAccess(request))) {
    if (pathname === COMING_SOON_PATH || pathname === PREVIEW_UNLOCK_PATH) {
      return NextResponse.next()
    }

    const url = request.nextUrl.clone()
    url.pathname = COMING_SOON_PATH
    return NextResponse.rewrite(url)
  }

  const signedIn = hasSession(request)
  if (pathname === '/login') {
    return signedIn ? NextResponse.redirect(new URL('/', request.url)) : NextResponse.next()
  }

  if (pathname === '/' && !signedIn) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isPublicPath(pathname) || signedIn) {
    return NextResponse.next()
  }

  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  // `/v1/*` (the auth/data rewrite) is included now so this proxy runs on it to stamp
  // APP_ORIGIN_HEADER — the early return above still lets it bypass all session/coming-soon
  // gating below, same as when it was excluded via this matcher.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
