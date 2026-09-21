'use client'

import { useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'

import { Spinner } from '@/components/spinner'
import type { ApiProfile, ApiProficiencyLevel } from '@/lib/api/api-types'
import type { UpdateProfileInput } from '@/lib/api/resources'
import { SELF_REPORTED_PROFICIENCY_OPTIONS } from '@/lib/registration-proficiency'
import { COUNTRY_OPTIONS, getStateOptions } from '@/lib/geo'

/**
 * The student's own "edit my profile" form, opened from `components/student-profile-screen.tsx`
 * only when the viewer is looking at their own profile. Every registration-derived field is
 * editable here except `phone` and `yearOfBirth` — `phone` is the BetterAuth login credential
 * (changing it needs its own re-verification flow, not this form), `yearOfBirth` is treated as
 * fixed once recorded. The server enforces the same boundary independently
 * (`apps/api/src/profiles/schema.ts`'s `UpdateProfileSchema`), this is just the matching
 * client-side surface.
 */

// The subset of `useMutation`'s return value this dialog needs — see grade-dialog.tsx's identical
// reasoning for keeping this a small structural type rather than importing react-query's own.
export type UpdateProfileMutation = {
  mutate: (input: UpdateProfileInput, opts?: { onSuccess?: () => void }) => void
  isPending: boolean
}

export function EditProfileDialog({
  open,
  onOpenChange,
  profile,
  updating,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: ApiProfile
  updating: UpdateProfileMutation
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-ink/40 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[calc(100%-2.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto border border-rule bg-card p-5 shadow-md outline-none data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
          {open && (
            <EditProfileForm
              key={profile.updatedAt}
              profile={profile}
              updating={updating}
              onCancel={() => onOpenChange(false)}
            />
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function EditProfileForm({
  profile,
  updating,
  onCancel,
}: {
  profile: ApiProfile
  updating: UpdateProfileMutation
  onCancel: () => void
}) {
  const [name, setName] = useState(profile.name)
  const [city, setCity] = useState(profile.city ?? '')
  const [country, setCountry] = useState(profile.country ?? '')
  const [state, setState] = useState(profile.state ?? '')
  const [email, setEmail] = useState(profile.email ?? '')
  const [learningGoal, setLearningGoal] = useState(profile.learningGoal ?? '')
  const [currentProficiency, setCurrentProficiency] = useState<ApiProficiencyLevel | ''>(
    profile.currentProficiency ?? '',
  )
  const [spokenLanguages, setSpokenLanguages] = useState(profile.spokenLanguages)
  const [readLanguages, setReadLanguages] = useState(profile.readLanguages)
  const [parentNames, setParentNames] = useState(profile.parentNames)
  const [dressCodeAgreed, setDressCodeAgreed] = useState(profile.dressCodeAgreed)
  const [noMeatAgreed, setNoMeatAgreed] = useState(profile.noMeatAgreed)
  const [noAlcoholAgreed, setNoAlcoholAgreed] = useState(profile.noAlcoholAgreed)
  const [noSmokingAgreed, setNoSmokingAgreed] = useState(profile.noSmokingAgreed)
  const [comments, setComments] = useState(profile.comments ?? '')

  const stateOptions = getStateOptions(country)

  // Switching country invalidates whatever state was picked for the old one — reset it rather
  // than silently submitting a state code that belongs to a different country.
  function handleCountryChange(next: string) {
    setCountry(next)
    setState('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return

    updating.mutate(
      {
        name: trimmedName,
        city: city.trim() || null,
        country: country || null,
        state: state || null,
        email: email.trim() || null,
        learningGoal: learningGoal.trim() || null,
        currentProficiency: currentProficiency || null,
        spokenLanguages,
        readLanguages,
        parentNames,
        dressCodeAgreed,
        noMeatAgreed,
        noAlcoholAgreed,
        noSmokingAgreed,
        comments: comments.trim() || null,
      },
      { onSuccess: onCancel },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Dialog.Title className="display text-[1.125rem]">Edit profile</Dialog.Title>
        <Dialog.Description className="mt-1 text-[0.8125rem] text-ink-muted">
          Your phone number and year of birth can&apos;t be changed here — phone is used to sign
          in.
        </Dialog.Description>
      </div>

      <TextField label="Name" value={name} onChange={setName} required />
      <TextField label="City" value={city} onChange={setCity} placeholder="Hyderabad" />
      <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
        <SelectField
          label="Country"
          placeholder="Prefer not to say"
          value={country}
          onChange={handleCountryChange}
          options={COUNTRY_OPTIONS}
        />
        <SelectField
          label="State / province"
          placeholder={stateOptions.length > 0 ? 'Prefer not to say' : 'No states on record'}
          value={state}
          onChange={setState}
          options={stateOptions}
          disabled={stateOptions.length === 0}
        />
      </div>
      <p className="-mt-3 text-[0.75rem] text-ink-muted">
        Your time zone is figured out automatically from your city and state/country.
      </p>
      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
      />
      <TextAreaField
        label="Learning goal"
        value={learningGoal}
        onChange={setLearningGoal}
        placeholder="Fluency, exam prep, …"
      />
      <SelectField
        label="Self-reported starting point"
        placeholder="Prefer not to say"
        value={currentProficiency}
        onChange={v => setCurrentProficiency(v as ApiProficiencyLevel | '')}
        options={SELF_REPORTED_PROFICIENCY_OPTIONS}
      />
      <TagListField
        label="Languages you speak"
        values={spokenLanguages}
        onChange={setSpokenLanguages}
        placeholder="Telugu"
      />
      <TagListField
        label="Languages you read"
        values={readLanguages}
        onChange={setReadLanguages}
        placeholder="English"
      />
      <TagListField
        label="Parent / guardian name(s)"
        values={parentNames}
        onChange={setParentNames}
        placeholder="Parent's name"
      />
      <TextAreaField
        label="Comments"
        value={comments}
        onChange={setComments}
        placeholder="Anything the reviewing teacher should know."
      />

      <div className="space-y-3">
        <FieldLabel label="Agreements" />
        <CheckboxField
          label="I agree to follow the school's dress code."
          checked={dressCodeAgreed}
          onChange={setDressCodeAgreed}
        />
        <CheckboxField
          label="I agree not to eat meat while enrolled."
          checked={noMeatAgreed}
          onChange={setNoMeatAgreed}
        />
        <CheckboxField
          label="I agree not to drink alcohol while enrolled."
          checked={noAlcoholAgreed}
          onChange={setNoAlcoholAgreed}
        />
        <CheckboxField
          label="I agree not to smoke while enrolled."
          checked={noSmokingAgreed}
          onChange={setNoSmokingAgreed}
        />
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="label border border-ink/25 px-4 py-2 text-ink transition-opacity disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={updating.isPending || !name.trim()}
          aria-busy={updating.isPending}
          className="label inline-flex items-center gap-2 bg-ink px-4 py-2 text-paper transition-opacity disabled:opacity-50"
        >
          {updating.isPending && <Spinner />}
          {updating.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

function FieldLabel({ label }: { label: string }) {
  return <span className="label block text-ink-muted">{label}</span>
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <FieldLabel label={label} />
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-2 w-full border border-rule bg-transparent p-2.5 text-[0.8125rem] placeholder:text-ink-muted/40 focus:border-vermilion focus:outline-none"
      />
    </label>
  )
}

function SelectField({
  label,
  placeholder,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
}) {
  return (
    <label className="block">
      <FieldLabel label={label} />
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="mt-2 w-full border border-rule bg-transparent p-2.5 text-[0.8125rem] text-ink focus:border-vermilion focus:outline-none disabled:opacity-50"
      >
        <option value="">{placeholder}</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
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
      <span className="text-[0.8125rem] leading-relaxed text-ink">{label}</span>
    </label>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="block">
      <FieldLabel label={label} />
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="mt-2 w-full resize-none border border-rule bg-transparent p-2.5 text-[0.8125rem] placeholder:text-ink-muted/40 focus:border-vermilion focus:outline-none"
      />
    </label>
  )
}

// Same interaction as registration-form.tsx's own TagListField (Enter/comma to add, × to
// remove) — kept as a separate local copy rather than a shared import since that one is private
// to the registration form and this dialog is a different, smaller surface.
function TagListField({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string
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
    <div>
      <FieldLabel label={label} />
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
        className="mt-2 w-full border border-rule bg-transparent p-2.5 text-[0.8125rem] placeholder:text-ink-muted/40 focus:border-vermilion focus:outline-none"
      />
      {values.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
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
