import type { Metadata } from 'next'

import { RegistrationDetail } from '@/components/admin/registration-detail'

type Params = { registrationId: string }

export const metadata: Metadata = { title: 'Registration' }

export default async function AdminRegistrationDetailPage({ params }: { params: Promise<Params> }) {
  const { registrationId } = await params

  return <RegistrationDetail registrationId={registrationId} />
}
