import type { Metadata } from 'next'

import { UploadDocChaptersForm } from '@/components/admin/upload-doc-chapters-form'

export const metadata: Metadata = { title: 'Upload source documents' }

export default function UploadDocChaptersPage() {
  return <UploadDocChaptersForm />
}
