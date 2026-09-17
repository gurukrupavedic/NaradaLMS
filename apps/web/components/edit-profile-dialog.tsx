'use client'

import { useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'

import { ApiError } from '@/lib/api/client'
import type { ApiProfile } from '@/lib/api/api-types'
import type { UpdateProfileInput } from '@/lib/api/resources'

/**
 * The student's own "edit my profile" form, opened from `components/student-profile-screen.tsx`
 * only when the viewer is looking at their own profile. Deliberately narrower than the full
 * registration form: `phone` is excluded (it's the BetterAuth login credential — changing it
 * needs its own re-verification flow, not this form) and so are the teacher/registration-owned
 * fields (`currentProficiency`, `parentNames`, the `*Agreed` columns, `comments`) — the server
 * enforces the same boundary independently (`apps/api/src/profiles/schema.ts`'s
 * `UpdateProfileSchema`), this is just the matching client-side surface.
 */

// The subset of `useMutation`'s return value this dialog needs — see grade-dialog.tsx's identical
// reasoning for keeping this a small structural type rather than importing react-query's own.
export type UpdateProfileMutation = {
  mutate: (input: UpdateProfileInput, opts?: { onSuccess?: () => void }) => void
  isPending: boolean
  isError: boolean
  error: unknown
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
  const [email, setEmail] = useState(profile.email ?? '')
  const [yearOfBirth, setYearOfBirth] = useState(profile.yearOfBirth?.toString() ?? '')
  const [learningGoal, setLearningGoal] = useState(profile.learningGoal ?? '')
  const [spokenLanguages, setSpokenLanguages] = useState(profile.spokenLanguages)
  const [readLanguages, setReadLanguages] = useState(profile.readLanguages)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return

    updating.mutate(
      {
        name: trimmedName,
        city: city.trim() || null,
        email: email.trim() || null,
        yearOfBirth: yearOfBirth.trim() ? Number(yearOfBirth) : null,
        learningGoal: learningGoal.trim() || null,
        spokenLanguages,
        readLanguages,
      },
      { onSuccess: onCancel },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Dialog.Title className="display text-[1.125rem]">Edit profile</Dialog.Title>
        <Dialog.Description className="mt-1 text-[0.8125rem] text-ink-muted">
          Contact and background details. Your phone number is used to sign in and can&apos;t be
          changed here.
        </Dialog.Description>
      </div>

      <TextField label="Name" value={name} onChange={setName} required />
      <TextField label="City" value={city} onChange={setCity} placeholder="Hyderabad" />
      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
      />
      <TextField
        label="Year of birth"
        type="number"
        value={yearOfBirth}
        onChange={setYearOfBirth}
        placeholder="2005"
      />
      <TextAreaField
        label="Learning goal"
        value={learningGoal}
        onChange={setLearningGoal}
        placeholder="Fluency, exam prep, …"
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

      {updating.isError && (
        <p className="text-[0.8125rem] text-vermilion">
          {updating.error instanceof ApiError ? updating.error.message : 'Could not save your profile.'}
        </p>
      )}

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
          className="label bg-ink px-4 py-2 text-paper transition-opacity disabled:opacity-50"
        >
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
