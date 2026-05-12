import "dotenv/config";
import { spawn } from "node:child_process";
import { db } from "../../server/db.js";
import { sql } from "drizzle-orm";

function runDrizzleMigrate(): Promise<void> {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";

  return new Promise((resolve, reject) => {
    const child = spawn(command, ["drizzle-kit", "migrate"], {
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`drizzle-kit migrate exited with code ${code ?? "unknown"}`));
    });
  });
}

async function resetDatabase() {
  try {
    console.log("🔄 Resetting database...");
    console.log("Dropping public and drizzle schemas...");

    await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
    await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
    await db.execute(sql`CREATE SCHEMA public`);
    await db.execute(sql`GRANT ALL ON SCHEMA public TO postgres`);
    await db.execute(sql`GRANT ALL ON SCHEMA public TO public`);

    console.log("Applying Drizzle migrations...");
    await runDrizzleMigrate();

    console.log("✓ Database reset complete");
    process.exit(0);
  } catch (error) {
    console.error("Error resetting database:", error);
    process.exit(1);
  }
}

resetDatabase();
