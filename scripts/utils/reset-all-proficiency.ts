/**
 * Reset all student proficiency to 9 (Not Started) across all chapters
 * 
 * Usage: npx tsx scripts/utils/reset-all-proficiency.ts
 */

import { db } from '../../server/db';
import { studentProgress } from '@shared/schema';

async function resetAllProficiency() {
  try {
    console.log('🔄 Resetting all student proficiency to 9 (Not Started)...');
    
    const result = await db
      .update(studentProgress)
      .set({
        proficiencyLevel: 9,
        lastEvaluatedAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log(`✅ Reset complete! Updated ${result.length} proficiency records to level 9`);
    
    // Show summary
    if (result.length > 0) {
      console.log('\n📊 Sample of updated records:');
      console.log(result.slice(0, 5).map(r => ({
        studentId: r.studentId,
        chapterId: r.chapterId,
        proficiencyLevel: r.proficiencyLevel,
        updatedAt: r.updatedAt,
      })));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting proficiency:', error);
    process.exit(1);
  }
}

resetAllProficiency();
