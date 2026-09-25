/** A stored value. Absent means "not answered" — there are no nulls in a details payload. */
export type DetailValue = string | number | boolean

/** What `registration.details` / `profile.details` hold, keyed by `FieldDefinition.key`. */
export type Details = Record<string, DetailValue>

/**
 * Show a field only while another field, defined *earlier* in the same list, holds `equals`. A
 * boolean that was never answered counts as `false`. Conditions don't chain past a hidden field:
 * once the controlling field is itself hidden, everything it controls is hidden too.
 */
export type FieldCondition = { field: string; equals: DetailValue }

type FieldBase = {
  /**
   * The key the value is stored under. Never rename or reuse one once data exists for it — the
   * stored payload is keyed by this, not by label.
   */
  key: string
  label: string
  /** Defaults to true. A non-editable field can be given at registration but not changed afterwards. */
  editable?: boolean
  showIf?: FieldCondition
}

export type TextField = FieldBase & {
  type: 'text'
  /** Blank (or absent) is a rejection while the field is visible. */
  required?: boolean
  maxLength?: number
}

export type NumberField = FieldBase & {
  type: 'number'
  required?: boolean
  min?: number
  max?: number
}

export type SelectField = FieldBase & {
  type: 'select'
  required?: boolean
  options: readonly { value: string; label: string }[]
}

/** Never "required" — an unticked box is a valid answer, so it is stored as `false`. */
export type BooleanField = FieldBase & { type: 'boolean' }

export type FieldDefinition = TextField | NumberField | SelectField | BooleanField
