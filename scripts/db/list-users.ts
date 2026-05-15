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
      `SELECT
         u.id,
         u.email,
         u.first_name,
         u.last_name,
         COALESCE(
           string_agg(
             o.slug || ': ' || uo.status || ' [' || array_to_string(uo.roles, ', ') || ']',
             ' | ' ORDER BY o.slug
           ),
           'none'
         ) AS memberships
       FROM users u
       LEFT JOIN user_organizations uo ON uo.user_id = u.id
       LEFT JOIN organizations o ON o.id = uo.org_id
       GROUP BY u.id, u.email, u.first_name, u.last_name, u.created_at
       ORDER BY u.created_at DESC 
       LIMIT 20`
    );
    
    console.log('\n📋 Users in database:\n');
    result.rows.forEach((user, idx) => {
      console.log(`${idx + 1}. ${user.email}`);
      console.log(`   Name: ${user.first_name || ''} ${user.last_name || ''}`);
      console.log(`   Memberships: ${user.memberships}\n`);
    });
    
    console.log(`Total users: ${result.rows.length}`);
  } catch (error) {
    console.error('❌ Error listing users:', error);
  } finally {
    await client.end();
  }
}

listUsers();
