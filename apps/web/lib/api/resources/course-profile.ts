import { mutateApi } from '@/lib/api/client'
import type { ApiCourseProfile } from '@/lib/api/api-types'

// Both calls are scoped to the course in the URL: `request()` sends it as `x-course-slug`, so they
// always act on the course the page is in. Reading the course profile is part of
// `fetchProfileDetail`'s response (`courseProfile`).

// POST /v1/profiles/:profileId/course-profile/counters/:key — *adds* `count` to one of the course's
// counters (japam) atomically, so two devices adding at once both count. The owner or a school admin;
// resolves to the new total. 404 for a counter the course doesn't keep.
export async function addToCounter(
  profileId: string,
  key: string,
  count: number,
): Promise<{ key: string; total: number }> {
  return mutateApi(`/profiles/${profileId}/course-profile/counters/${key}`, 'POST', { count })
}

// PATCH /v1/profiles/:profileId/course-profile — edits the student's record in this course: only the
// fields sent change (null clears one of the three answers). `details` is itself a patch — only the
// keys sent change, a blank string clears one, and a counter can be set outright (a correction).
// Resolves to the course profile after the edit.
export type UpdateCourseProfileInput = Partial<
  Pick<ApiCourseProfile, 'learningGoal' | 'currentProficiency' | 'comments' | 'details'>
>

export async function updateCourseProfile(
  profileId: string,
  patch: UpdateCourseProfileInput,
): Promise<ApiCourseProfile> {
  return mutateApi(`/profiles/${profileId}/course-profile`, 'PATCH', patch)
}
