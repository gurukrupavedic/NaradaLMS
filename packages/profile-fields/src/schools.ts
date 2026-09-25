import { assertValidDefinitions } from './details'
import type { CounterField, Details, FieldDefinition } from './types'

/**
 * What each school collects about a person, at two levels — the same rules object at both, with
 * different key types (text, number, select, boolean, counter):
 *
 * - `profile` is the school-level component: facts about the person that hold in every course
 *   (gothram). Stored in `profile.details`.
 * - `courses[slug]` is the course-level component: what varies with the course (japam). Stored in
 *   `courseProfile.details`, one row per profile per course.
 *
 * Keyed by school slug (the `X-School-Slug`) and course slug (the `X-Course-Slug`) — the slugs of the
 * real data (`seed-data/<school>/courses.json`). A school or course with no entry collects nothing
 * extra. Adding a field is the whole change: the API validates it and the forms render it from here.
 * Keys are permanent (values are stored under them); only labels may change, and a key is unique
 * across both levels of a course so an answer always has one home.
 */
type SchoolRules = {
  profile: readonly FieldDefinition[]
  courses?: Record<string, readonly FieldDefinition[]>
}

const RULES: Record<string, SchoolRules> = {
  rr: { profile: [{ key: 'gothram', label: 'Gothram', type: 'text', required: true }] },

  slmts: {
    profile: [
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
    courses: {
      ved: [{ key: 'japam', label: 'Japam', type: 'counter' }],
    },
  },
}

for (const [school, rules] of Object.entries(RULES)) {
  if (rules.profile.some(field => field.type === 'counter')) {
    throw new Error(`school "${school}": a counter belongs to a course, not the school`)
  }

  assertValidDefinitions(rules.profile)
  // Everything a course asks, school-level first, so one check covers duplicate keys across both
  // levels and every `showIf` (which may look back from a course field to a school field).
  for (const fields of Object.values(rules.courses ?? {})) {
    assertValidDefinitions([...rules.profile, ...fields])
  }
}

const NONE: readonly FieldDefinition[] = []

function rulesFor(schoolSlug: string): SchoolRules | undefined {
  return Object.hasOwn(RULES, schoolSlug) ? RULES[schoolSlug] : undefined
}

/** The school-level component's fields: what every course of the school knows about a person. */
export function profileFieldsFor(schoolSlug: string): readonly FieldDefinition[] {
  return rulesFor(schoolSlug)?.profile ?? NONE
}

/** The course-level component's fields, counters included: what this course adds. */
export function courseFieldsFor(
  schoolSlug: string,
  courseSlug: string,
): readonly FieldDefinition[] {
  const courses = rulesFor(schoolSlug)?.courses
  return courses && Object.hasOwn(courses, courseSlug) ? courses[courseSlug]! : NONE
}

/** A field that is shown in a form and read from a registration — everything except a counter. */
export const isPlainField = (field: FieldDefinition): boolean => field.type !== 'counter'

export function isCounter(field: FieldDefinition): field is CounterField {
  return field.type === 'counter'
}

/** The counters this course keeps. */
export function courseCountersFor(schoolSlug: string, courseSlug: string): readonly CounterField[] {
  return courseFieldsFor(schoolSlug, courseSlug).filter(isCounter)
}

/** One counter of this course by key, or `undefined` if the course doesn't keep it. */
export function courseCounterFor(
  schoolSlug: string,
  courseSlug: string,
  key: string,
): CounterField | undefined {
  return courseCountersFor(schoolSlug, courseSlug).find(counter => counter.key === key)
}

/**
 * Everything a registration for this course asks, in order: the school-level fields, then the
 * course's own (a counter is never asked — it starts at 0). One list, so the form renders it and the
 * API validates it as a whole; `splitDetails` sends each answer to its own level afterwards.
 */
export function registrationFieldsFor(
  schoolSlug: string,
  courseSlug: string,
): readonly FieldDefinition[] {
  return [
    ...profileFieldsFor(schoolSlug),
    ...courseFieldsFor(schoolSlug, courseSlug).filter(isPlainField),
  ]
}

/**
 * A registration's answers, divided by the level that declares each key: `profile` for the
 * school-level component, `course` for the course-level one. A key neither declares (there shouldn't
 * be one — validation rejects it) goes nowhere.
 */
export function splitDetails(
  schoolSlug: string,
  courseSlug: string,
  details: Readonly<Details>,
): { profile: Details; course: Details } {
  const profileKeys = new Set(profileFieldsFor(schoolSlug).map(field => field.key))
  const courseKeys = new Set(courseFieldsFor(schoolSlug, courseSlug).map(field => field.key))

  const profile: Details = {}
  const course: Details = {}
  for (const [key, value] of Object.entries(details)) {
    if (profileKeys.has(key)) profile[key] = value
    else if (courseKeys.has(key)) course[key] = value
  }
  return { profile, course }
}
