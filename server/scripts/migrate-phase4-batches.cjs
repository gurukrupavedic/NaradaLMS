// Manual migration for Phase 4: flexible batches (CommonJS)
// Adds batch_code, makes track_id and primary_instructor_id nullable

require('dotenv').config();
const { Client } = require('pg');

function buildDatabaseUrl() {
  if (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE) {
    const port = process.env.PGPORT || '5432';
    const encodedPassword = encodeURIComponent(process.env.PGPASSWORD);
    const host = process.env.PGHOST;
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    const sslSuffix = isLocal ? '' : '?sslmode=require';
    return `postgresql://${process.env.PGUSER}:${encodedPassword}@${host}:${port}/${process.env.PGDATABASE}${sslSuffix}`;
  }
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  throw new Error('DATABASE_URL or PG* environment variables must be set');
}

async function run() {
  const url = buildDatabaseUrl();
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('BEGIN');

    // Add batch_code if missing
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'batches' AND column_name = 'batch_code'
        ) THEN
          ALTER TABLE batches ADD COLUMN batch_code text;
        END IF;
      END$$;
    `);

    // Populate batch_code for existing rows if NULL
    await client.query(`
      UPDATE batches SET batch_code = COALESCE(batch_code, LEFT(batch_name, 32));
    `);

    // Enforce NOT NULL on batch_code
    await client.query(`
      ALTER TABLE batches ALTER COLUMN batch_code SET NOT NULL;
    `);

    // Make track_id nullable
    await client.query(`
      ALTER TABLE batches ALTER COLUMN track_id DROP NOT NULL;
    `);

    // Make primary_instructor_id nullable
    await client.query(`
      ALTER TABLE batches ALTER COLUMN primary_instructor_id DROP NOT NULL;
    `);

    await client.query('COMMIT');
    console.log('Phase 4 migration complete.');
  } catch (err) {
    console.error('Phase 4 migration failed:', err);
    try { await client.query('ROLLBACK'); } catch {}
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();
