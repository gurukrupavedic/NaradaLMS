'use client'

import { useId, useTransition, useReducer } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRightIcon, GraduationCapIcon } from '@phosphor-icons/react/dist/ssr'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'

import { signIn } from '@narada/auth/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getProfiles, selectProfile } from '@/lib/session'
import type { ApiProfile } from '@/lib/types'

type LoginState =
  | { step: 'sign-in'; direction: number }
  | { step: 'profiles'; profiles: ApiProfile[]; selected: string | null; direction: number }

type LoginAction =
  | { type: 'show_profiles'; profiles: ApiProfile[] }
  | { type: 'select'; id: string }
  | { type: 'reset' }

function loginReducer(state: LoginState, action: LoginAction): LoginState {
  switch (action.type) {
    case 'show_profiles':
      return { step: 'profiles', profiles: action.profiles, selected: null, direction: 1 }
    case 'select':
      if (state.step !== 'profiles') return state
      return { ...state, selected: action.id }
    case 'reset':
      return { step: 'sign-in', direction: -1 }
  }
}

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, y: dir * 16 }),
  center: { opacity: 1, y: 0 },
  exit: (dir: number) => ({ opacity: 0, y: dir * -16 }),
}

const TRANSITION = { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] as const }

export function SignInForm({ initialProfiles }: { initialProfiles?: ApiProfile[] }) {
  const [state, dispatch] = useReducer(
    loginReducer,
    initialProfiles
      ? { step: 'profiles' as const, profiles: initialProfiles, selected: null, direction: 1 }
      : { step: 'sign-in' as const, direction: 1 },
  )
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleEmailSignIn(formData: FormData) {
    startTransition(async () => {
      const { error } = await signIn.email({
        email: formData.get('email') as string,
        password: formData.get('password') as string,
      })
      if (error) {
        toast.error(error.message ?? 'Failed to sign in. Please try again.')
        return
      }
      try {
        const profiles = await getProfiles()
        dispatch({ type: 'show_profiles', profiles })
      } catch {
        toast.error('Signed in, but failed to load profiles. Please refresh.')
      }
    })
  }

  function handleGoogleSignIn() {
    startTransition(async () => {
      const { error } = await signIn.social({
        provider: 'google',
        callbackURL: window.location.origin + '/login',
      })
      if (error) {
        toast.error(error.message ?? 'Failed to sign in with Google.')
      }
    })
  }

  function handleContinue() {
    if (state.step !== 'profiles' || !state.selected) return
    const profileId = state.selected
    startTransition(async () => {
      try {
        await selectProfile(profileId)
      } catch {
        toast.error('Failed to select profile. Please try again.')
        return
      }
      router.push('/')
    })
  }

  return (
    <div className="flex min-h-screen">
      {/* Decorative Panel */}
      <aside className="relative hidden overflow-hidden bg-primary lg:flex lg:w-5/12 lg:flex-col lg:justify-between lg:p-14">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 bottom-0 select-none font-serif leading-none text-primary-foreground/10"
          style={{ fontSize: '22rem' }}
        >
          ॐ
        </span>
        <div>
          <div className="mb-12 flex size-11 items-center justify-center border-2 border-primary-foreground/30">
            <GraduationCapIcon weight="fill" className="size-5 text-primary-foreground" />
          </div>
          <h1 className="mb-4 font-serif text-5xl font-semibold leading-tight tracking-tight text-primary-foreground">
            Narada
            <br />
            Learning
          </h1>
          <p className="max-w-xs text-sm leading-relaxed text-primary-foreground/60">
            Classical Vedic knowledge for the dedicated practitioner.
          </p>
        </div>
        <blockquote className="border-l-2 border-primary-foreground/25 pl-5">
          <p className="mb-2 font-serif text-xl italic leading-snug text-primary-foreground/75">
            &ldquo;श्रेयान् स्वधर्मो विगुणः
            <br />
            परधर्मात् स्वनुष्ठितात्&rdquo;
          </p>
          <cite className="text-xs not-italic uppercase tracking-widest text-primary-foreground/40">
            Bhagavad Gita · 3.35
          </cite>
        </blockquote>
      </aside>

      {/* Form Panel */}
      <main className="flex flex-1 items-center justify-center bg-background px-6 py-16">
        <div className="w-full max-w-xs">
          {/* Mobile logo */}
          <div className="mb-12 flex flex-col items-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center bg-primary">
              <GraduationCapIcon weight="fill" className="size-5 text-primary-foreground" />
            </div>
            <div className="text-center">
              <p className="font-serif text-lg font-semibold">Narada Learning</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Classical Knowledge Management</p>
            </div>
          </div>

          <AnimatePresence mode="wait" custom={state.direction} initial={false}>
              <motion.div
                key={state.step}
                custom={state.direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={TRANSITION}
              >
                {state.step === 'sign-in' ? (
                  <SignInStep
                    isPending={isPending}
                    onEmailSignIn={handleEmailSignIn}
                    onGoogleSignIn={handleGoogleSignIn}
                  />
                ) : (
                  <ProfileStep
                    profiles={state.profiles}
                    selected={state.selected}
                    isPending={isPending}
                    onSelect={id => dispatch({ type: 'select', id })}
                    onContinue={handleContinue}
                    onReset={() => dispatch({ type: 'reset' })}
                  />
                )}
              </motion.div>
            </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function SignInStep({
  isPending,
  onEmailSignIn,
  onGoogleSignIn,
}: {
  isPending: boolean
  onEmailSignIn: (formData: FormData) => void
  onGoogleSignIn: () => void
}) {
  return (
    <>
      <div className="mb-9">
        <p className="mb-2.5 text-xs uppercase tracking-widest text-muted-foreground">
          Welcome back
        </p>
        <h2 className="font-serif text-4xl font-semibold leading-tight tracking-tight text-foreground">
          Sign in to your
          <br />
          account
        </h2>
      </div>

      <button
        type="button"
        onClick={onGoogleSignIn}
        disabled={isPending}
        className="mb-6 flex w-full items-center justify-center gap-2.5 border border-border bg-card px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <div className="mb-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-widest text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form action={onEmailSignIn} className="space-y-6">
        <Field label="Email address" name="email" type="email" autoComplete="email" required />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <Button
          type="submit"
          size="default"
          className="mt-1 w-full"
          loading={isPending}
          disabled={isPending}
        >
          Sign in
        </Button>
      </form>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Don&apos;t have an account?{' '}
        <span className="font-medium text-foreground">Contact your instructor.</span>
      </p>
    </>
  )
}

function ProfileStep({
  profiles,
  selected,
  isPending,
  onSelect,
  onContinue,
  onReset,
}: {
  profiles: ApiProfile[]
  selected: string | null
  isPending: boolean
  onSelect: (id: string) => void
  onContinue: () => void
  onReset: () => void
}) {
  return (
    <>
      <div className="mb-9">
        <p className="mb-2.5 text-xs uppercase tracking-widest text-muted-foreground">Welcome</p>
        <h2 className="font-serif text-4xl font-semibold leading-tight tracking-tight text-foreground">
          Who are you?
        </h2>
      </div>

      {profiles.length === 0 ? (
        <p className="mb-9 text-sm text-muted-foreground">
          No profiles found. Contact your administrator.
        </p>
      ) : (
        <div className="mb-6 space-y-2">
          {profiles.map(profile => {
            const isSelected = selected === profile.id
            return (
              <button
                key={profile.id}
                type="button"
                onClick={() => onSelect(profile.id)}
                className={cn(
                  'flex w-full items-center gap-4 border p-4 text-left transition-colors',
                  isSelected
                    ? 'border-primary'
                    : 'border-border bg-card hover:border-foreground/25',
                )}
              >
                <div
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center text-sm font-semibold transition-colors',
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{profile.name}</p>
                  {profile.city && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{profile.city}</p>
                  )}
                </div>
                <ArrowRightIcon
                  weight="bold"
                  className={cn(
                    'size-4 shrink-0 text-primary transition-opacity',
                    isSelected ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </button>
            )
          })}
        </div>
      )}

      <Button
        type="button"
        size="default"
        className="w-full"
        disabled={!selected || isPending}
        loading={isPending}
        onClick={onContinue}
      >
        Continue
      </Button>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Not you?{' '}
        <button
          type="button"
          disabled={isPending}
          onClick={onReset}
          className="font-medium text-foreground underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-50"
        >
          Sign out
        </button>
      </p>
    </>
  )
}

function Field({ label, className, ...props }: { label: string } & React.ComponentProps<'input'>) {
  const id = useId()
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </label>
      <input
        id={id}
        className={cn(
          'w-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary focus:ring-1 focus:ring-primary/30',
          className,
        )}
        {...props}
      />
    </div>
  )
}
