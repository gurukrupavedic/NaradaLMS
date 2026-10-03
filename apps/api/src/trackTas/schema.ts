import * as z from 'zod'

// A TA listed for a track — what a student needs to approach them: name, phone, and where (and so
// when) they're reachable. `country` is an ISO 3166-1 code, `countryTimeZone` an IANA id.
export type TrackTa = z.infer<typeof TrackTaSchema>
export const TrackTaSchema = z.object({
  trackId: z.uuid(),
  profileId: z.uuid(),
  name: z.string(),
  phone: z.string().nullable(),
  country: z.string().nullable(),
  countryTimeZone: z.string().nullable(),
})

export type TrackTaCandidate = z.infer<typeof TrackTaCandidateSchema>
export const TrackTaCandidateSchema = z.object({
  profileId: z.uuid(),
  name: z.string(),
})

export type AddTrackTaData = z.infer<typeof AddTrackTaSchema>
export const AddTrackTaSchema = z.object({
  trackId: z.uuid(),
  profileId: z.uuid(),
})
