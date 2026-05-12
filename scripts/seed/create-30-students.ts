import { db } from "../../server/db";
import { organizations, userOrganizations, users } from "@narada/types";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

/**
 * Generate 30 student users with all fields populated
 * All users receive an active SLMTS student membership.
 */

const studentData = [
  { firstName: "Aarav", lastName: "Sharma", email: "aarav.sharma@vedic.edu", phone: "+91-9876543210", timezone: "Asia/Kolkata", preferredLanguage: "hi" },
  { firstName: "Vivaan", lastName: "Patel", email: "vivaan.patel@vedic.edu", phone: "+91-9876543211", timezone: "Asia/Kolkata", preferredLanguage: "te" },
  { firstName: "Aditya", lastName: "Kumar", email: "aditya.kumar@vedic.edu", phone: "+91-9876543212", timezone: "Asia/Kolkata", preferredLanguage: "en" },
  { firstName: "Vihaan", lastName: "Singh", email: "vihaan.singh@vedic.edu", phone: "+91-9876543213", timezone: "Asia/Kolkata", preferredLanguage: "hi" },
  { firstName: "Arjun", lastName: "Reddy", email: "arjun.reddy@vedic.edu", phone: "+91-9876543214", timezone: "Asia/Kolkata", preferredLanguage: "te" },
  { firstName: "Sai", lastName: "Verma", email: "sai.verma@vedic.edu", phone: "+91-9876543215", timezone: "Asia/Kolkata", preferredLanguage: "en" },
  { firstName: "Arnav", lastName: "Gupta", email: "arnav.gupta@vedic.edu", phone: "+91-9876543216", timezone: "Asia/Kolkata", preferredLanguage: "hi" },
  { firstName: "Ayaan", lastName: "Rao", email: "ayaan.rao@vedic.edu", phone: "+91-9876543217", timezone: "Asia/Kolkata", preferredLanguage: "te" },
  { firstName: "Krishna", lastName: "Nair", email: "krishna.nair@vedic.edu", phone: "+91-9876543218", timezone: "Asia/Kolkata", preferredLanguage: "en" },
  { firstName: "Ishaan", lastName: "Menon", email: "ishaan.menon@vedic.edu", phone: "+91-9876543219", timezone: "Asia/Kolkata", preferredLanguage: "hi" },
  { firstName: "Reyansh", lastName: "Iyer", email: "reyansh.iyer@vedic.edu", phone: "+91-9876543220", timezone: "Asia/Kolkata", preferredLanguage: "te" },
  { firstName: "Shaurya", lastName: "Pillai", email: "shaurya.pillai@vedic.edu", phone: "+91-9876543221", timezone: "Asia/Kolkata", preferredLanguage: "en" },
  { firstName: "Atharv", lastName: "Desai", email: "atharv.desai@vedic.edu", phone: "+91-9876543222", timezone: "Asia/Kolkata", preferredLanguage: "hi" },
  { firstName: "Advait", lastName: "Joshi", email: "advait.joshi@vedic.edu", phone: "+91-9876543223", timezone: "Asia/Kolkata", preferredLanguage: "te" },
  { firstName: "Pranav", lastName: "Kulkarni", email: "pranav.kulkarni@vedic.edu", phone: "+91-9876543224", timezone: "Asia/Kolkata", preferredLanguage: "en" },
  
  { firstName: "Ananya", lastName: "Sharma", email: "ananya.sharma@vedic.edu", phone: "+91-9876543225", timezone: "Asia/Kolkata", preferredLanguage: "hi" },
  { firstName: "Diya", lastName: "Patel", email: "diya.patel@vedic.edu", phone: "+91-9876543226", timezone: "Asia/Kolkata", preferredLanguage: "te" },
  { firstName: "Aadhya", lastName: "Kumar", email: "aadhya.kumar@vedic.edu", phone: "+91-9876543227", timezone: "Asia/Kolkata", preferredLanguage: "en" },
  { firstName: "Saanvi", lastName: "Singh", email: "saanvi.singh@vedic.edu", phone: "+91-9876543228", timezone: "Asia/Kolkata", preferredLanguage: "hi" },
  { firstName: "Navya", lastName: "Reddy", email: "navya.reddy@vedic.edu", phone: "+91-9876543229", timezone: "Asia/Kolkata", preferredLanguage: "te" },
  { firstName: "Pari", lastName: "Verma", email: "pari.verma@vedic.edu", phone: "+91-9876543230", timezone: "Asia/Kolkata", preferredLanguage: "en" },
  { firstName: "Aanya", lastName: "Gupta", email: "aanya.gupta@vedic.edu", phone: "+91-9876543231", timezone: "Asia/Kolkata", preferredLanguage: "hi" },
  { firstName: "Ira", lastName: "Rao", email: "ira.rao@vedic.edu", phone: "+91-9876543232", timezone: "Asia/Kolkata", preferredLanguage: "te" },
  { firstName: "Myra", lastName: "Nair", email: "myra.nair@vedic.edu", phone: "+91-9876543233", timezone: "Asia/Kolkata", preferredLanguage: "en" },
  { firstName: "Sara", lastName: "Menon", email: "sara.menon@vedic.edu", phone: "+91-9876543234", timezone: "Asia/Kolkata", preferredLanguage: "hi" },
  { firstName: "Kiara", lastName: "Iyer", email: "kiara.iyer@vedic.edu", phone: "+91-9876543235", timezone: "Asia/Kolkata", preferredLanguage: "te" },
  { firstName: "Riya", lastName: "Pillai", email: "riya.pillai@vedic.edu", phone: "+91-9876543236", timezone: "Asia/Kolkata", preferredLanguage: "en" },
  { firstName: "Avni", lastName: "Desai", email: "avni.desai@vedic.edu", phone: "+91-9876543237", timezone: "Asia/Kolkata", preferredLanguage: "hi" },
  { firstName: "Mira", lastName: "Joshi", email: "mira.joshi@vedic.edu", phone: "+91-9876543238", timezone: "Asia/Kolkata", preferredLanguage: "te" },
  { firstName: "Nisha", lastName: "Kulkarni", email: "nisha.kulkarni@vedic.edu", phone: "+91-9876543239", timezone: "Asia/Kolkata", preferredLanguage: "en" },
];

async function createStudents() {
  console.log("🌱 Creating 30 student users...");

  // Default password for all test users
  const hashedPassword = await bcrypt.hash("welcome123", 10);
  const [slmtsOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, "slmts"))
    .limit(1);

  if (!slmtsOrg) {
    throw new Error("SLMTS organization not found. Run db:seed-orgs first.");
  }

  for (const student of studentData) {
    try {
      const [createdUser] = await db
        .insert(users)
        .values({
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          passwordHash: hashedPassword,
          provider: "local",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: users.id });

      await db.insert(userOrganizations).values({
        userId: createdUser.id,
        orgId: slmtsOrg.id,
        roles: ["student"],
        status: "active",
        requestedAt: new Date(),
        approvedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`✅ Created: ${student.firstName} ${student.lastName} (${student.email})`);
    } catch (error: any) {
      if (error.message?.includes("duplicate") || error.code === "23505") {
        console.log(`⚠️  Skipped: ${student.email} (already exists)`);
      } else {
        console.error(`❌ Failed to create ${student.email}:`, error.message);
      }
    }
  }

  console.log("\n✨ Done! Created 30 students with password: welcome123");
  console.log("All students are:");
  console.log("  - Membership status: active");
  console.log("  - Membership role: student");
  console.log("  - Tenant: slmts");
}

createStudents()
  .then(() => {
    console.log("\n✅ Seed script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Seed script failed:", error);
    process.exit(1);
  });

