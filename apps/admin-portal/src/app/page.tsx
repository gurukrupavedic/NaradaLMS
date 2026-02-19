import { AdminAuthPage } from '@/components/auth/AdminAuthPage';
import { Suspense } from 'react';

export default function Home() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <AdminAuthPage />
    </Suspense>
  );
}
