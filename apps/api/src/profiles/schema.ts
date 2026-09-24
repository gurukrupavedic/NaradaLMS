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
  // The rest of these mirror `registration`'s own fields exactly and are only ever populated at
  // creation by `registrations/service.ts::provisionApprovedApplicant` copying an approved
  // application across — `CreateProfileSchema` below never accepts them, so a profile created
  // directly via `POST /profiles` simply carries the empty/null defaults. All but `yearOfBirth`
  // are later self-editable via `UpdateProfileSchema` (see its own doc comment).
  email: z.email().nullable(),
  yearOfBirth: z.number().int().nullable(),
  // ISO 3166-2 subdivision code and ISO 3166-1 alpha-2 country code — see the `profile` table's
  // own doc comment (`packages/db/src/schema/school.ts`) for why these are codes, not names.
  state: z.string().nullable(),
  country: z.string().nullable(),
  // Never accepted directly in `UpdateProfileSchema` below — derived server-side from
  // city/state/country by `utils/timezone.ts::deriveTimeZone` (see `service.ts::updateProfile`).
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

// The student's own "edit my profile" surface: every registration-derived field — all originally
// self-reported by the registrant themselves, per `registration-form.tsx`, not staff-entered —
// except `phone` and `yearOfBirth`. `phone` is the BetterAuth login credential (phone-OTP
// sign-in), so changing it needs its own re-verification flow, not a silent profile-details edit;
// `yearOfBirth` is treated as fixed once recorded. `countryTimeZone` is deliberately excluded too:
// it's server-derived from `city`/`state`/`country` (`service.ts::updateProfile`), not something a
// client sets directly. Zod strips these unlisted keys rather than rejecting them, same as
// `UpdateBatchSchema` dropping `trackId` (see PARITY_PLAN.md).
export type UpdateProfileData = z.infer<typeof UpdateProfileSchema>
export const UpdateProfileSchema = requireNonEmpty(
  ProfileSchema.pick({
    name: true,
    city: true,
    state: true,
    country: true,
    email: true,
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
  }).partial(),
)

export type SearchProfilesQuery = z.infer<typeof SearchProfilesQuerySchema>
export const SearchProfilesQuerySchema = z.object({
  query: z.string().trim().min(1).optional(),
  excludeBatchId: z.uuid().optional(),
})

// `withDetail=true` eager-loads each batch's roster, schedule, and the target profile's own role
// in the same query — for a caller (apps/web's admin overview) that needs every batch's detail
// anyway, avoiding an N+1 fan-out of GET /batches/:id per item.
export type ProfileBatchesQuery = z.infer<typeof ProfileBatchesQuerySchema>
export const ProfileBatchesQuerySchema = FindBatchesSchema.safeExtend({
  withDetail: z.coerce.boolean().optional().default(false),
})
