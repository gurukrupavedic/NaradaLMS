/**
 * Comprehensive proficiency reset - handles all students and chapters
 * 
 * Usage: npx tsx scripts/maintenance/proficiency/full-reset.ts
 */

import { db } from '../../../server/db';
import { chapters, studentProgress, userOrganizations } from '@narada/types';
import { and, eq, sql } from 'drizzle-orm';

async function fullProficiencyReset() {
  try {
    console.log('🔍 Analyzing complete proficiency coverage...\n');
    
    // Get all active student memberships so proficiency rows stay org-scoped
    const activeStudentMemberships = await db
      .select({ studentId: userOrganizations.userId, orgId: userOrganizations.orgId })
      .from(userOrganizations)
      .where(
        and(
          eq(userOrganizations.status, 'active'),
          sql`'student' = ANY(${userOrganizations.roles})`
        )
      );
    
    console.log(`👥 Found ${activeStudentMemberships.length} active student memberships`);
    
    // Get all chapters with org scope
    const allChapters = await db
      .select({ id: chapters.id, orgId: chapters.orgId })
      .from(chapters);
    
    console.log(`📖 Found ${allChapters.length} total chapters`);
    
    // Calculate expected records
    const expectedRecords = activeStudentMemberships.reduce((total, membership) => {
      return (
        total +
        allChapters.filter((chapter) => chapter.orgId === membership.orgId).length
      );
    }, 0);
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
    for (const membership of activeStudentMemberships) {
      for (const chapter of allChapters) {
        if (chapter.orgId !== membership.orgId) {
          continue;
        }

        const key = `${membership.studentId}-${chapter.id}`;
        if (!existingSet.has(key)) {
          missingRecords.push({
            orgId: chapter.orgId,
            studentId: membership.studentId,
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

