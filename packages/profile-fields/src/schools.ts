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
 * A counter is a profile field whose value is a running total the student keeps (japam today)
 * rather than something typed once. It is declared here with the other fields, but **per course**,
 * not per school: what is counted — and whether anything is — varies with the course, while the
 * fields above belong to the school. The value is not in `details`; it is a dated log
 * (`counterLog`, one row per profile, course, counter and day) so any window can be summed and
 * nothing assumes a yearly reset.
 *
 * `key` is permanent, like a field's: rows are stored under it, so only `label` may change.
 */
export type CounterDefinition = { key: string; label: string }

// Keyed by school slug, then course slug — the slugs of the real data (`seed-data/<school>/courses.json`).
const COUNTERS_BY_SCHOOL_AND_COURSE: Record<
  string,
  Record<string, readonly CounterDefinition[]>
> = {
  slmts: { ved: [{ key: 'japam', label: 'Japam' }] },
}

for (const courses of Object.values(COUNTERS_BY_SCHOOL_AND_COURSE)) {
  for (const [courseSlug, counters] of Object.entries(courses)) {
    const keys = counters.map(counter => counter.key)
    if (new Set(keys).size !== keys.length) {
      throw new Error(`duplicate counter key in course "${courseSlug}"`)
    }
  }
}

const NO_COUNTERS: readonly CounterDefinition[] = []

/** The counters a course keeps; none for a school or course with no entry (RR's, for one). */
export function counterFieldsFor(
  schoolSlug: string,
  courseSlug: string,
): readonly CounterDefinition[] {
  const courses = Object.hasOwn(COUNTERS_BY_SCHOOL_AND_COURSE, schoolSlug)
    ? COUNTERS_BY_SCHOOL_AND_COURSE[schoolSlug]!
    : {}
  return Object.hasOwn(courses, courseSlug) ? courses[courseSlug]! : NO_COUNTERS
}

/** One counter by key, or `undefined` if the course doesn't keep it. */
export function counterFieldFor(
  schoolSlug: string,
  courseSlug: string,
  key: string,
): CounterDefinition | undefined {
  return counterFieldsFor(schoolSlug, courseSlug).find(counter => counter.key === key)
}
