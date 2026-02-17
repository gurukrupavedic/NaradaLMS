import { StudentAuthPage } from '@/components/auth/StudentAuthPage';
import { Suspense } from 'react';

export default function Home() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <StudentAuthPage />
    </Suspense>
  );
}
