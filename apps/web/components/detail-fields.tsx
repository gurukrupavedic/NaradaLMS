'use client'

import { isPlainField, visibleFields, type FieldDefinition } from '@narada/profile-fields'

import { CheckboxField, SelectField, TextField, type FieldVariant } from '@/components/form-fields'
import { detailsFromDraft, draftValue, type DetailDraft } from '@/lib/profile-details'
import { cn } from '@/lib/utils'

/**
 * The school-specific inputs (`@narada/profile-fields`) as form controls, for whichever form holds
 * them — the registration page (`underline`) and the edit dialog (`box`) share this, as they share
 * `form-fields.tsx`. Which fields show depends on the answers so far (a wife's gothram appears once
 * "Married" is ticked), by the same `visibleFields` rule the API applies to what it stores.
 *
 * Renders nothing for a school that collects nothing extra. A field the answers hide is unmounted,
 * but what was typed into it stays in the draft, so ticking the box off and on doesn't lose it — the
 * API drops hidden values on its own side.
 */
export function DetailFields({
  fields,
  draft,
  onChange,
  variant = 'underline',
  editing = false,
}: {
  fields: readonly FieldDefinition[]
  draft: DetailDraft
  onChange: (key: string, value: string | boolean) => void
  variant?: FieldVariant
  /** Editing an existing profile: fields marked `editable: false` are left out. */
  editing?: boolean
}) {
  const shown = visibleFields(fields, detailsFromDraft(fields, draft)).filter(
    field => isPlainField(field) && (!editing || field.editable !== false),
  )

  return (
    <>
      {shown.map(field => (
        <DetailField
          key={field.key}
          field={field}
          value={draftValue(field, draft)}
          onChange={value => onChange(field.key, value)}
          variant={variant}
        />
      ))}
    </>
  )
}

function DetailField({
  field,
  value,
  onChange,
  variant,
}: {
  field: FieldDefinition
  value: string | boolean
  onChange: (value: string | boolean) => void
  variant: FieldVariant
}) {
  switch (field.type) {
    case 'boolean':
      return (
        <div className={cn(variant === 'underline' && 'mt-7')}>
          <CheckboxField
            variant={variant}
            label={field.label}
            checked={value === true}
            onChange={onChange}
          />
        </div>
      )
    case 'select':
      return (
        <SelectField
          variant={variant}
          label={field.label}
          hint={field.required ? undefined : 'Optional'}
          placeholder="Select…"
          value={String(value)}
          onChange={onChange}
          options={field.options}
        />
      )
    case 'counter':
      // Never a form field: a counter is bumped from its own card, and starts at 0.
      return null
    case 'number':
    case 'text':
      return (
        <TextField
          variant={variant}
          label={field.label}
          hint={field.required ? undefined : 'Optional'}
          type={field.type === 'number' ? 'number' : 'text'}
          value={String(value)}
          onChange={onChange}
        />
      )
  }
}
