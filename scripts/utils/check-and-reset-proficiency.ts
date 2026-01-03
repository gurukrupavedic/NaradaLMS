/**
 * Check proficiency data coverage and reset/create for all student/chapter combinations
 * 
 * Usage: npx tsx scripts/utils/check-and-reset-proficiency.ts
 */

import { db } from '../../server/db';
import { studentProgress, enrollments, chapters } from '@shared/schema';
import { inArray } from 'drizzle-orm';

async function checkAndResetProficiency() {
  try {
    console.log('🔍 Checking proficiency data coverage...\n');
    
    // Get all active students
    const activeStudents = await db
      .select({ studentId: enrollments.studentId })
      .from(enrollments)
      .where(({ status }) => status === 'active');
    
    console.log(`📚 Found ${activeStudents.length} active enrolled students`);
    
    // Get all chapters
    const allChapters = await db
      .select({ id: chapters.id })
      .from(chapters);
    
    console.log(`📖 Found ${allChapters.length} total chapters`);
    
    // Calculate expected records
    const expectedRecords = activeStudents.length * allChapters.length;
    console.log(`💾 Expected proficiency records: ${expectedRecords}`);
    
    // Get existing records
    const existingRecords = await db
      .select({ studentId: studentProgress.studentId, chapterId: studentProgress.chapterId })
      .from(studentProgress);
    
    console.log(`✓ Existing proficiency records: ${existingRecords.length}\n`);
    
    if (existingRecords.length < expectedRecords) {
      console.log(`⚠️  Gap detected! ${expectedRecords - existingRecords.length} records missing`);
      console.log('Creating missing records...\n');
      
      // Create set of existing records for quick lookup
      const existingSet = new Set(
        existingRecords.map(r => `${r.studentId}-${r.chapterId}`)
      );
      
      // Generate missing records
      const missingRecords: any[] = [];
      for (const student of activeStudents) {
        for (const chapter of allChapters) {
          const key = `${student.studentId}-${chapter.id}`;
          if (!existingSet.has(key)) {
            missingRecords.push({
              studentId: student.studentId,
              chapterId: chapter.id,
              proficiencyLevel: 9,
              batchId: null,
              lastEvaluatedAt: new Date(),
            });
          }
        }
      }
      
      console.log(`📝 Inserting ${missingRecords.length} missing records...`);
      if (missingRecords.length > 0) {
        await db.insert(studentProgress).values(missingRecords);
        console.log(`✅ Inserted ${missingRecords.length} records`);
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
    const finalCheck = await db
      .select({ count: studentProgress.id })
      .from(studentProgress);
    
    console.log(`\n📊 Final verification: ${finalCheck.length} total records in studentProgress`);
    console.log(`   Expected: ${expectedRecords}`);
    console.log(`   Match: ${finalCheck.length === expectedRecords ? '✅ YES' : '❌ NO'}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAndResetProficiency();
