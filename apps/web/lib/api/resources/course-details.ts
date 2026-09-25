import { mutateApi } from '@/lib/api/client'
import type { Details } from '@narada/profile-fields'

// Both calls are scoped to the course in the URL: `request()` sends it as `x-course-slug`, so they
// always act on the course the page is in. Reading the course-level details is part of
// `fetchProfileDetail`'s response (`courseDetails`).

// POST /v1/profiles/:profileId/course-details/counters/:key — *adds* `count` to one of the course's
// counters (japam) atomically, so two devices adding at once both count. The owner or a school admin;
// resolves to the new total. 404 for a counter the course doesn't keep.
export async function addToCounter(
  profileId: string,
  key: string,
  count: number,
): Promise<{ key: string; total: number }> {
  return mutateApi(`/profiles/${profileId}/course-details/counters/${key}`, 'POST', { count })
}

// PATCH /v1/profiles/:profileId/course-details — edits the course-level details: only the keys sent
// change, a blank string clears one, and a counter can be set outright (a correction). Resolves to
// the details after the edit.
export async function updateCourseDetails(
  profileId: string,
  patch: Details,
): Promise<{ details: Details }> {
  return mutateApi(`/profiles/${profileId}/course-details`, 'PATCH', { details: patch })
}
