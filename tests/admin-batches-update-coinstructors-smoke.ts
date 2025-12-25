async function main() {
  const base = 'http://localhost:5000';

  // Create a batch with one secondary co-instructor (reuse an existing primary)
  const listRes = await fetch(`${base}/api/batches`);
  const listData: any = await listRes.json();
  const items: any[] = listData.items || [];
  const withPrimary = items.find(b => !!b.primaryInstructorId);
  if (!withPrimary) {
    console.error('No batch with primaryInstructorId found; cannot run update test.');
    process.exit(1);
  }
  const primaryInstructorId = withPrimary.primaryInstructorId;

  const ts = Date.now();
  const createPayload = {
    batchCode: `UPDSMOKE-${ts}`,
    batchName: `Update Smoke ${ts}`,
    trackId: withPrimary.trackId ?? undefined,
    primaryInstructorId,
    cohortType: 'grihasta',
    description: 'Update-smoke batch',
    secondaryInstructorIds: [primaryInstructorId],
    createdBy: 'system',
  };

  const createRes = await fetch(`${base}/api/batches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createPayload),
  });
  if (!createRes.ok) {
    console.error('Create failed', createRes.status);
    try { console.error(await createRes.text()); } catch {}
    process.exit(1);
  }
  const created: any = await createRes.json();
  console.log('Created batch id:', created.id);

  // Verify initial co-instructor count
  const detailRes1 = await fetch(`${base}/api/batches/${created.id}`);
  const detail1: any = await detailRes1.json();
  const initialCount = Array.isArray(detail1.coInstructors) ? detail1.coInstructors.length : 0;
  console.log('Initial co-instructors count:', initialCount);

  // Update: remove all co-instructors
  const patchRes = await fetch(`${base}/api/batches/${created.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secondaryInstructorIds: [], assignedBy: 'system' }),
  });
  if (!patchRes.ok) {
    console.error('Patch failed', patchRes.status);
    try { console.error(await patchRes.text()); } catch {}
    process.exit(1);
  }

  // Verify co-instructors removed
  const detailRes2 = await fetch(`${base}/api/batches/${created.id}`);
  const detail2: any = await detailRes2.json();
  const finalCount = Array.isArray(detail2.coInstructors) ? detail2.coInstructors.length : 0;
  const listRes2 = await fetch(`${base}/api/batches/${created.id}/co-instructors`);
  const list: any[] = await listRes2.json();
  console.log('List endpoint count:', list.length);
  console.log('Final co-instructors count:', finalCount);

  if (initialCount > 0 && finalCount === 0 && list.length === 0) {
    console.log('Update Smoke OK');
    process.exit(0);
  } else {
    console.error('Update Smoke FAILED');
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
