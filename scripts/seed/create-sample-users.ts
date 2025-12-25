import { config } from 'dotenv';
import { Client } from 'pg';
import bcrypt from 'bcrypt';

config();

const sampleUsers = [
  { firstName: 'Arjun', lastName: 'Sharma', email: 'test1@vediclms.com' },
  { firstName: 'Priya', lastName: 'Patel', email: 'test2@vediclms.com' },
  { firstName: 'Vikram', lastName: 'Reddy', email: 'test3@vediclms.com' },
  { firstName: 'Anjali', lastName: 'Gupta', email: 'test4@vediclms.com' },
  { firstName: 'Rahul', lastName: 'Iyer', email: 'test5@vediclms.com' },
  { firstName: 'Kavya', lastName: 'Menon', email: 'test6@vediclms.com' },
  { firstName: 'Aditya', lastName: 'Nair', email: 'test7@vediclms.com' },
  { firstName: 'Sneha', lastName: 'Verma', email: 'test8@vediclms.com' },
  { firstName: 'Kiran', lastName: 'Kumar', email: 'test9@vediclms.com' },
  { firstName: 'Deepa', lastName: 'Rao', email: 'test10@vediclms.com' },
];

async function createSampleUsers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    // Hash the password once for all users
    const password = 'welcome123';
    const passwordHash = await bcrypt.hash(password, 10);
    console.log('🔐 Password hashed');

    let created = 0;
    let skipped = 0;

    for (const user of sampleUsers) {
      try {
        const result = await client.query(
          `INSERT INTO users (email, first_name, last_name, password_hash, provider, status, roles, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'local', 'pending_approval', ARRAY[]::text[], NOW(), NOW())
           RETURNING id, email, first_name, last_name`,
          [user.email, user.firstName, user.lastName, passwordHash]
        );
        
        console.log(`✅ Created: ${result.rows[0].first_name} ${result.rows[0].last_name} (${result.rows[0].email})`);
        created++;
      } catch (error: any) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`⏭️  Skipped: ${user.email} (already exists)`);
          skipped++;
        } else {
          console.error(`❌ Failed to create ${user.email}:`, error.message);
        }
      }
    }

    console.log(`\n📊 Summary: ${created} created, ${skipped} skipped`);
    console.log(`🔑 Password for all accounts: ${password}`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

createSampleUsers();
