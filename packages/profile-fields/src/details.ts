import { COUNTER_MAX, type Details, type DetailValue, type FieldDefinition } from './types'

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

  // A blank string is how a client says "clear this" (a details value can't be null), so it means
  // no value for every type, not just text.
  if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) {
    return { value: undefined }
  }

  switch (field.type) {
    case 'text': {
      if (typeof raw !== 'string') {
        return { error: 'must be text' }
      }
      const text = raw.trim()
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
    case 'counter': {
      if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0) {
        return { error: 'must be a whole number, 0 or more' }
      }
      return raw > COUNTER_MAX ? { error: `must be at most ${COUNTER_MAX}` } : { value: raw }
    }
    case 'select': {
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
 * The details after an edit: `current` with `patch` laid over it, re-validated as a whole so a
 * change that reveals or hides a conditional field (ticking "married") takes effect immediately —
 * the spouse's gothram is required from then on, and dropped if it is unticked again.
 *
 * Shared by the API (which stores the result) and the edit form (which checks it first), so the two
 * can't disagree about what an edit is allowed to do. Allowances for data that no longer matches the
 * definitions: a key `current` holds that no field defines any more is carried through untouched (an
 * edit to one field must not delete, or be blocked by, another's leftovers), and `required` is only
 * enforced for the keys in `patch` plus any field the patch newly reveals (a profile that predates
 * a newly required field can still change something else). A non-`editable` field can't be in `patch`.
 */
export function mergeDetails(
  fields: readonly FieldDefinition[],
  current: Readonly<Record<string, DetailValue>>,
  patch: Readonly<Record<string, DetailValue>>,
): NormalizeResult {
  const known = new Set(fields.map(field => field.key))
  const locked: Record<string, string> = {}
  for (const key of Object.keys(patch)) {
    if (fields.some(field => field.key === key && field.editable === false)) {
      locked[key] = 'cannot be changed'
    }
  }

  const carried: Details = {}
  const knownCurrent: Details = {}
  for (const [key, value] of Object.entries(current)) {
    ;(known.has(key) ? knownCurrent : carried)[key] = value
  }

  const merged = { ...knownCurrent, ...patch }

  // A field the patch *reveals* (ticking "married" reveals the spouse's gothram) is being answered
  // for the first time, so it is held to `required` exactly like a field the patch names.
  const visibleBefore = new Set(visibleFields(fields, knownCurrent).map(field => field.key))
  const revealed = visibleFields(fields, merged)
    .map(field => field.key)
    .filter(key => !visibleBefore.has(key))

  const { values, errors } = normalizeDetails(fields, merged, {
    enforceRequiredFor: [...Object.keys(patch), ...revealed],
  })

  return { values: { ...carried, ...values }, errors: { ...locked, ...errors } }
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
