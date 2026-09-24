import * as z from 'zod'

import { proficiencyLevel, registrationStatus } from '@narada/db'

import { asCursor } from '../utils/cursor'
import { DetailsSchema } from '../utils/details'
import { e164Phone, isoInstant } from '../utils/validate'

const PAGE_SIZE = 20
const CURRENT_YEAR = new Date().getFullYear()

export const registrationStatusSchema = z.enum(registrationStatus.enumValues)
export const proficiencyLevelSchema = z.enum(proficiencyLevel.enumValues)

export type Registration = z.infer<typeof RegistrationSchema>
export const RegistrationSchema = z.object({
  id: z.uuid(),
  status: registrationStatusSchema,
  // The course applied to — set from the request's course context, never by the applicant's body.
  courseId: z.uuid(),

  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  yearOfBirth: z.number().int().min(1900).max(CURRENT_YEAR),
  phone: e164Phone,
  email: z.email().nullable(),
  city: z.string().trim().min(1).nullable(),
  // ISO 3166-2 subdivision code and ISO 3166-1 alpha-2 country code — see `profile`'s own doc
  // comment (`packages/db/src/schema/school.ts`) for why these are codes, not display names.
  state: z.string().trim().min(1).nullable(),
  country: z.string().trim().min(1).nullable(),
  // Never applicant-supplied (see `CreateRegistrationSchema` below) — derived server-side from
  // city/state/country by `utils/timezone.ts::deriveTimeZone` (`service.ts::submit`).
  countryTimeZone: z.string().trim().min(1).nullable(),

  learningGoal: z.string().trim().min(1).nullable(),
  currentProficiency: proficiencyLevelSchema.nullable(),
  spokenLanguages: z.array(z.string().trim().min(1)),
  readLanguages: z.array(z.string().trim().min(1)),

  parentNames: z.array(z.string().trim().min(1)),
  dressCodeAgreed: z.boolean(),
  noMeatAgreed: z.boolean(),
  noAlcoholAgreed: z.boolean(),
  noSmokingAgreed: z.boolean(),
  comments: z.string().trim().min(1).nullable(),
  // The school-specific answers (`@narada/profile-fields`). On the way in only the shape is checked
  // here; `service.ts::submit` validates it against the school's own field definitions.
  details: DetailsSchema,

  reviewedAt: isoInstant.nullable(),
  reviewedBy: z.uuid().nullable(),
  convertedProfileId: z.uuid().nullable(),
  createdAt: isoInstant,
})

// `countryTimeZone` is deliberately absent from this pick list — see `RegistrationSchema`'s own
// doc comment on that field. `service.ts::submit` derives and inserts it itself.
export type CreateRegistrationData = z.infer<typeof CreateRegistrationSchema>
export const CreateRegistrationSchema = RegistrationSchema.pick({
  firstName: true,
  lastName: true,
  yearOfBirth: true,
  phone: true,
  email: true,
  city: true,
  state: true,
  country: true,
  learningGoal: true,
  currentProficiency: true,
  spokenLanguages: true,
  readLanguages: true,
  parentNames: true,
  dressCodeAgreed: true,
  noMeatAgreed: true,
  noAlcoholAgreed: true,
  noSmokingAgreed: true,
  comments: true,
  details: true,
}).partial({
  email: true,
  city: true,
  state: true,
  country: true,
  learningGoal: true,
  currentProficiency: true,
  spokenLanguages: true,
  readLanguages: true,
  parentNames: true,
  dressCodeAgreed: true,
  noMeatAgreed: true,
  noAlcoholAgreed: true,
  noSmokingAgreed: true,
  comments: true,
  details: true,
})

export type FindRegistrationsData = z.infer<typeof FindRegistrationsSchema>
export const FindRegistrationsSchema = RegistrationSchema.pick({
  status: true,
})
  .partial()
  .safeExtend({
    limit: z.coerce.number().int().positive().max(100).default(PAGE_SIZE),
    cursor: asCursor(z.object({ createdAt: z.coerce.date(), id: z.uuid() })),
  })
