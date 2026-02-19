import { db } from "../../server/db";
import { users } from "@narada/types";
import bcrypt from "bcrypt";

/**
 * Generate 30 student users with all fields populated
 * All users are active and have student role
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

  for (const student of studentData) {
    try {
      await db.insert(users).values({
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        password: hashedPassword,
        roles: ["student"],
        status: "active",
        phone: student.phone,
        timezone: student.timezone,
        preferredLanguage: student.preferredLanguage,
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
  console.log("  - Status: active");
  console.log("  - Role: student");
  console.log("  - All fields populated (phone, timezone, preferredLanguage)");
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

