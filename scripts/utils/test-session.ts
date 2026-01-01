import { db } from "../../server/db";
import { sessions, users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function testAPIEndpoint() {
  console.log("\n=== TESTING API ENDPOINT ===\n");

  try {
    // Find Kashyap's session
    console.log("STEP 1: Looking for Kashyap's session...");
    const kashyapSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sess, JSON.stringify({ passport: { user: "9d0262d8-d5b0-47fb-8464-76aa52a4672c" } })));

    if (kashyapSessions.length > 0) {
      console.log(`✅ Found session: ${kashyapSessions[0].sid}`);
    } else {
      console.log("⚠️  No exact session found, checking user...");
      
      const kashyapUser = await db
        .select()
        .from(users)
        .where(eq(users.email, "kashyap.kuchipudi@gmail.com"));
      
      if (kashyapUser.length > 0) {
        const user = kashyapUser[0];
        console.log(`✅ Found user: ${user.firstName} ${user.lastName}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        
        // Get all sessions and filter by user ID in session data
        const allSessions = await db.select().from(sessions);
        console.log(`\n   Checking ${allSessions.length} sessions for user ID...`);
        
        let foundSession = false;
        for (const session of allSessions) {
          try {
            const sessData = JSON.parse(session.sess);
            if (sessData.passport?.user === user.id) {
              console.log(`✅ Found session for user: ${session.sid}`);
              foundSession = true;
              break;
            }
          } catch (e) {
            // Invalid JSON, skip
          }
        }
        
        if (!foundSession) {
          console.log("❌ No active session found for Kashyap in database");
          console.log("   User is likely logged in via browser session, not stored in DB");
        }
      }
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
