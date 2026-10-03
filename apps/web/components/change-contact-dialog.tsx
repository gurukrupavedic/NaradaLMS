'use client'

import { useEffect, useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'

import { Spinner } from '@/components/spinner'
import { PhoneInput } from '@/components/phone-input'
import { TextField } from '@/components/form-fields'
import { ApiError } from '@/lib/api/client'
import { requestContactCode } from '@/lib/api/resources'
import type { ApiProfile } from '@/lib/api/api-types'
import { PHONE_REGEX } from '@/lib/phone-countries'
import { useChangeContact } from '@/lib/query/use-profile-mutations'

/**
 * Changing the phone number or year of birth — the two fields the "edit profile" dialog leaves out,
 * because the phone is the sign-in credential and both identify the person. Instead of a silent
 * edit it takes a one-time code: the new phone is texted one (proving it's theirs), or, if only the
 * year is changing, the current phone is. Owner only — the code goes to *their* phone, so a school
 * admin correcting a student's record can't complete it (the API refuses them too).
 */

const CURRENT_YEAR = new Date().getFullYear()
const RESEND_COOLDOWN_SECONDS = 30

export function ChangeContactDialog({
  open,
  onOpenChange,
  profile,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: ApiProfile
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-ink/40 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[calc(100%-2.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto border border-rule bg-card p-5 shadow-md outline-none data-[ending-style]:opacity-0 data-[starting-style]:opacity-0">
          {open && <ChangeContactForm profile={profile} onClose={() => onOpenChange(false)} />}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function ChangeContactForm({ profile, onClose }: { profile: ApiProfile; onClose: () => void }) {
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [year, setYear] = useState(profile.yearOfBirth?.toString() ?? '')
  // `null` while editing; the number the code was sent to once it has been.
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const changing = useChangeContact(profile.id)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const newPhone = phone.trim() !== (profile.phone ?? '') ? phone.trim() : undefined
  const yearNumber = Number(year)
  const newYear = year.trim() !== (profile.yearOfBirth?.toString() ?? '') ? yearNumber : undefined

  function validate(): string | null {
    if (!PHONE_REGEX.test(phone.trim())) {
      return 'Enter a phone number in international format, e.g. +919885981818.'
    }
    if (!Number.isInteger(yearNumber) || yearNumber < 1900 || yearNumber > CURRENT_YEAR) {
      return `Enter your year of birth, between 1900 and ${CURRENT_YEAR}.`
    }
    if (newPhone === undefined && newYear === undefined) return 'Nothing has changed.'
    return null
  }

  async function sendCode() {
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    setSending(true)
    setError(null)
    try {
      await requestContactCode(profile.id, newPhone)
      setSentTo(newPhone ?? profile.phone)
      setCode('')
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send the code. Please try again.')
    } finally {
      setSending(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (sentTo === null) {
      void sendCode()
      return
    }
    setError(null)
    changing.mutate(
      {
        code: code.trim(),
        ...(newPhone !== undefined && { phone: newPhone }),
        ...(newYear !== undefined && { yearOfBirth: newYear }),
      },
      { onSuccess: onClose },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Dialog.Title className="display text-[1.125rem]">Change phone or year of birth</Dialog.Title>
        <Dialog.Description className="mt-1 text-[0.8125rem] text-ink-muted">
          We&apos;ll text a one-time code to {newPhone ? 'the new number' : 'your current number'}{' '}
          to confirm it&apos;s you. Your phone number is also what you sign in with.
        </Dialog.Description>
      </div>

      {sentTo === null ? (
        <>
          <PhoneInput label="Phone number" value={phone} onChange={setPhone} />
          <TextField
            variant="box"
            label="Year of birth"
            value={year}
            onChange={v => setYear(v.replace(/\D/g, '').slice(0, 4))}
            placeholder="2005"
          />
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-[0.875rem] text-ink-muted">
            Code sent to <span className="font-mono text-ink">{sentTo}</span> ·{' '}
            <button
              type="button"
              onClick={() => {
                setSentTo(null)
                setError(null)
              }}
              className="text-vermilion underline underline-offset-4"
            >
              edit
            </button>
          </p>
          <TextField
            variant="box"
            label="One-time code"
            hint="Six digits"
            value={code}
            onChange={v => setCode(v.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
          />
          <button
            type="button"
            disabled={sending || cooldown > 0}
            onClick={() => void sendCode()}
            className="label text-ink-muted transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-50"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </button>
        </div>
      )}

      {error && <p className="text-[0.8125rem] text-vermilion">{error}</p>}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="label border border-ink/25 px-4 py-2 text-ink transition-opacity disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={sending || changing.isPending || (sentTo !== null && code.trim().length !== 6)}
          aria-busy={sending || changing.isPending}
          className="label inline-flex items-center gap-2 bg-ink px-4 py-2 text-paper transition-opacity disabled:opacity-50"
        >
          {(sending || changing.isPending) && <Spinner />}
          {sentTo === null ? (sending ? 'Sending…' : 'Send code') : changing.isPending ? 'Verifying…' : 'Verify and save'}
        </button>
      </div>
    </form>
  )
}
