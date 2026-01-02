import 'dotenv/config';
import { db } from '../../server/db.js';
import { sql } from 'drizzle-orm';

async function resetDatabase() {
  try {
    console.log('🔄 Resetting database...');
    
    // Drop all tables
    await db.execute(sql`DROP SCHEMA public CASCADE`);
    await db.execute(sql`CREATE SCHEMA public`);
    await db.execute(sql`GRANT ALL ON SCHEMA public TO postgres`);
    await db.execute(sql`GRANT ALL ON SCHEMA public TO public`);
    
    console.log('✓ Database reset complete - all tables dropped');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
}

resetDatabase();
