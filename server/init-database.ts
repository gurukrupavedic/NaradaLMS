import { storage } from "./database-storage";
import { seedVedicData } from "./seed-vedic-data";

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

  // Seed authentic Vedic data
  await seedVedicData(systemUser.id);

  console.log("Database initialization completed successfully!");
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