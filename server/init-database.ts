import { identityStorage } from "./modules/identity-access/storage";
import { CURRICULUM_IMPORT_ACTOR_PROFILE } from "./shared/constants/system-actors";
// NOTE: Placeholder import removed because seed-vedic-data is not present in this repo.
// Add back when the seed script is available.

export async function initializeDatabase(): Promise<void> {
  console.log("Initializing database with authentic Vedic content...");

  // Create dedicated curriculum import actor for bootstrap data
  const systemUser = await identityStorage.upsertUser(CURRICULUM_IMPORT_ACTOR_PROFILE);

  console.log("System user created:", systemUser.id);

  // Seed authentic Vedic data (stubbed until seed script is available)
  console.log("Database initialization completed successfully (no seed script executed)");
}

// Run initialization if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  initializeDatabase()
    .then(() => {
      console.log("Database seeding completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Database seeding failed:", error);
      process.exit(1);
    });
}