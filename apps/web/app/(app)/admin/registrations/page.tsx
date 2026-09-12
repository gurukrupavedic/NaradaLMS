import type { Metadata } from 'next'

import { RegistrationReview } from '@/components/admin/registration-review'

export const metadata: Metadata = { title: 'Registrations' }

export default function AdminRegistrationsPage() {
  return <RegistrationReview />
}
