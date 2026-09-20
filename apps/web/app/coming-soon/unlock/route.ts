import { NextResponse, type NextRequest } from 'next/server'

import {
  isPasswordCorrect,
  PREVIEW_COOKIE,
  PREVIEW_COOKIE_MAX_AGE_SECONDS,
  previewToken,
} from '@/lib/preview-unlock'

/**
 * TEMPORARY(preview-unlock) — see `lib/preview-unlock.ts`.
 *
 * The coming-soon page's password form posts here as a plain HTML form (no client JS needed). The
 * password is checked on the server against `PREVIEW_PASSWORD`, never in the browser. A miss goes
 * back to the maintenance page with a notice; a hit sets the unlock cookie and sends the person on to
 * the app. With no password configured, this endpoint doesn't exist.
 */
export async function POST(request: NextRequest) {
  const password = process.env.PREVIEW_PASSWORD
  if (!password) return new NextResponse(null, { status: 404 })

  const submitted = (await request.formData()).get('password')
  if (typeof submitted !== 'string' || !(await isPasswordCorrect(submitted, password))) {
    return NextResponse.redirect(new URL('/coming-soon?unlock=failed', request.url), 303)
  }

  const response = NextResponse.redirect(new URL('/', request.url), 303)
  response.cookies.set(PREVIEW_COOKIE, await previewToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: PREVIEW_COOKIE_MAX_AGE_SECONDS,
  })
  return response
}
