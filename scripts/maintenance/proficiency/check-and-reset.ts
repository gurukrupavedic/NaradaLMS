/**
 * Check proficiency data coverage and reset/create for all student/chapter combinations
 * 
 * Usage: npx tsx scripts/maintenance/proficiency/check-and-reset.ts
 */

import { db } from '../../../server/db';
import { studentProgress, enrollments, chapters } from '@narada/types';
import { eq } from 'drizzle-orm';

async function checkAndResetProficiency() {
  try {
    console.log('🔍 Checking proficiency data coverage...\n');
    
    // Get all active students
    const activeStudents = await db
      .select({ studentId: enrollments.studentId, orgId: enrollments.orgId })
      .from(enrollments)
      .where(eq(enrollments.status, 'active'));
    
    console.log(`📚 Found ${activeStudents.length} active enrolled students`);
    
    // Get all chapters with org scope
    const allChapters = await db
      .select({ id: chapters.id, orgId: chapters.orgId })
      .from(chapters);
    
    console.log(`📖 Found ${allChapters.length} total chapters`);
    
    // Calculate expected records
    const expectedRecords = activeStudents.reduce((total, student) => {
      return (
        total +
        allChapters.filter((chapter) => chapter.orgId === student.orgId).length
      );
    }, 0);
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
          if (chapter.orgId !== student.orgId) {
            continue;
          }

          const key = `${student.studentId}-${chapter.id}`;
          if (!existingSet.has(key)) {
            missingRecords.push({
              orgId: chapter.orgId,
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

