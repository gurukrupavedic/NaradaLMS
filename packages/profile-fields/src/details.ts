import type { Details, DetailValue, FieldDefinition } from './types'

const DEFAULT_TEXT_MAX_LENGTH = 200

/**
 * Whether `field` shows, given the answers to the fields before it. A boolean nobody answered is
 * `false`, so `equals: false` shows while `equals: true` hides. Only ever called with answers for
 * *visible* fields, which is what stops a condition chaining through a hidden one.
 */
function isShown(field: FieldDefinition, answers: Readonly<Record<string, unknown>>): boolean {
  if (!field.showIf) {
    return true
  }

  const answer = answers[field.showIf.field]
  return answer === undefined || answer === null
    ? field.showIf.equals === false
    : answer === field.showIf.equals
}

/**
 * The fields to show for `values`, in definition order, with every hidden field (and everything it
 * controls) left out. The form uses this to decide what to render as the user answers;
 * `normalizeDetails` uses the same rule to decide what the server keeps, so the two can't disagree.
 */
export function visibleFields(
  fields: readonly FieldDefinition[],
  values: Readonly<Record<string, unknown>>,
): FieldDefinition[] {
  const shown: FieldDefinition[] = []
  const answers: Record<string, unknown> = {}

  for (const field of fields) {
    if (!isShown(field, answers)) {
      continue
    }

    shown.push(field)
    answers[field.key] = values[field.key]
  }

  return shown
}

export type NormalizeOptions = {
  /**
   * Which keys are held to `required` when visible. `'all'` for a registration (the whole form is
   * being submitted); just the keys being written for a later edit, so a profile that predates a
   * newly required field can still change something else without having to answer it first.
   */
  enforceRequiredFor: 'all' | readonly string[]
}

export type NormalizeResult = {
  /** What to store: only visible fields, trimmed, with blanks dropped. */
  values: Details
  /** Field key → what is wrong with it. Empty when `values` is good to store. */
  errors: Record<string, string>
}

type Coerced = { value: DetailValue | undefined } | { error: string }

/** `undefined` (no value) is a valid coercion — whether that's allowed is `required`'s business. */
function coerce(field: FieldDefinition, raw: unknown): Coerced {
  if (field.type === 'boolean') {
    if (raw === undefined || raw === null) {
      return { value: false }
    }
    return typeof raw === 'boolean' ? { value: raw } : { error: 'must be true or false' }
  }

  if (raw === undefined || raw === null) {
    return { value: undefined }
  }

  switch (field.type) {
    case 'text': {
      if (typeof raw !== 'string') {
        return { error: 'must be text' }
      }
      const text = raw.trim()
      if (text === '') {
        return { value: undefined }
      }
      const maxLength = field.maxLength ?? DEFAULT_TEXT_MAX_LENGTH
      return text.length > maxLength
        ? { error: `must be at most ${maxLength} characters` }
        : { value: text }
    }
    case 'number': {
      if (typeof raw !== 'number' || !Number.isFinite(raw)) {
        return { error: 'must be a number' }
      }
      if (field.min !== undefined && raw < field.min) {
        return { error: `must be at least ${field.min}` }
      }
      if (field.max !== undefined && raw > field.max) {
        return { error: `must be at most ${field.max}` }
      }
      return { value: raw }
    }
    case 'select': {
      if (typeof raw === 'string' && raw.trim() === '') {
        return { value: undefined }
      }
      return field.options.some(option => option.value === raw)
        ? { value: raw as string }
        : { error: 'is not one of the options' }
    }
  }
}

/**
 * Checks `input` against `fields` and returns the payload to store. Never throws: problems come
 * back in `errors`, so a form can show each next to the field it belongs to.
 *
 * Values for a hidden field are dropped silently rather than rejected — a client that toggled
 * "married" back off is still holding the spouse's gothram it typed earlier. A key that no field
 * defines at all is an error, so the payload can't quietly become a junk drawer.
 */
export function normalizeDetails(
  fields: readonly FieldDefinition[],
  input: Readonly<Record<string, unknown>>,
  options: NormalizeOptions,
): NormalizeResult {
  const values: Details = {}
  const errors: Record<string, string> = {}

  const known = new Set(fields.map(field => field.key))
  for (const key of Object.keys(input)) {
    if (!known.has(key)) {
      errors[key] = 'is not a field for this school'
    }
  }

  for (const field of fields) {
    if (!isShown(field, values)) {
      continue
    }

    const coerced = coerce(field, input[field.key])
    if ('error' in coerced) {
      errors[field.key] = coerced.error
      continue
    }

    if (coerced.value !== undefined) {
      values[field.key] = coerced.value
      continue
    }

    const required = 'required' in field && field.required === true
    const enforced =
      options.enforceRequiredFor === 'all' || options.enforceRequiredFor.includes(field.key)
    if (required && enforced) {
      errors[field.key] = 'is required'
    }
  }

  return { values, errors }
}

/**
 * A definition list is only sound if every `showIf` names a field defined *before* it (so answers
 * are always known by the time a condition is checked) and keys are unique. Throws at module load
 * for a bad config — a typo here should fail the build, not surface as a form that never shows a field.
 */
export function assertValidDefinitions(fields: readonly FieldDefinition[]): void {
  const seen = new Set<string>()
  for (const field of fields) {
    if (seen.has(field.key)) {
      throw new Error(`duplicate profile field key "${field.key}"`)
    }
    if (field.showIf && !seen.has(field.showIf.field)) {
      throw new Error(
        `profile field "${field.key}" shows on "${field.showIf.field}", which must be defined before it`,
      )
    }
    seen.add(field.key)
  }
}
