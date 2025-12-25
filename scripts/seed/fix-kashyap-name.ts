import { db } from "./server/db";
import { users } from "./shared/schema";
import { eq } from "drizzle-orm";

async function updateKashyapName() {
  try {
    console.log("Updating Kashyap's name...");
    
    await db
      .update(users)
      .set({
        firstName: "Kashyap",
        lastName: "Kuchipudi",
        updatedAt: new Date(),
      })
      .where(eq(users.email, "kashyap.kuchipudi@gmail.com"));
    
    console.log("✅ Successfully updated name to Kashyap Kuchipudi");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

updateKashyapName();
