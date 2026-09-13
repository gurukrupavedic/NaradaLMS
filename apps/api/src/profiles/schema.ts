import * as z from 'zod'

import { FindBatchesSchema } from '../batches/schema'
import { proficiencyLevelSchema } from '../evaluations/schema'
import { requireNonEmpty } from '../utils/validate'

export type Profile = z.infer<typeof ProfileSchema>
export const ProfileSchema = z.object({
  id: z.uuid(),
  userId: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().nullable(),
  city: z.string().nullable(),
  // The rest of these mirror `registration`'s own fields exactly — only ever populated by
  // `registrations/service.ts::provisionApprovedApplicant` copying an approved application across,
  // never client-supplied (see `CreateProfileSchema`/`UpdateProfileSchema` below), so a profile
  // created directly via `POST /profiles` simply carries the empty/null defaults.
  email: z.email().nullable(),
  yearOfBirth: z.number().int().nullable(),
  countryTimeZone: z.string().nullable(),
  learningGoal: z.string().nullable(),
  currentProficiency: proficiencyLevelSchema.nullable(),
  spokenLanguages: z.array(z.string()),
  readLanguages: z.array(z.string()),
  parentNames: z.array(z.string()),
  dressCodeAgreed: z.boolean(),
  noMeatAgreed: z.boolean(),
  noAlcoholAgreed: z.boolean(),
  noSmokingAgreed: z.boolean(),
  comments: z.string().nullable(),
  updatedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
})

export type CreateProfileData = z.infer<typeof CreateProfileSchema>
export const CreateProfileSchema = ProfileSchema.pick({
  name: true,
  phone: true,
  city: true,
}).partial({
  phone: true,
  city: true,
})

export type UpdateProfileData = z.infer<typeof UpdateProfileSchema>
export const UpdateProfileSchema = requireNonEmpty(
  ProfileSchema.pick({
    name: true,
    phone: true,
    city: true,
  }).partial(),
)

export type SearchProfilesQuery = z.infer<typeof SearchProfilesQuerySchema>
export const SearchProfilesQuerySchema = z.object({
  query: z.string().trim().min(1).optional(),
  excludeBatchId: z.uuid().optional(),
})

// `withDetail=true` eager-loads each batch's roster, schedule, and the target profile's own role
// in the same query — for a caller (apps/web's admin overview) that needs every batch's detail
// anyway, avoiding an N+1 fan-out of GET /batches/:id per item (see [[project_batch_n1_incident]]).
export type ProfileBatchesQuery = z.infer<typeof ProfileBatchesQuerySchema>
export const ProfileBatchesQuerySchema = FindBatchesSchema.safeExtend({
  withDetail: z.coerce.boolean().optional().default(false),
})
