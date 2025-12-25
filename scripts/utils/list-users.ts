import { config } from 'dotenv';
import { Client } from 'pg';

config();

async function listUsers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    const result = await client.query(
      `SELECT id, email, first_name, last_name, roles, status 
       FROM users 
       ORDER BY created_at DESC 
       LIMIT 20`
    );
    
    console.log('\n📋 Users in database:\n');
    result.rows.forEach((user, idx) => {
      console.log(`${idx + 1}. ${user.email}`);
      console.log(`   Name: ${user.first_name || ''} ${user.last_name || ''}`);
      console.log(`   Roles: ${user.roles?.join(', ') || 'none'}`);
      console.log(`   Status: ${user.status}\n`);
    });
    
    console.log(`Total users: ${result.rows.length}`);
  } catch (error) {
    console.error('❌ Error listing users:', error);
  } finally {
    await client.end();
  }
}

listUsers();
