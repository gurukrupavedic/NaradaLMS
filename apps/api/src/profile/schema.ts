import * as z from 'zod'

export type Membership = z.infer<typeof MembershipSchema>
export const MembershipSchema = z.object({
  organizationId: z.string(),
  organizationName: z.string(),
  organizationSlug: z.string(),
  role: z.string(),
})

// The account-level "who am I" bootstrap a client needs before it has picked a school — distinct
// from the `profiles` domain, which is per-school identity records.
export type AuthProfile = z.infer<typeof AuthProfileSchema>
export const AuthProfileSchema = z.object({
  isSuperAdmin: z.boolean(),
  memberships: z.array(MembershipSchema),
})
