'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * The form controls `registration-form.tsx` and `edit-profile-dialog.tsx` share. Two looks over
 * one set of behaviours: `underline` is the registration page's ruled-line style (roomy, each
 * field spaces itself), `box` the dialog's compact outlined one (the parent spaces the fields).
 */
export type FieldVariant = 'underline' | 'box'

const WRAPPER: Record<FieldVariant, string> = { underline: 'mt-7 block', box: 'block' }

const CONTROL: Record<FieldVariant, string> = {
  underline:
    'mt-2.5 w-full border-b border-ink/25 bg-transparent py-2.5 transition-colors focus:border-vermilion focus:outline-none',
  box: 'mt-2 w-full border border-rule bg-transparent p-2.5 text-[0.8125rem] focus:border-vermilion focus:outline-none',
}

const TEXT_SIZE: Record<FieldVariant, { input: string; area: string; select: string }> = {
  underline: { input: 'text-[1rem]', area: 'text-[0.9375rem]', select: 'text-[0.9375rem]' },
  box: { input: '', area: '', select: '' },
}

const PLACEHOLDER = 'placeholder:text-ink-muted/40'

export function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <span className="label flex items-baseline justify-between text-ink-muted">
      {label}
      {hint && <span className="text-ink-muted/60 normal-case">{hint}</span>}
    </span>
  )
}

export function TextField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  variant = 'underline',
}: {
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  variant?: FieldVariant
}) {
  return (
    <label className={WRAPPER[variant]}>
      <FieldLabel label={label} hint={hint} />
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={cn(CONTROL[variant], TEXT_SIZE[variant].input, PLACEHOLDER)}
      />
    </label>
  )
}

export function TextAreaField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  variant = 'underline',
}: {
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  variant?: FieldVariant
}) {
  return (
    <label className={WRAPPER[variant]}>
      <FieldLabel label={label} hint={hint} />
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={variant === 'underline' ? 3 : 2}
        className={cn(
          CONTROL[variant],
          TEXT_SIZE[variant].area,
          'resize-none',
          variant === 'underline' && 'leading-relaxed',
          PLACEHOLDER,
        )}
      />
    </label>
  )
}

export function SelectField<T extends string = string>({
  label,
  hint,
  value,
  onChange,
  options,
  placeholder = 'Prefer not to say',
  disabled,
  variant = 'underline',
}: {
  label: string
  hint?: string
  value: T | ''
  onChange: (value: T | '') => void
  options: readonly { value: T; label: string }[]
  placeholder?: string
  disabled?: boolean
  variant?: FieldVariant
}) {
  return (
    <label className={WRAPPER[variant]}>
      <FieldLabel label={label} hint={hint} />
      <select
        value={value}
        onChange={e => onChange(e.target.value as T | '')}
        disabled={disabled}
        className={cn(CONTROL[variant], TEXT_SIZE[variant].select, 'text-ink disabled:opacity-50')}
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

/** Free-text list: Enter or comma (or leaving the box) adds the draft as a tag, × removes one. */
export function TagListField({
  label,
  hint,
  values,
  onChange,
  placeholder,
  variant = 'underline',
}: {
  label: string
  hint?: string
  values: string[]
  onChange: (values: string[]) => void
  placeholder: string
  variant?: FieldVariant
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
    <div className={variant === 'underline' ? 'mt-7' : undefined}>
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
        className={cn(CONTROL[variant], TEXT_SIZE[variant].area, PLACEHOLDER)}
      />
      {values.length > 0 && (
        <ul className={cn('flex flex-wrap gap-2', variant === 'underline' ? 'mt-2.5' : 'mt-2')}>
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

export function CheckboxField({
  label,
  checked,
  onChange,
  variant = 'underline',
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  variant?: FieldVariant
}) {
  return (
    <label className="flex items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-vermilion"
      />
      <span
        className={cn(
          'leading-relaxed text-ink',
          variant === 'underline' ? 'text-[0.875rem]' : 'text-[0.8125rem]',
        )}
      >
        {label}
      </span>
    </label>
  )
}
