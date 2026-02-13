import { db } from "../../server/db";
import { users } from "@narada/types";
import { eq } from "drizzle-orm";

/**
 * Session Debugging Utility
 *
 * Usage: npx tsx scripts/utils/test-session.ts
 *
 * Verifies the test user exists in the database. The app uses stateless JWT;
 * there is no session table in @narada/types schema.
 */

async function testAPIEndpoint() {
  console.log("\n=== TESTING API ENDPOINT ===\n");

  try {
    console.log("STEP 1: Checking user...");
    const kashyapUser = await db
      .select()
      .from(users)
      .where(eq(users.email, "kashyap.kuchipudi@gmail.com"));

    if (kashyapUser.length > 0) {
      const user = kashyapUser[0];
      console.log(`✅ Found user: ${user.firstName} ${user.lastName}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
    } else {
      console.log("⚠️  User not found");
    }

    console.log("\n✨ API should work if user is logged in via browser session");
    console.log("   Make sure to test with browser that has active session cookie");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ ERROR:", error);
    process.exit(1);
  }
}

testAPIEndpoint();
