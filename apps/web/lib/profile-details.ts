import {
  mergeDetails,
  normalizeDetails,
  visibleFields,
  type Details,
  type FieldDefinition,
} from '@narada/profile-fields'

/**
 * The web half of `@narada/profile-fields`: turning what a form holds into what the API takes, and
 * back. Pure and dependency-free so it is tested here (see `vitest.config.ts`); the components that
 * render the fields (`components/detail-fields.tsx`) stay thin.
 *
 * A form holds a *draft*: text, select and number inputs are strings (a half-typed number has to be
 * representable), checkboxes are booleans. A key nobody has touched is simply absent.
 */
export type DetailDraft = Record<string, string | boolean>

/** What an untouched field holds, so a component never has to special-case "absent". */
export function draftValue(field: FieldDefinition, draft: DetailDraft): string | boolean {
  const value = draft[field.key]
  if (field.type === 'boolean') return value === true
  return typeof value === 'string' ? value : ''
}

/** A stored payload as an editable draft. */
export function draftFromDetails(
  fields: readonly FieldDefinition[],
  details: Details,
): DetailDraft {
  const draft: DetailDraft = {}
  for (const field of fields) {
    const stored = details[field.key]
    if (stored === undefined) continue
    draft[field.key] = field.type === 'boolean' ? stored === true : String(stored)
  }
  return draft
}

/**
 * A draft as API values: only the fields the answers so far leave visible, blanks left out, text
 * trimmed, numbers parsed (an unparseable one stays `NaN` so validation can name it rather than it
 * silently vanishing).
 */
export function detailsFromDraft(fields: readonly FieldDefinition[], draft: DetailDraft): Details {
  const answers: Details = {}
  for (const field of fields) {
    if (field.type === 'boolean') {
      answers[field.key] = draft[field.key] === true
      continue
    }

    const text = draftValue(field, draft)
    if (typeof text === 'string' && text.trim() !== '') {
      answers[field.key] = field.type === 'number' ? Number(text.trim()) : text.trim()
    }
  }

  const values: Details = {}
  for (const field of visibleFields(fields, answers)) {
    const value = answers[field.key]
    if (value !== undefined) values[field.key] = value
  }
  return values
}

/**
 * The keys an edit changes, as a patch for `PATCH /profiles/:id` — `undefined` when nothing did, so
 * the request can leave `details` out. A cleared field goes as a blank string (a value can't be
 * null on the wire; the server reads blank as "no value"). Only what *differs* is sent: a profile
 * that predates a required field can then be saved without answering it.
 */
export function detailsPatch(
  fields: readonly FieldDefinition[],
  draft: DetailDraft,
  stored: Details,
): Details | undefined {
  const next = detailsFromDraft(fields, draft)
  const patch: Details = {}

  for (const field of visibleFields(fields, next)) {
    if (field.editable === false) continue

    const before = stored[field.key]
    const after = next[field.key]
    if (field.type === 'boolean') {
      if ((after ?? false) !== (before ?? false)) patch[field.key] = after ?? false
    } else if (after === undefined) {
      if (before !== undefined) patch[field.key] = ''
    } else if (after !== before) {
      patch[field.key] = after
    }
  }

  return Object.keys(patch).length > 0 ? patch : undefined
}

/** The first problem in field order, worded for a person ("Gothram is required."), or `null`. */
function firstProblem(
  fields: readonly FieldDefinition[],
  errors: Record<string, string>,
): string | null {
  const field = fields.find(candidate => errors[candidate.key] !== undefined)
  if (field) return `${field.label} ${errors[field.key]}.`

  const [unknown] = Object.entries(errors)
  return unknown ? `${unknown[0]} ${unknown[1]}.` : null
}

/** What stops a whole form (registration) being submitted, by the same rules the API applies. */
export function registrationDetailsError(
  fields: readonly FieldDefinition[],
  draft: DetailDraft,
): string | null {
  const { errors } = normalizeDetails(fields, detailsFromDraft(fields, draft), {
    enforceRequiredFor: 'all',
  })
  return firstProblem(fields, errors)
}

/** What stops an edit being saved — the API's own merge rules, run on the patch first. */
export function editDetailsError(
  fields: readonly FieldDefinition[],
  stored: Details,
  patch: Details,
): string | null {
  return firstProblem(fields, mergeDetails(fields, stored, patch).errors)
}

/** A stored value as text for a read-only view; `null` when nothing is stored. */
export function displayDetail(field: FieldDefinition, details: Details): string | null {
  const value = details[field.key]
  if (field.type === 'boolean') return value === true ? 'Yes' : 'No'
  if (value === undefined) return null
  if (field.type === 'select') {
    return field.options.find(option => option.value === value)?.label ?? String(value)
  }
  return String(value)
}
