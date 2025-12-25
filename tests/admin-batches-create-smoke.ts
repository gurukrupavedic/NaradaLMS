async function main() {
  const base = 'http://localhost:5000';

  // Get existing batches to find a primary instructor to reuse
  const listRes = await fetch(`${base}/api/batches`, { credentials: 'include' as any } as any);
  if (!listRes.ok) {
    console.error('List batches failed:', listRes.status, listRes.statusText);
    process.exit(1);
  }
  const listData: any = await listRes.json();
  const items: any[] = listData.items || [];
  const withPrimary = items.find(b => !!b.primaryInstructorId);
  if (!withPrimary) {
    console.error('No batch with primaryInstructorId found; cannot run create test.');
    process.exit(1);
  }

  const primaryInstructorId = withPrimary.primaryInstructorId;
  const ts = Date.now();
  const payload = {
    batchCode: `SMOKE-${ts}`,
    batchName: `Smoke Test ${ts}`,
    trackId: withPrimary.trackId ?? undefined,
    primaryInstructorId,
    cohortType: 'grihasta',
    description: 'Smoke-created batch',
    secondaryInstructorIds: [primaryInstructorId],
    createdBy: 'system',
  };

  const createRes = await fetch(`${base}/api/batches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  } as any);

  if (!createRes.ok) {
    console.error('Create batch failed:', createRes.status, createRes.statusText);
    try {
      console.error('Body:', await createRes.text());
    } catch {}
    process.exit(1);
  }

  const created: any = await createRes.json();
  console.log('Created batch id:', created.id);

  // Fetch detail to verify co-instructors present
  const detailRes = await fetch(`${base}/api/batches/${created.id}`);
  if (!detailRes.ok) {
    console.error('Get created batch failed:', detailRes.status, detailRes.statusText);
    process.exit(1);
  }
  const detail: any = await detailRes.json();
  const coCount = Array.isArray(detail.coInstructors) ? detail.coInstructors.length : 0;
  console.log('Co-instructors count:', coCount);

  if (coCount > 0) {
    console.log('Create Smoke OK');
    process.exit(0);
  } else {
    console.error('Create Smoke FAILED: no co-instructors saved');
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
