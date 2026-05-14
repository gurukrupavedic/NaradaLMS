import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedOrganizations } from "./db-seeding/seed-organizations";
import { seedVedicCurriculum } from "./db-seeding/seed-vedic-curriculum";

export async function initializeDatabase(): Promise<void> {
  console.log("Initializing database via compatibility wrapper...");
  console.log("Step 1/2: seeding baseline organizations...");
  await seedOrganizations();

  console.log("Step 2/2: seeding curriculum...");
  await seedVedicCurriculum();

  console.log(
    "Initialization complete. For local super-admin bootstrap, run `npm run db:seed-dev` separately."
  );
}

const isMainModule =
  process.argv[1] &&
  path.normalize(process.argv[1]) === path.normalize(fileURLToPath(import.meta.url));

if (isMainModule) {
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