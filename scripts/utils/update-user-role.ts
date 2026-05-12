import { config } from 'dotenv';
import { Client } from 'pg';

config();

async function updateUserRole() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    const result = await client.query(
      `UPDATE user_organizations uo
       SET roles = ARRAY['student', 'admin']::text[],
           status = 'active',
           approved_at = COALESCE(uo.approved_at, NOW()),
           updated_at = NOW()
       FROM users u
       JOIN organizations o ON o.slug = 'slmts'
       WHERE uo.user_id = u.id
         AND uo.org_id = o.id
         AND u.email = $1
       RETURNING u.email, o.slug AS org_slug, uo.roles`,
      ['kashyap.kuchipudi@gmail.com']
    );
    
    if (result.rows.length > 0) {
      console.log('✅ User updated successfully:', result.rows[0]);
    } else {
      console.log('❌ User not found with email: kashyap.kuchipudi@gmail.com');
    }
  } catch (error) {
    console.error('❌ Error updating user:', error);
  } finally {
    await client.end();
  }
}

updateUserRole();
