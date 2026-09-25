import * as z from 'zod'

import {
  mergeDetails,
  normalizeDetails,
  type Details,
  type FieldDefinition,
  type NormalizeResult,
} from '@narada/profile-fields'

import { validationError } from '../error'

/**
 * The *shape* of a `details` payload — a flat map of scalars. Which keys apply, and what each may
 * hold, is `@narada/profile-fields`' business (the list of fields is passed to the helpers below); a
 * request schema can't do that because it doesn't know the school or course.
 */
export const DetailsSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))

/**
 * Validates `input` against `fields` and returns what to store; throws the same 400 `parse` does for
 * a bad request body, naming the first offending field. `enforceRequiredFor` is `NormalizeOptions`'
 * own knob: `'all'` for a registration, the keys being written for a later edit.
 */
export function resolveDetails(
  fields: readonly FieldDefinition[],
  input: Details,
  enforceRequiredFor: 'all' | readonly string[],
): Details {
  return orThrow(normalizeDetails(fields, input, { enforceRequiredFor }))
}

/**
 * The details to store after an edit: `current` with `patch` laid over it. The rules —
 * conditional fields appearing and disappearing, what is held to `required`, leftovers from
 * definitions that have since changed — live in `@narada/profile-fields`' `mergeDetails`, which
 * the edit form runs too, so what the form allows is what this accepts.
 */
export function mergeDetailsPatch(
  fields: readonly FieldDefinition[],
  current: Details,
  patch: Details,
): Details {
  return orThrow(mergeDetails(fields, current, patch))
}

function orThrow({ values, errors }: NormalizeResult): Details {
  const [first] = Object.entries(errors)
  if (first) {
    throw validationError(`details.${first[0]}: ${first[1]}`, errors)
  }

  return values
}
