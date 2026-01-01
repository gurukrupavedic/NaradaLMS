import { db } from "../../server/db";
import { users, batches, batchCoInstructors } from "@shared/schema";
import { eq, or, inArray } from "drizzle-orm";

async function testEndToEnd() {
  console.log("\n=== COMPREHENSIVE E2E TEST ===\n");

  try {
    // Step 1: Find the Kashyap user
    console.log("STEP 1: Find Kashyap user...");
    const kashyapUser = await db
      .select()
      .from(users)
      .where(eq(users.email, "kashyap.kuchipudi@gmail.com"));

    if (kashyapUser.length === 0) {
      console.log("❌ User not found: kashyap.kuchipudi@gmail.com");
      process.exit(1);
    }

    const user = kashyapUser[0];
    const instructorId = user.id;
    console.log(`✅ Found: ${user.firstName} ${user.lastName} (ID: ${instructorId})`);
    console.log(`   Roles: ${user.roles?.join(", ")}`);

    // Step 2: Find primary instructor batches
    console.log("\nSTEP 2: Query primary instructor batches...");
    const primaryBatches = await db
      .select()
      .from(batches)
      .where(eq(batches.primaryInstructorId, instructorId));

    console.log(`✅ Found ${primaryBatches.length} primary batches:`);
    primaryBatches.forEach((b) => {
      console.log(`   - ID: ${b.id}, Code: ${b.batchCode}, Name: ${b.batchName}`);
    });

    // Step 3: Find co-instructor batches
    console.log("\nSTEP 3: Query co-instructor batch assignments...");
    const coInstructorAssignments = await db
      .select()
      .from(batchCoInstructors)
      .where(eq(batchCoInstructors.instructorId, instructorId));

    console.log(`✅ Found ${coInstructorAssignments.length} co-instructor assignments:`);
    const coInstructorBatchIds = coInstructorAssignments.map(a => a.batchId);
    coInstructorAssignments.forEach((a) => {
      console.log(`   - Batch ID: ${a.batchId}`);
    });

    // Step 4: Get co-instructor batch details
    console.log("\nSTEP 4: Get details of co-instructor batches...");
    if (coInstructorBatchIds.length > 0) {
      const coBatches = await db
        .select()
        .from(batches)
        .where(inArray(batches.id, coInstructorBatchIds));

      console.log(`✅ Found ${coBatches.length} co-instructor batches:`);
      coBatches.forEach((b) => {
        console.log(`   - ID: ${b.id}, Code: ${b.batchCode}, Name: ${b.batchName}`);
      });
    }

    // Step 5: Test the actual query logic
    console.log("\nSTEP 5: Test actual query logic (simulating endpoint)...");
    let whereCondition: any;
    if (coInstructorBatchIds.length > 0) {
      whereCondition = or(
        eq(batches.primaryInstructorId, instructorId),
        inArray(batches.id, coInstructorBatchIds)
      );
    } else {
      whereCondition = eq(batches.primaryInstructorId, instructorId);
    }

    const allBatches = await db
      .select()
      .from(batches)
      .where(whereCondition)
      .orderBy(batches.createdAt);

    console.log(`✅ Query returned ${allBatches.length} batches:`);
    allBatches.forEach((b) => {
      console.log(`   - ID: ${b.id}, Code: ${b.batchCode}, Name: ${b.batchName}`);
    });

    // Step 6: Summary
    console.log("\n=== SUMMARY ===");
    console.log(`✅ Primary batches: ${primaryBatches.length}`);
    console.log(`✅ Co-instructor assignments: ${coInstructorAssignments.length}`);
    console.log(`✅ Total batches from query: ${allBatches.length}`);
    console.log(`✅ Expected total: ${primaryBatches.length + coInstructorBatchIds.length}`);

    if (allBatches.length === primaryBatches.length + coInstructorBatchIds.length) {
      console.log("\n✨ SUCCESS: Query logic is working correctly!");
    } else {
      console.log("\n❌ MISMATCH: Query returned unexpected number of batches");
    }

    process.exit(0);
  } catch (error) {
    console.error("\n❌ ERROR:", error);
    process.exit(1);
  }
}

testEndToEnd();
