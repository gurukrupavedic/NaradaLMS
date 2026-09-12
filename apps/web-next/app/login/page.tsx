'use client'

import { useEffect, useReducer, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'

import { cn } from '@/lib/utils'
import { sendOtp, verifyOtp } from '@/lib/auth/client'
import { setSelectedProfile } from '@/lib/auth/profile-store'
import { fetchProfiles } from '@/lib/api/resources'
import type { ApiProfile } from '@/lib/api/api-types'

/**
 * Sign-in: phone → one-time code → which profile.
 *
 * The third step exists because a household here genuinely shares one number —
 * the import found one phone carrying several students — so "who is this?" is a
 * real question, not an edge case, and it gets a full step rather than a
 * dropdown buried in the form.
 */

type State =
  | { step: 'phone'; error: string | null }
  | { step: 'code'; phone: string; error: string | null }
  | { step: 'profile'; phone: string; profiles: ApiProfile[]; selected: string | null }

type Action =
  | { type: 'sending' }
  | { type: 'sent'; phone: string }
  | { type: 'send_failed'; error: string }
  | { type: 'verify_failed'; error: string }
  | { type: 'verified'; profiles: ApiProfile[] }
  | { type: 'select'; id: string }
  | { type: 'back' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
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

// E.164 — matches the server's own phoneNumberValidator (packages/auth/src/index.ts in the
// api-next checkout).
const PHONE_REGEX = /^\+[1-9]\d{7,14}$/

// Twilio Verify's own send cooldown is per-number, not per-tab — without a matching cooldown here,
// a double-click (or an impatient second attempt before the first SMS lands) hits Twilio's own
// rate limit and surfaces as an opaque "failed to send" instead of an obviously-still-waiting UI.
const OTP_RESEND_COOLDOWN_SECONDS = 60

const STEPS = ['Number', 'Code', 'Profile'] as const

export default function LoginPage() {
  const [state, dispatch] = useReducer(reducer, { step: 'phone', error: null })
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const router = useRouter()
  const queryClient = useQueryClient()

  const stepIndex = state.step === 'phone' ? 0 : state.step === 'code' ? 1 : 2

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown(seconds => seconds - 1), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

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
    router.push('/dashboard')
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
            Narada<span className="text-vermilion">.</span>
          </span>
        </div>

        <div className="relative max-w-sm">
          <p className="display text-[2.5rem] leading-[1.05]">
            The register of
            <br />a practice kept.
          </p>
          <p className="mt-5 text-[0.875rem] leading-relaxed text-paper/60">
            Every chapter marked, every sitting recorded — the same ledger a
            teacher would keep by hand, shared with the student it belongs to.
          </p>
        </div>

        <p className="label relative text-paper/40">Vedic studies · est. 2024</p>
      </aside>

      {/* ── The form ─────────────────────────────────────────────────────── */}
      <main className="flex flex-col justify-center px-6 py-12 sm:px-14">
        <div className="mx-auto w-full max-w-sm">
          <span className="display text-[1.5rem] lg:hidden">
            Narada<span className="text-vermilion">.</span>
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

              <Field
                label="Phone number"
                hint="Include the country code"
                value={phone}
                onChange={setPhone}
                placeholder="+91 98859 81818"
                type="tel"
              />
              {state.error && <p className="mt-3 text-[0.8125rem] text-vermilion">{state.error}</p>}

              <Submit disabled={isPending || phone.trim().length < 6}>
                {isPending ? 'Sending…' : 'Send code'}
              </Submit>
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
