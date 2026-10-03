import * as z from 'zod'

// A TA listed for a track — just enough for a student to know who to approach.
export type TrackTa = z.infer<typeof TrackTaSchema>
export const TrackTaSchema = z.object({
  trackId: z.uuid(),
  profileId: z.uuid(),
  name: z.string(),
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
