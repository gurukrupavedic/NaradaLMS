import { fetchApi, mutateApi } from '@/lib/api/client'
import { getSelectedProfileId } from '@/lib/auth/profile-store'
import type { ApiAuthProfile, ApiBatchWithRole, ApiProfile, ApiProfileDetail } from '@/lib/api/api-types'

// GET /v1/profiles — called from app/login/page.tsx after OTP verification, before any profile is
// selected, so unlike every other fetcher here it never sends `X-Profile-Id` (there isn't one yet).
export async function fetchProfiles(): Promise<ApiProfile[]> {
  return fetchApi<ApiProfile[]>('/profiles')
}

// GET /v1/profile (singular) — the signed-in account's own authorization facts, not a business
// profile (see `ApiAuthProfile`'s own doc comment). Backs `useHasAdminAccess`
// (`lib/auth/profile-store.ts`), which gates the admin nav item and screens.
export async function fetchAuthProfile(): Promise<ApiAuthProfile> {
  return fetchApi<ApiAuthProfile>('/profile')
}

// GET /v1/profiles/:profileId/detail — the profile page: full contact/registration detail plus
// the same track/exam-history shape the dashboard already assembles, for any profile the caller is
// allowed to view (self, a teacher sharing a batch with them, or a school admin — enforced server-
// side by `AccessPolicy#requireCanViewProfile`; a caller outside that set gets a 403 `ApiError`).
export async function fetchProfileDetail(profileId: string): Promise<ApiProfileDetail> {
  return fetchApi<ApiProfileDetail>(`/profiles/${profileId}/detail`)
}

// PATCH /v1/profiles/:profileId — the "edit profile" form (components/edit-profile-dialog.tsx),
// used both by the profile's own owner and by a school admin correcting someone else's.
// `apps/api/src/profiles/service.ts::updateProfile` decides which: a school admin's write carries
// no ownership check, anyone else's only ever succeeds against their own profile. `phone` and
// `yearOfBirth` are deliberately not part of this input, even for an admin — `phone` is the
// BetterAuth login credential, `yearOfBirth` is treated as fixed once recorded — both excluded
// server-side too (`apps/api/src/profiles/schema.ts`'s `UpdateProfileSchema`). `countryTimeZone`
// is excluded for a different reason: it's derived server-side from `city`/`state`/`country`
// whenever any of those change, never set directly.
export type UpdateProfileInput = Partial<
  Pick<
    ApiProfile,
    | 'name'
    | 'city'
    | 'state'
    | 'country'
    | 'email'
    | 'learningGoal'
    | 'currentProficiency'
    | 'spokenLanguages'
    | 'readLanguages'
    | 'parentNames'
    | 'dressCodeAgreed'
    | 'noMeatAgreed'
    | 'noAlcoholAgreed'
    | 'noSmokingAgreed'
    | 'comments'
  >
>

export async function updateProfile(
  profileId: string,
  patch: UpdateProfileInput,
): Promise<ApiProfile> {
  return mutateApi<ApiProfile>(`/profiles/${profileId}`, 'PATCH', patch)
}

// GET /v1/profiles/search — admin-only (AccessPolicy.requireCanSearchProfiles). Backs the "add a
// student" search in components/admin/roster-editor.tsx; `excludeBatchId` filters out profiles who
// already hold a live seat on that batch's roster at the query level (apps/api/src/profiles/
// repository.ts::search), so results are always someone actually addable — a profile on a break
// there is deliberately left in, since adding them back reactivates that same enrollment.
export async function searchProfiles(query: string, excludeBatchId: string): Promise<ApiProfile[]> {
  const params = new URLSearchParams({ excludeBatchId })
  if (query.trim()) params.set('query', query.trim())
  return fetchApi<ApiProfile[]>(`/profiles/search?${params.toString()}`)
}

// GET /v1/profiles/:profileId/batches?withDetail=true — the raw batch+roster shape, dedicated to
// the command palette's batch/student search (components/command-palette.tsx). Deliberately not
// shared with `fetchAdminBatchesWithTracks` above even though it hits the same endpoint: that one
// discards `members` once it reshapes into `AdminBatchRow`, and the palette needs exactly the
// roster this throws away. The self-lookup scoping is the same either way — an admin gets every
// batch in the school, anyone else gets just their own.
export async function fetchBatchesWithRoster(): Promise<ApiBatchWithRole[]> {
  const profileId = getSelectedProfileId()
  const { items } = await fetchApi<{ items: ApiBatchWithRole[] }>(
    `/profiles/${profileId}/batches?withDetail=true&limit=100`,
  )
  return items
}
