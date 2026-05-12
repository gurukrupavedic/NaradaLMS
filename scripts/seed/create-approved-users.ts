import { config } from 'dotenv';
import { Client } from 'pg';
import bcrypt from 'bcrypt';

config();

const firstNames = [
  'Akhilesh', 'Bhavna', 'Chirag', 'Divya', 'Eshan',
  'Fiona', 'Gaurav', 'Hiral', 'Ishan', 'Janvi',
  'Karan', 'Lavanya', 'Madhav', 'Nisha', 'Omkar',
  'Prateek', 'Quincy', 'Ravi', 'Saurav', 'Tara'
];

const lastNames = [
  'Kapoor', 'Singh', 'Patel', 'Sharma', 'Desai',
  'Chopra', 'Bhat', 'Rao', 'Iyer', 'Nair',
  'Dutta', 'Khan', 'Agarwal', 'Verma', 'Sinha',
  'Jain', 'Malhotra', 'Saxena', 'Bhatnagar', 'Ghosh'
];

const roles = ['instructor', 'admin'];

function getRandomRole(): string[] {
  // Every approved membership includes student; add 0-2 elevated roles for variety.
  const numRoles = Math.random() > 0.7 ? 2 : 1;
  const selectedRoles: string[] = ['student'];
  const rolesLeft = [...roles];
  
  for (let i = 0; i < numRoles; i++) {
    const idx = Math.floor(Math.random() * rolesLeft.length);
    selectedRoles.push(rolesLeft[idx]);
    rolesLeft.splice(idx, 1);
  }
  
  return selectedRoles;
}

async function createAndApproveUsers() {
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

    // Get kashyap's ID for approvedBy
    const kashyapResult = await client.query(
      "SELECT id FROM users WHERE email = 'kashyap.kuchipudi@gmail.com' LIMIT 1"
    );
    const kashyapId = kashyapResult.rows[0]?.id;
    
    if (!kashyapId) {
      console.error('❌ Kashyap user not found');
      return;
    }

    let created = 0;
    let skipped = 0;

    // Create 20 users (test11 through test30)
    for (let i = 11; i <= 30; i++) {
      const firstName = firstNames[(i - 11) % firstNames.length];
      const lastName = lastNames[(i - 11) % lastNames.length];
      const email = `test${i}@vediclms.com`;
      const assignedRoles = getRandomRole();

      try {
        await client.query('BEGIN');
        const orgResult = await client.query(
          "SELECT id FROM organizations WHERE slug = 'slmts' LIMIT 1"
        );
        const orgId = orgResult.rows[0]?.id;
        if (!orgId) {
          throw new Error("SLMTS organization not found. Run db:seed-orgs first.");
        }

        const result = await client.query(
          `INSERT INTO users (email, first_name, last_name, password_hash, provider, approved_at, approved_by, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'local', NOW(), $5, NOW(), NOW())
           RETURNING id, email, first_name, last_name`,
          [email, firstName, lastName, passwordHash, kashyapId]
        );
        await client.query(
          `INSERT INTO user_organizations (
             user_id,
             org_id,
             roles,
             status,
             requested_at,
             approved_at,
             approved_by,
             created_at,
             updated_at
           )
           VALUES ($1, $2, $3::text[], 'active', NOW(), NOW(), $4, NOW(), NOW())`,
          [result.rows[0].id, orgId, assignedRoles, kashyapId]
        );
        await client.query('COMMIT');
        
        const user = result.rows[0];
        console.log(`✅ Created & Approved: ${user.first_name} ${user.last_name} (${user.email}) - Membership roles: ${assignedRoles.join(', ')}`);
        created++;
      } catch (error: any) {
        await client.query('ROLLBACK');
        if (error.code === '23505') { // Unique constraint violation
          console.log(`⏭️  Skipped: ${email} (already exists)`);
          skipped++;
        } else {
          console.error(`❌ Failed to create ${email}:`, error.message);
        }
      }
    }

    console.log(`\n📊 Summary: ${created} created & approved, ${skipped} skipped`);
    console.log(`🔑 Password for all accounts: ${password}`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

createAndApproveUsers();
