'use server'

import { revalidatePath } from 'next/cache'

import { enrollProfile, unenrollProfile } from '@/lib/api/enrollment'
import { searchProfiles } from '@/lib/api/profiles'
import type { ApiProfile } from '@/lib/types'

export async function searchStudentsToEnroll(batchId: string, query: string): Promise<ApiProfile[]> {
  const trimmed = query.trim()
  if (!trimmed) return []
  return searchProfiles({ query: trimmed, excludeBatchId: batchId })
}

export async function enrollStudent(batchId: string, profileId: string): Promise<void> {
  await enrollProfile(batchId, { profileId, role: 'student' })
  revalidatePath(`/admin/batches/${batchId}`)
}

export async function removeStudent(batchId: string, profileId: string): Promise<void> {
  await unenrollProfile(batchId, profileId)
  revalidatePath(`/admin/batches/${batchId}`)
}
