import * as z from 'zod'

import { proficiencyLevel, registrationStatus } from '@narada/db'

import { asCursor } from '../utils/cursor'
import { e164Phone, isoInstant } from '../utils/validate'

const PAGE_SIZE = 20
const CURRENT_YEAR = new Date().getFullYear()

export const registrationStatusSchema = z.enum(registrationStatus.enumValues)
export const proficiencyLevelSchema = z.enum(proficiencyLevel.enumValues)

export type Registration = z.infer<typeof RegistrationSchema>
export const RegistrationSchema = z.object({
  id: z.uuid(),
  status: registrationStatusSchema,

  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  yearOfBirth: z.number().int().min(1900).max(CURRENT_YEAR).nullable(),
  phone: e164Phone,
  email: z.email().nullable(),
  city: z.string().trim().min(1).nullable(),
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

  reviewedAt: isoInstant.nullable(),
  reviewedBy: z.uuid().nullable(),
  convertedProfileId: z.uuid().nullable(),
  createdAt: isoInstant,
})

export type CreateRegistrationData = z.infer<typeof CreateRegistrationSchema>
export const CreateRegistrationSchema = RegistrationSchema.pick({
  firstName: true,
  lastName: true,
  yearOfBirth: true,
  phone: true,
  email: true,
  city: true,
  countryTimeZone: true,
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
}).partial({
  yearOfBirth: true,
  email: true,
  city: true,
  countryTimeZone: true,
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
