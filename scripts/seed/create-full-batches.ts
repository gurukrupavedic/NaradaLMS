import { db } from "./server/db";
import { batches, batchCoInstructors, enrollments, users, tracks } from "./shared/schema";
import { eq, sql } from "drizzle-orm";

async function createBatchesWithData() {
  try {
    console.log("Fetching users and tracks...\n");
    
    // Get all users by role
    const allUsers = await db.select().from(users).where(eq(users.status, 'active'));
    const instructors = allUsers.filter(u => u.roles.includes('instructor'));
    const students = allUsers.filter(u => u.roles.includes('student'));
    const allTracks = await db.select().from(tracks);
    
    console.log(`Found ${instructors.length} instructors, ${students.length} students, ${allTracks.length} tracks\n`);

    if (instructors.length < 3) {
      console.error("❌ Need at least 3 instructors (1 primary + 2 co-instructors per batch)");
      process.exit(1);
    }

    // Batch definitions
    const batchData = [
      {
        batchCode: "RV-2024-A",
        batchName: "Rigveda Fundamentals - Morning Batch",
        cohortType: "brahmacharya",
        description: "Intensive morning session focusing on Rigveda mantras and pronunciation. Suitable for dedicated celibate students pursuing full-time Vedic studies."
      },
      {
        batchCode: "YV-2024-B",
        batchName: "Yajurveda Essentials - Evening Batch",
        cohortType: "grihastha",
        description: "Evening classes designed for householder students balancing family life with Vedic learning. Focus on practical rituals and applications."
      },
      {
        batchCode: "SV-2024-C",
        batchName: "Samaveda Chanting - Weekend Batch",
        cohortType: "brahmacharya",
        description: "Weekend intensive for learning Samaveda musical notations and traditional chanting methods. Requires prior knowledge of basic Vedic pronunciation."
      },
      {
        batchCode: "AV-2024-D",
        batchName: "Atharvaveda Studies - Advanced",
        cohortType: "grihastha",
        description: "Advanced level course covering Atharvaveda texts, rituals, and philosophical concepts. Ideal for working professionals seeking deeper spiritual knowledge."
      },
      {
        batchCode: "RV-2025-E",
        batchName: "Rigveda Recitation - Beginners",
        cohortType: "brahmacharya",
        description: "Beginner-friendly introduction to Rigveda recitation techniques. No prior experience required. Step-by-step guidance on pronunciation and memorization."
      },
      {
        batchCode: "YV-2025-F",
        batchName: "Yajurveda Rituals - Intermediate",
        cohortType: "grihastha",
        description: "Intermediate level batch focusing on Yajurveda ritual practices and their modern applications. Combines theoretical knowledge with practical demonstrations."
      }
    ];

    const createdBatches = [];
    
    // Get a random subset helper
    function getRandomSubset<T>(arr: T[], count: number): T[] {
      const shuffled = [...arr].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
    }

    // Create each batch
    for (let i = 0; i < batchData.length; i++) {
      const data = batchData[i];
      const track = allTracks[i % allTracks.length]; // Cycle through tracks
      
      // Pick instructors (ensure different ones for variety)
      const primaryInstructor = instructors[i % instructors.length];
      const coInstructors = getRandomSubset(
        instructors.filter(inst => inst.id !== primaryInstructor.id),
        2
      );

      console.log(`Creating batch: ${data.batchCode} - ${data.batchName}`);
      
      // Create batch
      const [batch] = await db.insert(batches).values({
        batchCode: data.batchCode,
        batchName: data.batchName,
        trackId: track.id,
        primaryInstructorId: primaryInstructor.id,
        cohortType: data.cohortType,
        description: data.description,
        createdBy: primaryInstructor.id,
      }).returning();

      console.log(`  ✓ Created batch (ID: ${batch.id})`);
      console.log(`  ✓ Track: ${track.title}`);
      console.log(`  ✓ Primary Instructor: ${primaryInstructor.firstName} ${primaryInstructor.lastName}`);

      // Add co-instructors
      for (const coInst of coInstructors) {
        await db.insert(batchCoInstructors).values({
          batchId: batch.id,
          instructorId: coInst.id,
          role: 'co_instructor',
          assignedBy: primaryInstructor.id,
        });
        console.log(`  ✓ Co-Instructor: ${coInst.firstName} ${coInst.lastName}`);
      }

      // Enroll 3-5 random students
      const numStudents = 3 + Math.floor(Math.random() * 3); // 3-5 students
      const batchStudents = getRandomSubset(students, Math.min(numStudents, students.length));
      
      for (const student of batchStudents) {
        // Check if student is already enrolled in another batch
        const existing = await db
          .select()
          .from(enrollments)
          .where(
            sql`${enrollments.studentId} = ${student.id} AND ${enrollments.status} = 'active'`
          );
        
        if (existing.length === 0) {
          await db.insert(enrollments).values({
            batchId: batch.id,
            studentId: student.id,
            status: 'active',
            enrolledBy: primaryInstructor.id,
          });
          console.log(`  ✓ Enrolled: ${student.firstName} ${student.lastName}`);
        }
      }

      createdBatches.push(batch);
      console.log("");
    }

    console.log(`✅ Successfully created ${createdBatches.length} batches with instructors and students!`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

createBatchesWithData();
