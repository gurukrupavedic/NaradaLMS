import { db } from "./db";
import { users, tracks, chapters, audioFiles, textSegments, audioMappings, studentProgress } from "@shared/schema";

export async function seedDatabase() {
  console.log("Seeding database with authentic Vedic content...");

  // Seed test user with all roles for development
  const testUser = {
    id: "test-user",
    email: "admin@vedic-lms.com",
    firstName: "Test",
    lastName: "User",
    roles: ["student", "instructor", "content_manager", "admin"],
    status: "active"
  };

  await db.insert(users).values(testUser).onConflictDoNothing();

  // Seed authentic Vedic track
  const [track] = await db.insert(tracks).values({
    title: "Vaidika Nithya Karma",
    description: "Essential daily Vedic practices and regulations for spiritual discipline",
    order: 1,
    status: "published",
    createdBy: "test-user",
    publishedBy: "test-user",
    publishedAt: new Date()
  }).returning().onConflictDoNothing();

  if (!track) {
    console.log("Track already exists, fetching...");
    const existingTrack = await db.select().from(tracks).where(eq(tracks.title, "Vaidika Nithya Karma")).limit(1);
    if (existingTrack.length === 0) {
      throw new Error("Failed to create or find track");
    }
  }

  // Seed Śraddhā Sūktam chapter
  const [chapter] = await db.insert(chapters).values({
    title: "Śraddhā sūktaṁ",
    trackId: track?.id || 1,
    order: 2,
    status: "published",
    content: {
      introduction: "The Śraddhā Sūktam is a sacred Vedic hymn dedicated to faith and devotion, essential for spiritual practice.",
      purpose: "To cultivate unwavering faith and devotion in spiritual practice"
    },
    createdBy: "test-user",
    publishedBy: "test-user",
    publishedAt: new Date()
  }).returning().onConflictDoNothing();

  if (!chapter) {
    console.log("Chapter already exists, fetching...");
    const existingChapter = await db.select().from(chapters).where(eq(chapters.title, "Śraddhā sūktaṁ")).limit(1);
    if (existingChapter.length === 0) {
      throw new Error("Failed to create or find chapter");
    }
  }

  const chapterId = chapter?.id || 2;

  // Seed authentic audio file
  await db.insert(audioFiles).values({
    chapterId,
    filename: "shraddha-suktam-1.m4a",
    reciter: "Authentic Vedic Recitation",
    duration: 99,
    fileSize: 830797,
    uploadedBy: "test-user"
  }).onConflictDoNothing();

  // Seed authentic text segments
  const segments = [
    { text: { te: "శ్ర॒ద్ధాయా॒ఽగ్నిః సమి॑ధ్యతే", hi: "श्र॒द्धाया॒-ऽग्नि-स्समि॑ध्यते", en: "oṁ śra̱ddhayā̱'gnissami̍dhyate" }, order: 1 },
    { text: { te: "శ్ర॒ద్ధయా॑ విందతే హ॒విః", hi: "श्र॒द्धया॑ विन्दते ह॒विः", en: "śra̱ddhayā̍ vindateha̱viḥ" }, order: 2 },
    { text: { te: "శ్ర॒ద్ధాం భగ॑స్య మూ॒ర్ధని॑", hi: "श्र॒द्धा-म्भग॑स्य मू॒र्धनि॑", en: "śra̱ddhāṁ bhaga̍sya mū̱rdhani̍" }, order: 3 },
    { text: { te: "వచ॒సాఽఽవే॑దయామసి", hi: "वच॒सा-ऽऽवे॑दयामसि", en: "vaca̱sā ve̍dayāmasi" }, order: 4 },
    { text: { te: "ప్రి॒యగ్గ్ శ్ర॑ద్ధే॒ దద॑తః", hi: "प्रि॒यग्ग् श्र॑द्धे॒ दद॑तः", en: "pri̱yagg śra̍ddhe̱ dada̍taḥ" }, order: 5 },
    { text: { te: "ప్రి॒యగ్గ్ శ్ర॑ద్ధే॒ దిదా॑సతః", hi: "प्रि॒यग्ग् श्र॑द्धे॒ दिदा॑सतः", en: "pri̱yagg śra̍ddhe̱ didā̍sataḥ" }, order: 6 },
    { text: { te: "ప్రి॒యం భో॒జేషు॒ యజ్వ॑సు", hi: "प्रि॒य-म्भो॒जेषु॒ यज्व॑सु", en: "pri̱yaṁ bho̱jeṣu̱ yajva̍su" }, order: 7 },
    { text: { te: "ఇ॒దం మ॑ ఉది॒తం కృ॑ధి", hi: "इ॒द-म्म॑ उदि॒त-ङ्कृ॑धि", en: "i̱damma̍ udi̱taṁ kṛ̍dhi" }, order: 8 },
    { text: { te: "యథా॑ దే॒వా అసు॑రేషు", hi: "यथा॑ दे॒वा असु॑रेषु", en: "yathā̍ de̱vā asu̍ reṣu" }, order: 9 },
    { text: { te: "శ్ర॒ద్ధాము॒గ్రేషు॑ చక్రి॒రే", hi: "श्र॒द्धामु॒ग्रेषु॑ चक्रि॒रे", en: "śra̱ddhāmu̱greṣu̍ cakri̱re" }, order: 10 }
  ];

  for (const segment of segments) {
    await db.insert(textSegments).values({
      chapterId,
      text: segment.text,
      order: segment.order,
      createdBy: "test-user"
    }).onConflictDoNothing();
  }

  // Seed audio mappings with authentic timestamps
  const mappings = [
    { segmentId: 1, startTime: 3, endTime: 7 },
    { segmentId: 2, startTime: 8, endTime: 11 },
    { segmentId: 3, startTime: 12, endTime: 15 },
    { segmentId: 4, startTime: 16, endTime: 19 },
    { segmentId: 5, startTime: 20, endTime: 22 },
    { segmentId: 6, startTime: 23, endTime: 27 },
    { segmentId: 7, startTime: 28, endTime: 30 },
    { segmentId: 8, startTime: 30, endTime: 32 },
    { segmentId: 9, startTime: 33, endTime: 36 },
    { segmentId: 10, startTime: 37, endTime: 40 }
  ];

  for (const mapping of mappings) {
    await db.insert(audioMappings).values({
      audioFileId: 1,
      segmentId: mapping.segmentId,
      startTime: mapping.startTime,
      endTime: mapping.endTime,
      createdBy: "test-user"
    }).onConflictDoNothing();
  }

  // Seed student progress
  await db.insert(studentProgress).values({
    studentId: "test-user",
    chapterId,
    proficiencyLevel: 4,
    studyTimeMinutes: 120,
    lastAccessedAt: new Date()
  }).onConflictDoNothing();

  console.log("Database seeded with authentic Vedic content successfully!");
}