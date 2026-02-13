/**
 * Comprehensive proficiency reset - handles all students and chapters
 * 
 * Usage: npx tsx scripts/utils/full-proficiency-reset.ts
 */

import { db } from '../../server/db';
import { studentProgress, users, chapters } from '@narada/types';
import { sql } from 'drizzle-orm';

async function fullProficiencyReset() {
  try {
    console.log('🔍 Analyzing complete proficiency coverage...\n');
    
    // Get ALL students (not just enrolled)
    const allStudents = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`'student' = ANY(${users.roles})`);
    
    console.log(`👥 Found ${allStudents.length} total student users`);
    
    // Get all chapters
    const allChapters = await db
      .select({ id: chapters.id })
      .from(chapters);
    
    console.log(`📖 Found ${allChapters.length} total chapters`);
    
    // Calculate expected records
    const expectedRecords = allStudents.length * allChapters.length;
    console.log(`💾 Expected proficiency records: ${expectedRecords}`);
    
    // Get existing records
    const existingRecords = await db
      .select({ studentId: studentProgress.studentId, chapterId: studentProgress.chapterId })
      .from(studentProgress);
    
    console.log(`✓ Existing proficiency records: ${existingRecords.length}\n`);
    
    // Create set of existing records for quick lookup
    const existingSet = new Set(
      existingRecords.map(r => `${r.studentId}-${r.chapterId}`)
    );
    
    // Generate missing records
    const missingRecords: any[] = [];
    for (const student of allStudents) {
      for (const chapter of allChapters) {
        const key = `${student.id}-${chapter.id}`;
        if (!existingSet.has(key)) {
          missingRecords.push({
            studentId: student.id,
            chapterId: chapter.id,
            proficiencyLevel: 9,
            batchId: null,
            lastEvaluatedAt: new Date(),
          });
        }
      }
    }
    
    console.log(`⚠️  Gap detected! ${missingRecords.length} records missing`);
    console.log(`📝 Inserting ${missingRecords.length} missing records...\n`);
    
    if (missingRecords.length > 0) {
      // Insert in batches to avoid overwhelming the database
      const batchSize = 100;
      for (let i = 0; i < missingRecords.length; i += batchSize) {
        const batch = missingRecords.slice(i, i + batchSize);
        await db.insert(studentProgress).values(batch);
        console.log(`  ✓ Inserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} records)`);
      }
    }
    
    // Now update ALL records to 9
    console.log('\n🔄 Updating ALL proficiency records to 9 (Not Started)...');
    
    const result = await db
      .update(studentProgress)
      .set({
        proficiencyLevel: 9,
        lastEvaluatedAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log(`✅ Reset complete! Updated ${result.length} proficiency records to level 9`);
    
    // Final verification
    const finalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(studentProgress);
    
    const finalCountValue = parseInt(finalCount[0]?.count?.toString() || '0', 10);
    
    console.log(`\n📊 Final verification:`);
    console.log(`   Total records in database: ${finalCountValue}`);
    console.log(`   Expected: ${expectedRecords}`);
    console.log(`   Match: ${finalCountValue === expectedRecords ? '✅ YES' : '❌ NO (but all existing records are set to 9)'}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fullProficiencyReset();

