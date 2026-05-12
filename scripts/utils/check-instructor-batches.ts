import { db } from "../../server/db";
import { users, batches, batchCoInstructors } from "@narada/types";
import { eq, or, inArray } from "drizzle-orm";

/**
 * Utility to visualize instructor batch assignments
 * 
 * Usage: npx tsx scripts/utils/check-instructor-batches.ts
 * 
 * Displays:
 * - Details of the hardcoded 'kashyap.kuchipudi@gmail.com' user
 * - List of batches where user is Primary Instructor
 * - List of batches where user is Co-Instructor
 * - Total unique batch count
 */

async function checkInstructorBatches() {
  try {
    // Find the Kashyap user
    const kashyapUser = await db
      .select()
      .from(users)
      .where(eq(users.email, "kashyap.kuchipudi@gmail.com"));

    if (kashyapUser.length === 0) {
      console.log("❌ User not found: kashyap.kuchipudi@gmail.com");
      return;
    }

    const user = kashyapUser[0];
    console.log(`\n✅ Found user: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
    console.log(`   Email: ${user.email}`);
    // Find batches where user is primary instructor
    const primaryBatches = await db
      .select()
      .from(batches)
      .where(eq(batches.primaryInstructorId, user.id));

    console.log(`\n📚 Primary Instructor Batches: ${primaryBatches.length}`);
    primaryBatches.forEach((b) => {
      console.log(`   - ${b.batchCode}: ${b.batchName} (ID: ${b.id})`);
    });

    // Find batches where user is co-instructor
    const coBatches = await db
      .select()
      .from(batchCoInstructors)
      .where(eq(batchCoInstructors.instructorId, user.id));

    console.log(`\n👥 Co-Instructor Batches: ${coBatches.length}`);
    coBatches.forEach((cb) => {
      console.log(`   - Batch ID: ${cb.batchId}`);
    });

    // Total batches for instructor
    const totalBatchIds = new Set([
      ...primaryBatches.map((b) => b.id),
      ...coBatches.map((cb) => cb.batchId),
    ]);
    console.log(`\n✨ Total Batches for Instructor: ${totalBatchIds.size}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkInstructorBatches();

