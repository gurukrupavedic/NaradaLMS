import { config } from 'dotenv';
import { Client } from 'pg';

config();

async function assignSecondaryInstructors() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    // Get all batches created in the last few minutes (or all batches with these codes)
    const batchResult = await client.query(
      `SELECT id FROM batches WHERE batch_code IN ('BR01', 'GR01', 'BR02', 'GR02', 'BR03', 'GR03', 'BR04', 'GR04', 'BR05', 'GR05') ORDER BY id`
    );
    const batches = batchResult.rows;
    console.log(`📚 Found ${batches.length} batches to assign instructors to`);

    if (batches.length === 0) {
      console.error('❌ No batches found');
      return;
    }

    // Get all available instructors
    const instructorResult = await client.query(
      "SELECT id FROM users WHERE roles && ARRAY['instructor'::text] OR email = 'kashyap.kuchipudi@gmail.com' ORDER BY id"
    );
    const instructorIds = instructorResult.rows.map(r => r.id);
    console.log(`👨‍🏫 Found ${instructorIds.length} instructors`);

    if (instructorIds.length < 2) {
      console.error('❌ Need at least 2 instructors to assign as secondary');
      return;
    }

    // Get createdBy user (kashyap)
    const createdByResult = await client.query(
      "SELECT id FROM users WHERE email = 'kashyap.kuchipudi@gmail.com' LIMIT 1"
    );
    const createdBy = createdByResult.rows[0]?.id;

    let assignmentCount = 0;

    // For each batch, assign 2 secondary instructors
    for (const batchRow of batches) {
      const batchId = batchRow.id;
      
      // Get the primary instructor for this batch to avoid duplicating
      const primaryInstructorResult = await client.query(
        'SELECT primary_instructor_id FROM batches WHERE id = $1',
        [batchId]
      );
      const primaryInstructorId = primaryInstructorResult.rows[0]?.primary_instructor_id;

      // Pick 2 different instructors that are not the primary
      const availableInstructors = instructorIds.filter(id => id !== primaryInstructorId);
      
      if (availableInstructors.length < 2) {
        console.warn(`⚠️  Batch ${batchId} doesn't have enough secondary instructors available`);
        continue;
      }

      // Assign first two available instructors as secondary
      for (let i = 0; i < 2; i++) {
        const secondaryInstructorId = availableInstructors[i];
        
        try {
          await client.query(
            `INSERT INTO batch_co_instructors (batch_id, instructor_id, role, assigned_by, assigned_at)
             VALUES ($1, $2, 'co_instructor', $3, NOW())`,
            [batchId, secondaryInstructorId, createdBy]
          );
          assignmentCount++;
        } catch (error: any) {
          if (error.code !== '23505') { // Ignore duplicate constraint
            console.error(`❌ Error assigning instructor to batch ${batchId}:`, error.message);
          }
        }
      }
    }

    console.log(`\n✅ Assigned ${assignmentCount} secondary instructor positions (2 per batch)`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

assignSecondaryInstructors();
