import { storage } from "./database-storage";
// NOTE: Placeholder import removed because seed-vedic-data is not present in this repo.
// Add back when the seed script is available.

export async function initializeDatabase(): Promise<void> {
  console.log("Initializing database with authentic Vedic content...");

  // Create system user for seeding
  const systemUser = await storage.upsertUser({
    id: "system",
    email: "system@vediclms.local",
    firstName: "System",
    lastName: "Admin",
    roles: ["instructor", "admin"],
    status: "active",
  });

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