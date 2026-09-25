import * as z from 'zod'

import {
  mergeDetails,
  normalizeDetails,
  profileFieldsFor,
  type Details,
  type NormalizeResult,
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
  return orThrow(normalizeDetails(profileFieldsFor(schoolSlug), input, { enforceRequiredFor }))
}

/**
 * The details to store after an edit: `current` with `patch` laid over it. The rules —
 * conditional fields appearing and disappearing, what is held to `required`, leftovers from
 * definitions that have since changed — live in `@narada/profile-fields`' `mergeDetails`, which
 * the edit form runs too, so what the form allows is what this accepts.
 */
export function mergeDetailsPatch(schoolSlug: string, current: Details, patch: Details): Details {
  return orThrow(mergeDetails(profileFieldsFor(schoolSlug), current, patch))
}

function orThrow({ values, errors }: NormalizeResult): Details {
  const [first] = Object.entries(errors)
  if (first) {
    throw validationError(`details.${first[0]}: ${first[1]}`, errors)
  }

  return values
}
