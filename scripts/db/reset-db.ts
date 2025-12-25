import 'dotenv/config';
import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function resetDatabase() {
  try {
    console.log('🔄 Resetting database...');
    
    // Drop the status column if it still exists
    try {
      await db.execute(
        sql`ALTER TABLE "batches" DROP COLUMN IF EXISTS "status"`
      );
      console.log('✓ Removed status column from batches');
    } catch (e) {
      // Column might not exist, that's fine
    }

    console.log('✓ Database reset complete');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
}

resetDatabase();
