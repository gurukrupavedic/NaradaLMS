'use client'

import { useState } from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { submitRegistration, type SubmitRegistrationInput } from '@/lib/api/resources'
import { ApiError } from '@/lib/api/client'
import type { ApiCourse, ApiProficiencyLevel } from '@/lib/api/api-types'
import { SELF_REPORTED_PROFICIENCY_OPTIONS } from '@/lib/registration-proficiency'
import { COUNTRY_OPTIONS, getStateOptions } from '@/lib/geo'
import { Wordmark } from '@/components/app-shell'
import { PhoneInput } from '@/components/phone-input'

/**
 * A prospective student's application — the same data a paper registration form used to collect
 * (the registration sheets `tools/src/parse-excel-to-json.ts` reads), now filed straight into
 * `POST /registrations` instead of a spreadsheet row someone re-keys by hand later.
 *
 * Three steps, like `app/login/page.tsx`'s phone → code → profile ladder, but linear rather than
 * branching — every step collects a fixed slice of one form, so plain `useState` for the data plus
 * a step index is enough; a reducer earns its keep when different steps hold genuinely different
 * shapes of state, which isn't the case here.
 */

// Matches apps/api's e164Phone validator exactly (apps/api/src/utils/validate.ts).
const PHONE_REGEX = /^\+[1-9]\d{7,14}$/
const CURRENT_YEAR = new Date().getFullYear()

const STEPS = ['About you', 'Learning', 'Agreements'] as const

type FormState = {
  firstName: string
  lastName: string
  phone: string
  yearOfBirth: string
  email: string
  city: string
  country: string
  state: string
  learningGoal: string
  currentProficiency: ApiProficiencyLevel | ''
  spokenLanguages: string[]
  readLanguages: string[]
  parentNames: string[]
  dressCodeAgreed: boolean
  noMeatAgreed: boolean
  noAlcoholAgreed: boolean
  noSmokingAgreed: boolean
  comments: string
}

const EMPTY_FORM: FormState = {
  firstName: '',
  lastName: '',
  phone: '',
  yearOfBirth: '',
  email: '',
  city: '',
  country: '',
  state: '',
  learningGoal: '',
  currentProficiency: '',
  spokenLanguages: [],
  readLanguages: [],
  parentNames: [],
  dressCodeAgreed: false,
  noMeatAgreed: false,
  noAlcoholAgreed: false,
  noSmokingAgreed: false,
  comments: '',
}

function validateStep(step: number, form: FormState): string | null {
  if (step === 0) {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      return 'First and last name are required.'
    }
    if (!PHONE_REGEX.test(form.phone.trim())) {
      return 'Enter a phone number in international format, e.g. +919885981818.'
    }
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      return 'Enter a valid email address, or leave it blank.'
    }
    const year = Number(form.yearOfBirth)
    if (!form.yearOfBirth.trim() || !Number.isInteger(year) || year < 1900 || year > CURRENT_YEAR) {
      return `Enter your year of birth, between 1900 and ${CURRENT_YEAR}.`
    }
  }
  return null
}

function toPayload(form: FormState): SubmitRegistrationInput {
  return {
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    phone: form.phone.trim(),
    yearOfBirth: Number(form.yearOfBirth),
    email: form.email.trim() || undefined,
    city: form.city.trim() || undefined,
    country: form.country || undefined,
    state: form.state || undefined,
    learningGoal: form.learningGoal.trim() || undefined,
    currentProficiency: form.currentProficiency || undefined,
    spokenLanguages: form.spokenLanguages,
    readLanguages: form.readLanguages,
    parentNames: form.parentNames,
    dressCodeAgreed: form.dressCodeAgreed,
    noMeatAgreed: form.noMeatAgreed,
    noAlcoholAgreed: form.noAlcoholAgreed,
    noSmokingAgreed: form.noSmokingAgreed,
    comments: form.comments.trim() || undefined,
  }
}

/**
 * `course` is the course being applied to, named by the registration link (`/vedam/register`) — a
 * visitor has no account, so nothing else could say. It's shown, so an applicant knows what they are
 * signing up for. The application carries it in the `x-course-slug` header like every other request
 * (the client reads it from the same address).
 */
export function RegistrationForm({ course }: { course: ApiCourse }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function patch(fields: Partial<FormState>) {
    setForm(prev => ({ ...prev, ...fields }))
  }

  // Switching country invalidates whatever state was picked for the old one.
  function handleCountryChange(country: string) {
    patch({ country, state: '' })
  }

  const stateOptions = getStateOptions(form.country)

  function handleBack() {
    setError(null)
    setStep(s => Math.max(0, s - 1))
  }

  function handleContinue() {
    const validationError = validateStep(step, form)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setStep(s => Math.min(STEPS.length - 1, s + 1))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validateStep(step, form)
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await submitRegistration(toPayload(form))
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 sm:px-10">
        <Wordmark />
        <div className="sheet mt-10 px-6 py-8">
          <p className="label text-vermilion">Received</p>
          <h1 className="display mt-4 text-[1.75rem]">Thank you, {form.firstName}.</h1>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-muted">
            Your registration has been recorded. A teacher will review it and reach out on{' '}
            <span className="font-mono text-ink">{form.phone}</span> once a batch is arranged.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-12 sm:px-10">
      <Wordmark />

      <p className="label mt-8 flex items-baseline justify-between text-ink-muted">
        Registration · {course.name}
        <Link href="/login" className="text-ink-muted underline underline-offset-4 hover:text-ink">
          Already registered? Sign in
        </Link>
      </p>
      <h1 className="display mt-3 text-[2rem]">Join a {course.name} batch</h1>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-muted">
        Tell us about yourself. A teacher reviews every application before a batch is assigned.
      </p>

      <ol className="mt-8 flex flex-wrap items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                'label transition-colors',
                i === step ? 'text-vermilion' : i < step ? 'text-ink' : 'text-ink-muted/45',
              )}
            >
              {String(i + 1).padStart(2, '0')} {label}
            </span>
            {i < STEPS.length - 1 && <span aria-hidden className="h-px w-5 bg-rule" />}
          </li>
        ))}
      </ol>

      <form className="mt-9" onSubmit={step === STEPS.length - 1 ? handleSubmit : e => e.preventDefault()}>
        {step === 0 && (
          <div className="space-y-1">
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <Field
                label="First name"
                value={form.firstName}
                onChange={v => patch({ firstName: v })}
                placeholder="Anjali"
              />
              <Field
                label="Last name"
                value={form.lastName}
                onChange={v => patch({ lastName: v })}
                placeholder="Rao"
              />
            </div>
            <PhoneInput label="Phone number" value={form.phone} onChange={v => patch({ phone: v })} />
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <Field
                label="Email"
                hint="Optional"
                value={form.email}
                onChange={v => patch({ email: v })}
                placeholder="anjali@example.com"
                type="email"
              />
              <Field
                label="Year of birth"
                value={form.yearOfBirth}
                onChange={v => patch({ yearOfBirth: v.replace(/\D/g, '').slice(0, 4) })}
                placeholder="2005"
                type="text"
              />
            </div>
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <Field
                label="City"
                hint="Optional"
                value={form.city}
                onChange={v => patch({ city: v })}
                placeholder="Hyderabad"
              />
              <SelectField
                label="Country"
                hint="Optional"
                value={form.country}
                onChange={handleCountryChange}
                options={COUNTRY_OPTIONS}
              />
            </div>
            {stateOptions.length > 0 && (
              <SelectField
                label="State / province"
                hint="Optional"
                value={form.state}
                onChange={v => patch({ state: v })}
                options={stateOptions}
              />
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-1">
            <TextAreaField
              label="What would you like to learn?"
              hint="Optional"
              value={form.learningGoal}
              onChange={v => patch({ learningGoal: v })}
              placeholder="Learn to chant confidently and understand the meaning."
            />
            <SelectField
              label="Current proficiency"
              hint="Optional"
              value={form.currentProficiency}
              onChange={v => patch({ currentProficiency: v as ApiProficiencyLevel | '' })}
              options={SELF_REPORTED_PROFICIENCY_OPTIONS}
            />
            <TagListField
              label="Languages you speak"
              hint="Press Enter to add"
              values={form.spokenLanguages}
              onChange={v => patch({ spokenLanguages: v })}
              placeholder="Telugu"
            />
            <TagListField
              label="Languages you read"
              hint="Press Enter to add"
              values={form.readLanguages}
              onChange={v => patch({ readLanguages: v })}
              placeholder="English"
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-1">
            <TagListField
              label="Parent / guardian name(s)"
              hint="Optional · press Enter to add"
              values={form.parentNames}
              onChange={v => patch({ parentNames: v })}
              placeholder="Parent's name"
            />

            <div className="mt-7 space-y-3">
              <span className="label block text-ink-muted">Agreements</span>
              <CheckboxField
                label="I agree to follow the school's dress code."
                checked={form.dressCodeAgreed}
                onChange={v => patch({ dressCodeAgreed: v })}
              />
              <CheckboxField
                label="I agree not to eat meat while enrolled."
                checked={form.noMeatAgreed}
                onChange={v => patch({ noMeatAgreed: v })}
              />
              <CheckboxField
                label="I agree not to drink alcohol while enrolled."
                checked={form.noAlcoholAgreed}
                onChange={v => patch({ noAlcoholAgreed: v })}
              />
              <CheckboxField
                label="I agree not to smoke while enrolled."
                checked={form.noSmokingAgreed}
                onChange={v => patch({ noSmokingAgreed: v })}
              />
            </div>

            <TextAreaField
              label="Anything else?"
              hint="Optional"
              value={form.comments}
              onChange={v => patch({ comments: v })}
              placeholder="Anything the reviewing teacher should know."
            />
          </div>
        )}

        {error && <p className="mt-4 text-[0.8125rem] text-vermilion">{error}</p>}

        <div className="mt-8 flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={submitting}
              className="label flex-1 border border-rule px-5 py-3.5 text-ink-muted transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-50"
            >
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleContinue}
              className="label flex-1 bg-ink px-5 py-3.5 text-paper transition-opacity"
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="label flex-1 bg-ink px-5 py-3.5 text-paper transition-opacity disabled:opacity-35"
            >
              {submitting ? 'Submitting…' : 'Submit registration'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <span className="label flex items-baseline justify-between text-ink-muted">
      {label}
      {hint && <span className="text-ink-muted/60 normal-case">{hint}</span>}
    </span>
  )
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  type?: string
}) {
  return (
    <label className="mt-7 block">
      <FieldLabel label={label} hint={hint} />
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2.5 w-full border-b border-ink/25 bg-transparent py-2.5 text-[1rem] transition-colors placeholder:text-ink-muted/40 focus:border-vermilion focus:outline-none"
      />
    </label>
  )
}

function TextAreaField({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <label className="mt-7 block">
      <FieldLabel label={label} hint={hint} />
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="mt-2.5 w-full resize-none border-b border-ink/25 bg-transparent py-2.5 text-[0.9375rem] leading-relaxed transition-colors placeholder:text-ink-muted/40 focus:border-vermilion focus:outline-none"
      />
    </label>
  )
}

function SelectField({
  label,
  hint,
  value,
  onChange,
  options,
}: {
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="mt-7 block">
      <FieldLabel label={label} hint={hint} />
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-2.5 w-full border-b border-ink/25 bg-transparent py-2.5 text-[0.9375rem] text-ink transition-colors focus:border-vermilion focus:outline-none"
      >
        <option value="">Prefer not to say</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function TagListField({
  label,
  hint,
  values,
  onChange,
  placeholder,
}: {
  label: string
  hint?: string
  values: string[]
  onChange: (values: string[]) => void
  placeholder: string
}) {
  const [draft, setDraft] = useState('')

  function commit() {
    const trimmed = draft.trim()
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed])
    }
    setDraft('')
  }

  return (
    <div className="mt-7">
      <FieldLabel label={label} hint={hint} />
      <input
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            commit()
          }
        }}
        onBlur={commit}
        placeholder={placeholder}
        className="mt-2.5 w-full border-b border-ink/25 bg-transparent py-2.5 text-[0.9375rem] transition-colors placeholder:text-ink-muted/40 focus:border-vermilion focus:outline-none"
      />
      {values.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-2">
          {values.map(value => (
            <li
              key={value}
              className="flex items-center gap-1.5 border border-rule px-2.5 py-1 text-[0.8125rem]"
            >
              {value}
              <button
                type="button"
                onClick={() => onChange(values.filter(v => v !== value))}
                aria-label={`Remove ${value}`}
                className="text-ink-muted transition-colors hover:text-vermilion"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-vermilion"
      />
      <span className="text-[0.875rem] leading-relaxed text-ink">{label}</span>
    </label>
  )
}
