import { db } from "./server/db";
import { users } from "./shared/schema";
import { sql } from "drizzle-orm";

const firstNames = [
  // Male names
  "Arjun", "Rohan", "Aarav", "Vihaan", "Aditya", "Arnav", "Krishna", "Dev", "Ishaan", "Kabir",
  "Rudra", "Shaurya", "Ayaan", "Pranav", "Reyansh", "Dhruv", "Vivaan", "Advait", "Sai", "Yash",
  "Anirudh", "Atharv", "Darsh", "Karthik", "Madhav", "Neel", "Rishaan", "Vedant", "Samarth", "Tejas",
  // Female names
  "Aadhya", "Ananya", "Diya", "Isha", "Kavya", "Kiara", "Myra", "Navya", "Saanvi", "Sara",
  "Anika", "Avni", "Charvi", "Mahika", "Pari", "Riya", "Shanaya", "Tara", "Vanya", "Zara",
  "Aditi", "Anushka", "Divya", "Ishita", "Jiya", "Meera", "Nisha", "Priya", "Shreya", "Tanvi",
  "Aarushi", "Devanshi", "Gauri", "Janvi", "Kashvi", "Mahi", "Palak", "Rhea", "Siya", "Vidya"
];

const lastNames = [
  "Sharma", "Kumar", "Patel", "Singh", "Reddy", "Gupta", "Iyer", "Rao", "Nair", "Joshi",
  "Agarwal", "Menon", "Pillai", "Varma", "Verma", "Deshmukh", "Kulkarni", "Shetty", "Mehta", "Shah",
  "Naidu", "Malhotra", "Kapoor", "Choudhary", "Mishra", "Trivedi", "Pandey", "Bhat", "Jain", "Chopra",
  "Banerjee", "Mukherjee", "Das", "Ghosh", "Roy", "Chatterjee", "Dutta", "Sen", "Bose", "Chakraborty",
  "Krishnan", "Raman", "Subramanian", "Swamy", "Srinivasan", "Venkatesh", "Ramesh", "Murthy", "Narayanan", "Karthikeyan"
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function addIndianNames() {
  try {
    console.log("Fetching all users...");
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} users\n`);

    for (const user of allUsers) {
      const firstName = getRandomElement(firstNames);
      const lastName = getRandomElement(lastNames);
      
      await db
        .update(users)
        .set({
          firstName,
          lastName,
          updatedAt: new Date(),
        })
        .where(sql`${users.id} = ${user.id}`);
      
      console.log(`✓ Updated ${user.email} → ${firstName} ${lastName}`);
    }

    console.log(`\n✅ Successfully updated ${allUsers.length} users with Indian names!`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

addIndianNames();
