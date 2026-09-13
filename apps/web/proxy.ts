import { NextRequest, NextResponse } from 'next/server'

/**
 * Gate on cookie presence only — not a real session check. Validating the session would mean this
 * proxy making its own round trip to api-next on every navigation, and a stale-but-present
 * cookie already fails safely downstream: `lib/api/client.ts`'s calls 401 and the screen renders
 * whatever this app's normal error state is for a failed query. This layer exists to stop the
 * *common* case — no cookie at all — from ever reaching a page that assumes one, not to be the
 * only line of defence.
 *
 * `/` has no page of its own — it's an alias, sent straight to `/dashboard` (signed in) or
 * `/login` (not), same as the real destination would decide for itself one hop later. Resolving it
 * here rather than in a `redirect()` inside a root `page.tsx` means it's gated exactly like every
 * other protected route, not a public page that happens to redirect once rendered.
 */
const SESSION_COOKIE = 'better-auth.session_token'
const PROFILE_COOKIE = 'narada-profile-id'
// `/link-device` is where a brand-new device shows its code/QR — by definition reached before
// that device has any session at all, so it has to stay public. `/settings/approve-device` is the
// opposite (the *trusted* device's approve form) and stays behind the normal gate on purpose.
const PUBLIC_PATHS = new Set(['/login', '/link-device'])

function hasSession(request: NextRequest): boolean {
  return Boolean(
    request.cookies.get(SESSION_COOKIE) && request.cookies.get(PROFILE_COOKIE),
  )
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const signedIn = hasSession(request)

  if (pathname === '/login') {
    return signedIn ? NextResponse.redirect(new URL('/dashboard', request.url)) : NextResponse.next()
  }

  if (pathname === '/') {
    return NextResponse.redirect(new URL(signedIn ? '/dashboard' : '/login', request.url))
  }

  if (PUBLIC_PATHS.has(pathname) || signedIn) {
    return NextResponse.next()
  }

  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  // Excludes `/v1/*` (the auth/data rewrite — OTP send/verify has to reach api-next before any
  // session exists, so gating it here would break sign-in itself) alongside the usual Next
  // internals and the favicon.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|v1/).*)'],
}
