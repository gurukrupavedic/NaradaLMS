import { OpsAuthPage } from '@/components/auth/OpsAuthPage';
import { Suspense } from 'react';

export default function Home() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <OpsAuthPage />
    </Suspense>
  );
}
