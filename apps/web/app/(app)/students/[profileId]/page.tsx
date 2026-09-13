import type { Metadata } from 'next'

import { StudentProfileScreen } from '@/components/student-profile-screen'

type Params = { profileId: string }

export const metadata: Metadata = { title: 'Profile' }

export default async function StudentProfilePage({ params }: { params: Promise<Params> }) {
  const { profileId } = await params

  return <StudentProfileScreen profileId={profileId} />
}
