import { assertValidDefinitions } from './details'
import type { FieldDefinition } from './types'

/**
 * The extra details each school collects on top of the columns every school has (name, phone,
 * location, …). Keyed by the school's slug — the same one sent as `X-School-Slug` — because a
 * school is what owns a profile; it currently has exactly one course, so this is the same set the
 * course's registration form asks for.
 *
 * Adding a field here is the whole change: the API validates it and the forms render it from this
 * list. Keys are permanent (see `FieldDefinition.key`); only the label may change.
 */
const PROFILE_FIELDS_BY_SCHOOL: Record<string, readonly FieldDefinition[]> = {
  rr: [{ key: 'gothram', label: 'Gothram', type: 'text', required: true }],

  slmts: [
    { key: 'gothram', label: 'Gothram', type: 'text', required: true },
    { key: 'married', label: 'Married', type: 'boolean' },
    {
      key: 'gothramSpouse',
      label: "Wife's gothram",
      type: 'text',
      required: true,
      showIf: { field: 'married', equals: true },
    },
    { key: 'gothramMother', label: "Mother's gothram", type: 'text', required: true },
  ],
}

for (const fields of Object.values(PROFILE_FIELDS_BY_SCHOOL)) {
  assertValidDefinitions(fields)
}

const NO_FIELDS: readonly FieldDefinition[] = []

/** A school with no entry collects nothing extra. */
export function profileFieldsFor(schoolSlug: string): readonly FieldDefinition[] {
  return Object.hasOwn(PROFILE_FIELDS_BY_SCHOOL, schoolSlug)
    ? PROFILE_FIELDS_BY_SCHOOL[schoolSlug]!
    : NO_FIELDS
}

/**
 * Whole profile widgets a school opts into, beyond the fields above — the same per-school switch
 * (a school with no entry has none). `japam` is a counter students keep, which RR does not have.
 */
export type SchoolFeature = 'japam'

const FEATURES_BY_SCHOOL: Record<string, readonly SchoolFeature[]> = {
  slmts: ['japam'],
}

export function schoolHasFeature(schoolSlug: string, feature: SchoolFeature): boolean {
  return (
    Object.hasOwn(FEATURES_BY_SCHOOL, schoolSlug) &&
    FEATURES_BY_SCHOOL[schoolSlug]!.includes(feature)
  )
}
