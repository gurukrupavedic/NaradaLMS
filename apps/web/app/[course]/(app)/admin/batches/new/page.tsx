import type { Metadata } from 'next'

import { CreateBatchForm } from '@/components/admin/create-batch-form'

export const metadata: Metadata = { title: 'New batch' }

export default function NewBatchPage() {
  return <CreateBatchForm />
}
