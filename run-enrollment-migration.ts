import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function runMigration() {
  console.log('🔄 Running enrollment one-to-many migration...\n');

  try {
    // Step 1: Check for violations
    console.log('Step 1: Checking for existing violations...');
    const violations = await db.execute(sql`
      SELECT student_id, COUNT(*) as enrollment_count
      FROM enrollments
      WHERE status = 'active'
      GROUP BY student_id
      HAVING COUNT(*) > 1
    `);

    if (violations.rows.length > 0) {
      console.warn(`⚠️  WARNING: Found ${violations.rows.length} students with multiple active enrollments:`);
      console.table(violations.rows);
      console.log('\nPlease resolve these violations before proceeding.');
      process.exit(1);
    } else {
      console.log('✅ No violations found. Safe to proceed.\n');
    }

    // Step 2: Create unique index
    console.log('Step 2: Creating partial unique index...');
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS unique_active_enrollment_idx 
      ON enrollments(student_id) 
      WHERE status = 'active'
    `);
    console.log('✅ Unique index created successfully.\n');

    // Step 3: Verify index creation
    console.log('Step 3: Verifying index...');
    const indexCheck = await db.execute(sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE indexname = 'unique_active_enrollment_idx'
    `);

    if (indexCheck.rows.length > 0) {
      console.log('✅ Index verified:');
      console.log(indexCheck.rows[0]);
    } else {
      console.error('❌ Index was not created properly');
      process.exit(1);
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('Students can now only enroll in ONE batch at a time.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runMigration();
