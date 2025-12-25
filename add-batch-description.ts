import { sql } from 'drizzle-orm';
import { db } from './server/db.js';

async function addBatchDescription() {
  try {
    console.log('Adding description column to batches table...');
    
    // First check if the column already exists
    const result = await db.execute(
      sql`SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'batches' AND column_name = 'description'
      )`
    );
    
    const columnExists = result.rows[0].exists;
    
    if (columnExists) {
      console.log('✓ Description column already exists');
      return;
    }
    
    // Add the column
    await db.execute(
      sql`ALTER TABLE "batches" ADD COLUMN "description" text`
    );
    
    console.log('✓ Successfully added description column to batches table');
  } catch (error) {
    if (error.message?.includes('already exists')) {
      console.log('✓ Description column already exists');
    } else {
      console.error('Error adding column:', error);
      process.exit(1);
    }
  }
}

addBatchDescription().then(() => {
  console.log('✓ Migration complete');
  process.exit(0);
});
