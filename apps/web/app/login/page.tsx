'use client'

import { useEffect, useReducer, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'

import { cn } from '@/lib/utils'
import { PHONE_REGEX } from '@/lib/phone-countries'
import { SHLOKA, SHLOKA_TRANSLATION, TAGLINE } from '@/lib/brand'
import { getAuthSession, sendOtp, signInWithGoogle, verifyOtp } from '@/lib/auth/client'
import { setSelectedProfile } from '@/lib/auth/profile-store'
import { fetchProfiles } from '@/lib/api/resources'
import type { ApiProfile } from '@/lib/api/api-types'
import { GoogleIcon } from '@/components/google-icon'
import { PhoneInput } from '@/components/phone-input'

/**
 * Sign-in: phone → one-time code → which profile.
 *
 * The third step exists because a household here genuinely shares one number —
 * the import found one phone carrying several students — so "who is this?" is a
 * real question, not an edge case, and it gets a full step rather than a
 * dropdown buried in the form.
 *
 * A session now lasts a year (packages/auth/src/index.ts), so this page is reached far more often
 * by a device that's already signed in — `proxy.ts` sends a valid-session-but-no-chosen-profile
 * request here rather than into the app — than by one that genuinely needs phone/OTP. `checking`
 * is that mount-time fork: skip straight to profile selection if a session already exists, and
 * only fall through to the phone step if it doesn't. A freshly linked device (device-link's
 * `poll` endpoint sets a real session cookie with no profile chosen) lands here exactly the same
 * way.
 */

type State =
  | { step: 'checking' }
  | { step: 'phone'; error: string | null }
  | { step: 'code'; phone: string; error: string | null }
  | { step: 'profile'; phone: string; profiles: ApiProfile[]; selected: string | null }

type Action =
  | { type: 'no_session' }
  | { type: 'oauth_failed'; error: string }
  | { type: 'existing_session'; profiles: ApiProfile[] }
  | { type: 'sending' }
  | { type: 'sent'; phone: string }
  | { type: 'send_failed'; error: string }
  | { type: 'verify_failed'; error: string }
  | { type: 'verified'; profiles: ApiProfile[] }
  | { type: 'select'; id: string }
  | { type: 'back' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'no_session':
      return state.step === 'checking' ? { step: 'phone', error: null } : state
    // Landed back here off a failed Google redirect (see the mount effect below) — there's no
    // session to check in that case, so this replaces `no_session` rather than following it.
    case 'oauth_failed':
      return state.step === 'checking' ? { step: 'phone', error: action.error } : state
    case 'existing_session':
      return state.step === 'checking'
        ? { step: 'profile', phone: '', profiles: action.profiles, selected: null }
        : state
    case 'sending':
      return state.step === 'phone' ? { step: 'phone', error: null } : state
    case 'sent':
      return { step: 'code', phone: action.phone, error: null }
    case 'send_failed':
      return state.step === 'phone' ? { step: 'phone', error: action.error } : state
    case 'verify_failed':
      return state.step === 'code' ? { ...state, error: action.error } : state
    case 'verified':
      return state.step === 'code'
        ? { step: 'profile', phone: state.phone, profiles: action.profiles, selected: null }
        : state
    case 'select':
      return state.step === 'profile' ? { ...state, selected: action.id } : state
    case 'back':
      return { step: 'phone', error: null }
  }
}

// Twilio Verify's own send cooldown is per-number, not per-tab — without a matching cooldown here,
// a double-click (or an impatient second attempt before the first SMS lands) hits Twilio's own
// rate limit and surfaces as an opaque "failed to send" instead of an obviously-still-waiting UI.
const OTP_RESEND_COOLDOWN_SECONDS = 60

const STEPS = ['Number', 'Code', 'Profile'] as const

// better-auth's OAuth callback redirects failures to `errorCallbackURL` with its own `error` (and
// sometimes `error_description`) query param — see `redirectOnError` in better-auth's source, which
// every failure path in the callback funnels through. `account_not_linked` is the one actually seen
// in production so far (an existing account's email isn't verified — see packages/auth/src/index.ts's
// `accountLinking` comment); everything else gets a generic message rather than a raw error code.
function describeGoogleSignInError(code: string): string {
  if (code === 'account_not_linked') {
    return 'An account with this email already exists. Sign in with your phone number, then connect Google from Settings.'
  }
  return 'Google sign-in failed. Please try again, or use your phone number.'
}

export default function LoginPage() {
  const [state, dispatch] = useReducer(reducer, { step: 'checking' })
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const router = useRouter()
  const queryClient = useQueryClient()

  const stepIndex = state.step === 'checking' || state.step === 'phone' ? 0 : state.step === 'code' ? 1 : 2

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown(seconds => seconds - 1), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  useEffect(() => {
    // A failed Google redirect means no session was created — skip straight to `phone` with the
    // error rather than let the session check below run (and, on success, overwrite it) for no
    // reason. Read via `window.location` rather than `useSearchParams` so this stays a plain
    // mount effect instead of needing a Suspense boundary around the whole page for one field.
    const error = new URLSearchParams(window.location.search).get('error')
    if (error) {
      router.replace('/login')
      dispatch({ type: 'oauth_failed', error: describeGoogleSignInError(error) })
      return
    }

    let cancelled = false
    void (async () => {
      const session = await getAuthSession()
      if (cancelled) return
      if (!session) {
        dispatch({ type: 'no_session' })
        return
      }
      try {
        const profiles = await fetchProfiles()
        if (!cancelled) dispatch({ type: 'existing_session', profiles })
      } catch {
        // A session that's stopped resolving to real profiles (revoked account, backend hiccup)
        // is no better than no session — fall through to the normal phone/OTP path rather than
        // stranding the reader on a step that can never succeed.
        if (!cancelled) dispatch({ type: 'no_session' })
      }
    })()
    return () => {
      cancelled = true
    }
    // Mount-only by design (see the comment above); `router` is stable across renders anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Doesn't dispatch itself — the phone step (a failed *first* send) and the code step (a failed
  // *resend*) need the error to land in different places in `state` (`send_failed` only updates
  // `state` while still on `phone`; the code step already has its own `error` slot via
  // `verify_failed`), so each caller below dispatches the action that fits where it's calling from.
  async function sendCode(phoneNumber: string): Promise<string | null> {
    setIsPending(true)
    const { error } = await sendOtp(phoneNumber)
    setIsPending(false)
    if (!error) setCooldown(OTP_RESEND_COOLDOWN_SECONDS)
    return error
  }

  async function handleGoogleSignIn() {
    setIsPending(true)
    const loginURL = window.location.origin + '/login'
    const { error } = await signInWithGoogle(loginURL, loginURL)
    if (error) {
      setIsPending(false)
      dispatch({ type: 'send_failed', error })
    }
    // No `setIsPending(false)` on success — the browser is about to navigate to Google.
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = phone.trim()
    if (!PHONE_REGEX.test(trimmed)) {
      dispatch({ type: 'send_failed', error: 'Enter a number in international format, e.g. +919885981818.' })
      return
    }
    const error = await sendCode(trimmed)
    if (error) {
      dispatch({ type: 'send_failed', error })
      return
    }
    dispatch({ type: 'sent', phone: trimmed })
  }

  async function handleResend(phoneNumber: string) {
    setCode('')
    const error = await sendCode(phoneNumber)
    if (error) dispatch({ type: 'verify_failed', error })
  }

  async function handleVerifyOtp(e: React.FormEvent, phoneForVerify: string) {
    e.preventDefault()
    setIsPending(true)
    const { error } = await verifyOtp(phoneForVerify, code.trim())
    if (error) {
      setIsPending(false)
      dispatch({ type: 'verify_failed', error })
      return
    }
    try {
      const profiles = await fetchProfiles()
      dispatch({ type: 'verified', profiles })
    } catch {
      dispatch({ type: 'verify_failed', error: 'Signed in, but failed to load profiles. Try again.' })
    } finally {
      setIsPending(false)
    }
  }

  function handleContinue() {
    if (state.step !== 'profile' || !state.selected) return
    const profile = state.profiles.find(p => p.id === state.selected)
    if (!profile) return
    setSelectedProfile(profile.id, profile.name)
    // Every cached query is scoped to the profile that was active when it was fetched — clear
    // before navigating so a household switching between profiles (or signing back in without
    // an explicit sign-out first) never sees a moment of the previous profile's dashboard, exam
    // record, or admin access. See app-shell.tsx's `handleSignOut` for the same reasoning.
    queryClient.clear()
    // `/` finds the person's course (one → straight in, several → a choice).
    router.push('/')
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[0.85fr_1fr]">
      {/* ── The plate ──────────────────────────────────────────────────────
          A solid ink field carrying the mark, the way a title page is set.
          It is the only large flat colour anywhere in the system, which is
          what makes it feel like a cover rather than a panel. */}
      <aside className="plate relative hidden flex-col justify-between overflow-hidden px-10 py-10 lg:flex">
        <span
          aria-hidden
          className="font-deva pointer-events-none absolute -right-16 bottom-4 leading-none text-paper/[0.07] select-none"
          style={{ fontSize: '24rem' }}
        >
          ॐ
        </span>

        <div className="relative">
          <span className="display text-[1.6rem] leading-none">
            Narada<span className="text-vermilion">&apos;s</span>
          </span>
        </div>

        {/* The same verse, translation and tagline as the coming-soon page (lib/brand.ts). */}
        <div className="relative max-w-md">
          <p className="font-deva text-[1.375rem] leading-loose">
            {SHLOKA[0]}
            <br />
            {SHLOKA[1]}
          </p>
          <p className="mt-5 text-[0.9375rem] leading-relaxed text-paper/60 italic">
            &ldquo;{SHLOKA_TRANSLATION}&rdquo;
          </p>
        </div>

        <p className="label relative text-paper/40">{TAGLINE}</p>
      </aside>

      {/* ── The form ─────────────────────────────────────────────────────── */}
      <main className="flex flex-col justify-center px-6 py-12 sm:px-14">
        <div className="mx-auto w-full max-w-sm">
          <span className="display text-[1.5rem] lg:hidden">
            Narada<span className="text-vermilion">&apos;s</span>
          </span>

          {/* A ruled step counter — where you are in a three-part form, set
              like a form number rather than drawn as a progress widget. */}
          <ol className="mt-8 flex items-center gap-2 lg:mt-0">
            {STEPS.map((label, i) => (
              <li key={label} className="flex items-center gap-2">
                <span
                  className={cn(
                    'label transition-colors',
                    i === stepIndex
                      ? 'text-vermilion'
                      : i < stepIndex
                        ? 'text-ink'
                        : 'text-ink-muted/45',
                  )}
                >
                  {String(i + 1).padStart(2, '0')} {label}
                </span>
                {i < STEPS.length - 1 && (
                  <span aria-hidden className="h-px w-5 bg-rule" />
                )}
              </li>
            ))}
          </ol>

          {state.step === 'phone' && (
            <form className="mt-9" onSubmit={handleSendOtp}>
              <h1 className="display text-[2rem]">Sign in</h1>
              <p className="mt-3 text-[0.875rem] text-ink-muted">
                We&apos;ll send a one-time code to your phone.
              </p>

              {/*
                Google's own branding guidelines for this button (developers.google.com/identity/
                branding-guidelines) fix the logo colors, the approved button text, and its casing —
                this is the one button on the page that doesn't get the app's own `label` treatment
                (uppercase, wide tracking, typewriter face), since that's exactly the kind of
                restyling those guidelines rule out.
              */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isPending}
                className="mt-7 flex h-10 w-full items-center justify-center gap-2.5 border border-[#747775] bg-white pl-3 pr-3 text-[0.875rem] font-medium text-[#1F1F1F] transition-colors hover:bg-black/[0.04] disabled:pointer-events-none disabled:opacity-50 dark:border-[#8E918F] dark:bg-[#131314] dark:text-[#E3E3E3] dark:hover:bg-white/[0.04]"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <div className="mt-6 flex items-center gap-3">
                <span aria-hidden className="h-px flex-1 bg-rule" />
                <span className="label text-ink-muted/60">or</span>
                <span aria-hidden className="h-px flex-1 bg-rule" />
              </div>

              <PhoneInput label="Phone number" value={phone} onChange={setPhone} large />
              {state.error && <p className="mt-3 text-[0.8125rem] text-vermilion">{state.error}</p>}

              <Submit disabled={isPending || phone.trim().length < 6}>
                {isPending ? 'Sending…' : 'Send code'}
              </Submit>

              <p className="label mt-5 text-center text-ink-muted">
                New here?{' '}
                <Link href="/register" className="text-ink underline underline-offset-4">
                  Register
                </Link>
              </p>
            </form>
          )}

          {state.step === 'code' && (
            <form className="mt-9" onSubmit={e => handleVerifyOtp(e, state.phone)}>
              <h1 className="display text-[2rem]">Enter the code</h1>
              <p className="mt-3 text-[0.875rem] text-ink-muted">
                Sent to <span className="font-mono text-ink">{state.phone}</span> ·{' '}
                <button
                  type="button"
                  onClick={() => {
                    setCooldown(0)
                    dispatch({ type: 'back' })
                  }}
                  className="text-vermilion underline underline-offset-4"
                >
                  change
                </button>
              </p>

              <Field
                label="One-time code"
                hint="Six digits"
                value={code}
                onChange={setCode}
                placeholder="000000"
                type="text"
                mono
              />
              {state.error && <p className="mt-3 text-[0.8125rem] text-vermilion">{state.error}</p>}

              <Submit disabled={isPending || code.trim().length !== 6}>
                {isPending ? 'Verifying…' : 'Verify'}
              </Submit>

              <button
                type="button"
                disabled={isPending || cooldown > 0}
                onClick={() => handleResend(state.phone)}
                className="label mt-5 text-ink-muted transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-50"
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </button>
            </form>
          )}

          {state.step === 'profile' && (
            <div className="mt-9">
              <h1 className="display text-[2rem]">Who is practising?</h1>
              <p className="mt-3 text-[0.875rem] text-ink-muted">
                {state.profiles.length > 1
                  ? 'This number is registered to more than one student.'
                  : 'Confirm the profile you’re signing in as.'}
              </p>

              {state.profiles.length === 0 ? (
                <p className="mt-7 text-[0.875rem] text-ink-muted">
                  No profiles are registered to this number. Ask your batch teacher.
                </p>
              ) : (
                <ul className="mt-7 space-y-2.5">
                  {state.profiles.map(profile => {
                    const selected = state.selected === profile.id
                    return (
                      <li key={profile.id}>
                        <button
                          type="button"
                          onClick={() => dispatch({ type: 'select', id: profile.id })}
                          className={cn(
                            'sheet flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors',
                            selected
                              ? 'border-vermilion bg-vermilion/[0.06]'
                              : 'hover:bg-ink/[0.025]',
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              'grid size-8 shrink-0 place-items-center border font-label text-[0.6875rem]',
                              selected
                                ? 'border-vermilion text-vermilion'
                                : 'border-rule text-ink-muted',
                            )}
                          >
                            {profile.name.charAt(0)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[0.9375rem] font-medium">
                              {profile.name}
                            </span>
                            {profile.city && (
                              <span className="label mt-0.5 block text-ink-muted">
                                {profile.city}
                              </span>
                            )}
                          </span>
                          {selected && (
                            <span aria-hidden className="shrink-0 text-vermilion">
                              ✓
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}

              <button
                type="button"
                onClick={handleContinue}
                disabled={!state.selected}
                className={cn(
                  'label mt-7 flex w-full items-center justify-center bg-ink px-5 py-3.5 text-paper transition-opacity',
                  !state.selected && 'pointer-events-none opacity-35',
                )}
              >
                Continue
              </button>
            </div>
          )}

          <p className="label mt-10 text-ink-muted/70">
            Trouble signing in? Ask your batch teacher.
          </p>
        </div>
      </main>
    </div>
  )
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  type,
  mono,
}: {
  label: string
  hint: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  type: string
  mono?: boolean
}) {
  return (
    <label className="mt-8 block">
      <span className="label flex items-baseline justify-between text-ink-muted">
        {label}
        <span className="text-ink-muted/60 normal-case">{hint}</span>
      </span>
      {/* Underline, not a box. A ruled line to write on is the gesture this
          whole system is built from, and a boxed input would be the one place
          it broke. */}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'mt-2.5 w-full border-b border-ink/25 bg-transparent py-2.5 text-[1.125rem] transition-colors placeholder:text-ink-muted/40 focus:border-vermilion focus:outline-none',
          mono && 'font-mono tracking-[0.3em]',
        )}
      />
    </label>
  )
}

function Submit({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="label mt-8 w-full bg-ink px-5 py-3.5 text-paper transition-opacity disabled:opacity-35"
    >
      {children}
    </button>
  )
}
