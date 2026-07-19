import * as z from 'zod'

import { requireNonEmpty } from '../utils/validate'

export type Profile = z.infer<typeof ProfileSchema>
export const ProfileSchema = z.object({
  id: z.uuid(),
  userId: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().nullable(),
  city: z.string().nullable(),
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
