import { config } from 'dotenv';
import { Client } from 'pg';

config();

async function updateKashyapName() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    const result = await client.query(
      `UPDATE users 
       SET first_name = $1, last_name = $2
       WHERE email = $3 
       RETURNING email, first_name, last_name`,
      ['Kashyap', 'Kuchipudi', 'kashyap.kuchipudi@gmail.com']
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

updateKashyapName();
