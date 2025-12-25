import { config } from 'dotenv';
import { Client } from 'pg';

config();

const sampleBatches = [
  {
    batchCode: 'BR01',
    batchName: 'Bramhachari Batch - Morning',
    description: 'Intensive morning session for bramhachari students focusing on Vedic fundamentals and daily recitation practice.',
    cohortType: 'bramhachari',
  },
  {
    batchCode: 'GR01',
    batchName: 'Grihasta Batch - Evening',
    description: 'Evening batch designed for householders with flexible timing to accommodate family and work schedules.',
    cohortType: 'grihasta',
  },
  {
    batchCode: 'BR02',
    batchName: 'Bramhachari Advanced',
    description: 'Advanced level bramhachari program for students who have completed foundational courses.',
    cohortType: 'bramhachari',
  },
  {
    batchCode: 'GR02',
    batchName: 'Grihasta Weekend Program',
    description: 'Weekend intensive sessions for grihasta students to deepen their Vedic knowledge.',
    cohortType: 'grihasta',
  },
  {
    batchCode: 'BR03',
    batchName: 'Bramhachari Intensive Summer',
    description: 'Summer intensive program for bramhachari students with extended study hours.',
    cohortType: 'bramhachari',
  },
  {
    batchCode: 'GR03',
    batchName: 'Grihasta Online Learning',
    description: 'Online batch for grihasta students who prefer flexible learning from home.',
    cohortType: 'grihasta',
  },
  {
    batchCode: 'BR04',
    batchName: 'Bramhachari Specialization',
    description: 'Specialized bramhachari program focusing on Sanskrit grammar and Vedic interpretation.',
    cohortType: 'bramhachari',
  },
  {
    batchCode: 'GR04',
    batchName: 'Grihasta Monthly Sessions',
    description: 'Monthly cohort program for grihasta practitioners to maintain consistent learning.',
    cohortType: 'grihasta',
  },
  {
    batchCode: 'BR05',
    batchName: 'Bramhachari Mentorship Program',
    description: 'One-on-one mentorship program for advanced bramhachari students with senior educators.',
    cohortType: 'bramhachari',
  },
  {
    batchCode: 'GR05',
    batchName: 'Grihasta Community Learning',
    description: 'Community-based learning program for grihasta families to study Vedas together.',
    cohortType: 'grihasta',
  },
];

async function createSampleBatches() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    // Get first track ID
    const trackResult = await client.query('SELECT id FROM tracks LIMIT 1');
    const trackId = trackResult.rows[0]?.id;
    
    if (!trackId) {
      console.error('❌ No tracks found in database. Please create tracks first.');
      return;
    }
    console.log(`📚 Using track ID: ${trackId}`);

    // Get instructor IDs (use both kashyap and sample users)
    const instructorResult = await client.query(
      "SELECT id FROM users WHERE roles && ARRAY['instructor'::text] OR email = 'kashyap.kuchipudi@gmail.com' LIMIT 10"
    );
    
    if (instructorResult.rows.length === 0) {
      console.error('❌ No instructors found in database. Please create users first.');
      return;
    }
    const instructorIds = instructorResult.rows.map(r => r.id);
    console.log(`👨‍🏫 Found ${instructorIds.length} instructors`);

    // Get a valid createdBy user
    const createdByResult = await client.query(
      "SELECT id FROM users WHERE email = 'kashyap.kuchipudi@gmail.com' LIMIT 1"
    );
    const createdBy = createdByResult.rows[0]?.id;
    
    if (!createdBy) {
      console.error('❌ User kashyap.kuchipudi@gmail.com not found');
      return;
    }

    let created = 0;
    let skipped = 0;

    for (let i = 0; i < sampleBatches.length; i++) {
      const batch = sampleBatches[i];
      const primaryInstructorId = instructorIds[i % instructorIds.length];

      try {
        const result = await client.query(
          `INSERT INTO batches (batch_code, batch_name, track_id, primary_instructor_id, cohort_type, description, created_by, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
           RETURNING id, batch_code, batch_name`,
          [batch.batchCode, batch.batchName, trackId, primaryInstructorId, batch.cohortType, batch.description, createdBy]
        );
        
        console.log(`✅ Created: ${result.rows[0].batch_code} - ${result.rows[0].batch_name}`);
        created++;
      } catch (error: any) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`⏭️  Skipped: ${batch.batchCode} (already exists)`);
          skipped++;
        } else {
          console.error(`❌ Failed to create ${batch.batchCode}:`, error.message);
        }
      }
    }

    console.log(`\n📊 Summary: ${created} created, ${skipped} skipped`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

createSampleBatches();
