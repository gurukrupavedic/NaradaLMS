import { request } from 'http';

const BASE = process.env.BASE_URL || 'http://localhost:5000';

async function fetchJson(path: string) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { credentials: 'include' as any });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${path}`);
  return res.json();
}

async function main() {
  try {
    const list = await fetchJson('/api/batches?limit=1&offset=0');
    if (!list || !Array.isArray(list.items)) throw new Error('Unexpected list shape');
    console.log(`batches: ${list.items.length}`);

    if (list.items.length === 0) {
      console.log('No batches available; smoke test done.');
      return;
    }

    const id = list.items[0].id;
    const detail = await fetchJson(`/api/batches/${id}`);
    if (!detail || typeof detail !== 'object') throw new Error('Unexpected detail shape');
    console.log(`batch ${id} ok`);

    const enrollments = await fetchJson(`/api/batches/${id}/enrollments`);
    if (!Array.isArray(enrollments)) throw new Error('Unexpected enrollments shape');
    console.log(`enrollments count: ${enrollments.length}`);

    console.log('Smoke OK');
  } catch (err: any) {
    console.error('Smoke FAILED:', err?.message || err);
    process.exitCode = 1;
  }
}

main();
