import * as z from 'zod'

import { FindBatchesSchema } from '../batches/schema'
import { DetailsSchema } from '../utils/details'
import { e164Phone, requireNonEmpty } from '../utils/validate'

const CURRENT_YEAR = new Date().getFullYear()

export type Profile = z.infer<typeof ProfileSchema>
export const ProfileSchema = z.object({
  id: z.uuid(),
  userId: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().nullable(),
  city: z.string().nullable(),
  // The rest of these mirror `registration`'s own fields and are only ever populated at creation by
  // `registrations/service.ts::provisionApprovedApplicant` copying an approved application across
  // (there is no route that creates a profile any other way). All but `yearOfBirth` are later
  // self-editable via `UpdateProfileSchema` (see its own doc comment).
  email: z.email().nullable(),
  yearOfBirth: z.number().int().nullable(),
  // ISO 3166-2 subdivision code and ISO 3166-1 alpha-2 country code — see the `profile` table's
  // own doc comment (`packages/db/src/schema/school.ts`) for why these are codes, not names.
  state: z.string().nullable(),
  country: z.string().nullable(),
  // Never accepted directly in `UpdateProfileSchema` below — derived server-side from
  // city/state/country by `utils/timezone.ts::deriveTimeZone` (see `service.ts::updateProfile`).
  countryTimeZone: z.string().nullable(),
  spokenLanguages: z.array(z.string()),
  readLanguages: z.array(z.string()),
  parentNames: z.array(z.string()),
  dressCodeAgreed: z.boolean(),
  noMeatAgreed: z.boolean(),
  noAlcoholAgreed: z.boolean(),
  noSmokingAgreed: z.boolean(),
  // The school-specific answers (`@narada/profile-fields`), copied from the registration on
  // approval. Editable through `UpdateProfileSchema` as a *patch*: only the keys sent change.
  details: DetailsSchema,
  updatedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
})

// The student's own "edit my profile" surface: every registration-derived field — all originally
// self-reported by the registrant themselves, per `registration-form.tsx`, not staff-entered —
// except `phone` and `yearOfBirth`. `phone` is the BetterAuth login credential (phone-OTP
// sign-in), so changing it needs its own re-verification flow, not a silent profile-details edit;
// `yearOfBirth` is likewise only changed through that flow — see `ContactChangeSchema` below.
// `country` can be changed but never cleared, nor `state` where the country has any (there is no
// "prefer not to say" — `service.ts::updateProfile` enforces the latter).
// `countryTimeZone` is deliberately excluded too:
// it's server-derived from `city`/`state`/`country` (`service.ts::updateProfile`), not something a
// client sets directly. Zod strips these unlisted keys rather than rejecting them.
export type UpdateProfileData = z.infer<typeof UpdateProfileSchema>
export const UpdateProfileSchema = requireNonEmpty(
  ProfileSchema.pick({
    name: true,
    city: true,
    state: true,
    country: true,
    email: true,
    spokenLanguages: true,
    readLanguages: true,
    parentNames: true,
    dressCodeAgreed: true,
    noMeatAgreed: true,
    noAlcoholAgreed: true,
    noSmokingAgreed: true,
  })
    .partial()
    .extend({
      country: z.string().trim().min(1).optional(),
      // Null only to clear the old country's state when the new country has none — the service
      // rejects a missing state for a country that has some.
      state: z.string().trim().min(1).nullable().optional(),
      // A non-empty patch — `{}` would be an edit that changes nothing.
      details: DetailsSchema.refine(
        patch => Object.keys(patch).length > 0,
        'no fields to update',
      ).optional(),
    }),
)

export type SearchProfilesQuery = z.infer<typeof SearchProfilesQuerySchema>
export const SearchProfilesQuerySchema = z.object({
  query: z.string().trim().min(1).optional(),
  excludeBatchId: z.uuid().optional(),
})

// `withDetail=true` eager-loads each batch's roster, schedule, and the target profile's own role
// in the same query — for a caller (apps/web's admin overview) that needs every batch's detail
// anyway, avoiding a request per batch.
export type ProfileBatchesQuery = z.infer<typeof ProfileBatchesQuerySchema>
export const ProfileBatchesQuerySchema = FindBatchesSchema.safeExtend({
  withDetail: z.coerce.boolean().optional().default(false),
})

// Changing `phone` or `yearOfBirth` takes a one-time code, sent first (`ContactCodeRequestSchema`)
// and then submitted with the change (`ContactChangeSchema`). The code goes to the *new* phone when
// the phone is changing (proving the caller holds it), otherwise to the current one. Only the
// profile's owner can do this — an admin can't read the code off someone else's phone.
export type ContactCodeRequestData = z.infer<typeof ContactCodeRequestSchema>
export const ContactCodeRequestSchema = z.object({ phone: e164Phone.optional() })

export type ContactChangeData = z.infer<typeof ContactChangeSchema>
export const ContactChangeSchema = z
  .object({
    code: z.string().trim().min(1),
    phone: e164Phone.optional(),
    yearOfBirth: z.number().int().min(1900).max(CURRENT_YEAR).optional(),
  })
  .refine(data => data.phone !== undefined || data.yearOfBirth !== undefined, {
    message: 'no fields to update',
  })
