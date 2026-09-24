import * as z from 'zod'

import {
  normalizeDetails,
  profileFieldsFor,
  visibleFields,
  type Details,
} from '@narada/profile-fields'

import { validationError } from '../error'

/**
 * The *shape* of a `details` payload — a flat map of scalars. Which keys a given school accepts,
 * and what each may hold, is `@narada/profile-fields`' business and is checked by `resolveDetails`
 * below; a request schema can't do that because it doesn't know the school.
 */
export const DetailsSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))

/**
 * Validates `input` against the school's field definitions and returns what to store; throws the
 * same 400 `parse` does for a bad request body, naming the first offending field.
 * `enforceRequiredFor` is `NormalizeOptions`' own knob: `'all'` for a registration, the keys being
 * written for a later edit.
 */
export function resolveDetails(
  schoolSlug: string,
  input: Details,
  enforceRequiredFor: 'all' | readonly string[],
): Details {
  const { values, errors } = normalizeDetails(profileFieldsFor(schoolSlug), input, {
    enforceRequiredFor,
  })

  const [first] = Object.entries(errors)
  if (first) {
    throw validationError(`details.${first[0]}: ${first[1]}`, errors)
  }

  return values
}

/**
 * The details to store after an edit: `current` with `patch` laid over it, re-validated as a whole
 * so a change that reveals or hides a conditional field (ticking "married") takes effect
 * immediately — the spouse's gothram is required from then on, and dropped if it's unticked.
 *
 * Two allowances for data that no longer matches the school's definitions: a key `current` holds
 * that no field defines any more is carried through untouched (an edit to one field must not delete
 * or be blocked by another's leftovers), and `required` is only enforced for the keys in `patch`
 * (a profile that predates a newly required field can still change something else) plus any field
 * the patch newly reveals.
 */
export function mergeDetailsPatch(schoolSlug: string, current: Details, patch: Details): Details {
  const fields = profileFieldsFor(schoolSlug)
  const known = new Set(fields.map(field => field.key))

  for (const key of Object.keys(patch)) {
    if (fields.some(field => field.key === key && field.editable === false)) {
      throw validationError(`details.${key}: cannot be changed`)
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

  const values = resolveDetails(schoolSlug, merged, [...Object.keys(patch), ...revealed])
  return { ...carried, ...values }
}
