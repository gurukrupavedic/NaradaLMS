'use client'

import { useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'

import { Spinner } from '@/components/spinner'
import {
  CheckboxField,
  FieldLabel,
  SelectField,
  TagListField,
  TextAreaField,
  TextField,
} from '@/components/form-fields'
import type { ApiProfile, ApiProficiencyLevel } from '@/lib/api/api-types'
import type { UpdateProfileInput } from '@/lib/api/resources'
import { SELF_REPORTED_PROFICIENCY_OPTIONS } from '@/lib/registration-proficiency'
import { COUNTRY_OPTIONS, getStateOptions } from '@/lib/geo'

/**
 * The "edit profile" form, opened from `components/student-profile-screen.tsx` either by the
 * profile's own owner or by a school admin correcting someone else's — same fields, same dialog,
 * same PATCH (`useUpdateProfile(profileId, isSelf)`, see `lib/query/use-profile-mutations.ts`);
 * `isSelf` here only changes the copy, never which fields are editable. Every registration-derived
 * field is editable here except `phone` and `yearOfBirth` — `phone` is the BetterAuth login
 * credential (changing it needs its own re-verification flow, not this form, even for an admin),
 * `yearOfBirth` is treated as fixed once recorded. The server enforces the same boundary
 * independently (`apps/api/src/profiles/schema.ts`'s `UpdateProfileSchema`), this is just the
 * matching client-side surface.
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
  isSelf = true,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: ApiProfile
  updating: UpdateProfileMutation
  /** False when a school admin is editing someone else's profile — only changes the copy (whose phone/year of birth this is), never the fields. */
  isSelf?: boolean
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
              isSelf={isSelf}
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
  isSelf,
  onCancel,
}: {
  profile: ApiProfile
  updating: UpdateProfileMutation
  isSelf: boolean
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
        <Dialog.Title className="display text-[1.125rem]">
          {isSelf ? 'Edit profile' : `Edit ${profile.name}'s profile`}
        </Dialog.Title>
        <Dialog.Description className="mt-1 text-[0.8125rem] text-ink-muted">
          {isSelf
            ? "Your phone number and year of birth can't be changed here — phone is used to sign in."
            : "Phone number and year of birth can't be changed here — phone is used to sign in."}
        </Dialog.Description>
      </div>

      <TextField variant="box" label="Name" value={name} onChange={setName} required />
      <TextField variant="box" label="City" value={city} onChange={setCity} placeholder="Hyderabad" />
      <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
        <SelectField
        variant="box"
          label="Country"
          placeholder="Prefer not to say"
          value={country}
          onChange={handleCountryChange}
          options={COUNTRY_OPTIONS}
        />
        <SelectField
        variant="box"
          label="State / province"
          placeholder={stateOptions.length > 0 ? 'Prefer not to say' : 'No states on record'}
          value={state}
          onChange={setState}
          options={stateOptions}
          disabled={stateOptions.length === 0}
        />
      </div>
      <p className="-mt-3 text-[0.75rem] text-ink-muted">
        {isSelf ? 'Your' : 'Their'} time zone is figured out automatically from{' '}
        {isSelf ? 'your' : 'their'} city and state/country.
      </p>
      <TextField
        variant="box"
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
      />
      <TextAreaField
        variant="box"
        label="Learning goal"
        value={learningGoal}
        onChange={setLearningGoal}
        placeholder="Fluency, exam prep, …"
      />
      <SelectField
        variant="box"
        label="Self-reported starting point"
        placeholder="Prefer not to say"
        value={currentProficiency}
        onChange={setCurrentProficiency}
        options={SELF_REPORTED_PROFICIENCY_OPTIONS}
      />
      <TagListField
        variant="box"
        label={isSelf ? 'Languages you speak' : 'Languages they speak'}
        values={spokenLanguages}
        onChange={setSpokenLanguages}
        placeholder="Telugu"
      />
      <TagListField
        variant="box"
        label={isSelf ? 'Languages you read' : 'Languages they read'}
        values={readLanguages}
        onChange={setReadLanguages}
        placeholder="English"
      />
      <TagListField
        variant="box"
        label="Parent / guardian name(s)"
        values={parentNames}
        onChange={setParentNames}
        placeholder="Parent's name"
      />
      <TextAreaField
        variant="box"
        label="Comments"
        value={comments}
        onChange={setComments}
        placeholder="Anything the reviewing teacher should know."
      />

      <div className="space-y-3">
        <FieldLabel label="Agreements" />
        <CheckboxField
        variant="box"
          label="I agree to follow the school's dress code."
          checked={dressCodeAgreed}
          onChange={setDressCodeAgreed}
        />
        <CheckboxField
        variant="box"
          label="I agree not to eat meat while enrolled."
          checked={noMeatAgreed}
          onChange={setNoMeatAgreed}
        />
        <CheckboxField
        variant="box"
          label="I agree not to drink alcohol while enrolled."
          checked={noAlcoholAgreed}
          onChange={setNoAlcoholAgreed}
        />
        <CheckboxField
        variant="box"
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
