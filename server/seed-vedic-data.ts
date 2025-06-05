import { storage } from "./storage-database";

export async function seedVedicData(createdBy: string) {
  console.log("Seeding authentic Vedic data to PostgreSQL...");

  // Create the main track
  const track = await storage.createTrack({
    title: "Vaidika Nithya Karma",
    description: "Essential daily Vedic practices and regulations for spiritual discipline",
    order: 1,
    status: "published",
    estimatedHours: 120,
    createdBy: createdBy,
  });

  console.log(`Created track: ${track.title}`);

  // Create Śraddhā sūktaṁ chapter
  const chapter = await storage.createChapter({
    trackId: track.id,
    title: "Śraddhā sūktaṁ",
    order: 2,
    status: "published",
    content: {
      te: "శ్ర॒ద్ధాయా॒ఽగ్నిః సమి॑ధ్యతే శ్ర॒ద్ధయా॑ హూ॒యతే॒ హవిః॑ | శ్ర॒ద్ధాం భా॒గస్య॑ కేవ॒లే మ॒న్యస్వా॑తె॒ య జీ॑వతి || ప్రి॒యగ్గ్ శ్ర॑ద్ధే॒ దిదా॑సతః ప్రి॒యం భో॒జేషు॒ యజ్వ॑సు | ఇ॒దం మ॑ ఉది॒తం కృ॑ధి యథా॑ దే॒వా అసు॑రేషు ||",
      hi: "श्र॒द्धाया॒-ऽग्नि-स्समि॑ध्यते श्र॒द्धया॑ हू॒यते॒ हवि-स् | श्र॒द्धा-म्भा॒गस्य॑ केव॒ले म॒न्यस्वा॑ते॒ य जी॑वति || प्रि॒यग्ग् श्र॑द्धे॒ दिदा॑सत-स्प्रि॒य-म्भो॒जेषु॒ यज्व॑सु | इ॒द-म्म॑ उदि॒त-ङ्कृ॑धि यथा॑ दे॒वा असु॑रेषु ||",
      en: "śra̠ddhāyā̠-'gni-ssami̍dhyatē śra̠ddhayā̍ hū̠yatē̠ havi̍s | śra̠ddhā-mbhā̠gasya̍ kēva̠lē ma̠nyasvā̍tē̠ ya jī̍vati || pri̠yagg śra̍ddhē̠ didā̍satas pri̠ya-mbhō̠jēṣu̠ yajva̍su | i̠da-mma̍ udi̠ta-ṅkṛ̍dhi yathā̍ dē̠vā asu̍rēṣu ||"
    },
    createdBy: createdBy,
    lastEditedBy: createdBy,
  });

  console.log(`Created chapter: ${chapter.title}`);

  // Create audio file
  const audioFile = await storage.createAudioFile({
    chapterId: chapter.id,
    filename: "shraddha-suktam-1.m4a",
    originalName: "Shraddha Suktam - 1.m4a",
    reciter: "1.2 Ravikiran guruvugaru - sukta patham",
    duration: 99,
    fileSize: 2450000,
    mimeType: "audio/m4a",
    uploadedBy: createdBy,
  });

  console.log(`Created audio file: ${audioFile.filename}`);

  // Create text segments with character position references
  const segments = [
    {
      conceptualName: "Opening Invocation - Agni and Faith",
      textReferences: {
        te: { start: 0, end: 25 },
        hi: { start: 0, end: 28 },
        en: { start: 0, end: 30 }
      }
    },
    {
      conceptualName: "Faith and Oblation",
      textReferences: {
        te: { start: 26, end: 55 },
        hi: { start: 29, end: 59 },
        en: { start: 31, end: 62 }
      }
    },
    {
      conceptualName: "Faith as Ultimate",
      textReferences: {
        te: { start: 58, end: 95 },
        hi: { start: 62, end: 99 },
        en: { start: 65, end: 102 }
      }
    },
    {
      conceptualName: "Living in Faith",
      textReferences: {
        te: { start: 96, end: 140 },
        hi: { start: 100, end: 144 },
        en: { start: 103, end: 155 }
      }
    },
    {
      conceptualName: "Beloved of the Faithful - Desiring",
      textReferences: {
        te: { start: 143, end: 173 },
        hi: { start: 147, end: 178 },
        en: { start: 158, end: 189 }
      }
    },
    {
      conceptualName: "Among Bhojas and Sacrifice",
      textReferences: {
        te: { start: 176, end: 203 },
        hi: { start: 181, end: 209 },
        en: { start: 192, end: 221 }
      }
    },
    {
      conceptualName: "Make This Rise",
      textReferences: {
        te: { start: 208, end: 230 },
        hi: { start: 214, end: 237 },
        en: { start: 226, end: 252 }
      }
    },
    {
      conceptualName: "Gods Against Asuras",
      textReferences: {
        te: { start: 233, end: 257 },
        hi: { start: 240, end: 265 },
        en: { start: 255, end: 277 }
      }
    }
  ];

  const createdSegments = [];
  for (const segmentData of segments) {
    const segment = await storage.createTextSegment({
      chapterId: chapter.id,
      conceptualName: segmentData.conceptualName,
      textReferences: segmentData.textReferences,
      createdBy: createdBy,
    });
    createdSegments.push(segment);
    console.log(`Created segment: ${segment.conceptualName}`);
  }

  // Create audio mappings
  const mappings = [
    { segmentIndex: 0, startTime: 3, endTime: 7 },
    { segmentIndex: 1, startTime: 8, endTime: 11 },
    { segmentIndex: 2, startTime: 12, endTime: 15 },
    { segmentIndex: 3, startTime: 16, endTime: 19 },
    { segmentIndex: 4, startTime: 23, endTime: 27 },
    { segmentIndex: 5, startTime: 28, endTime: 30 },
    { segmentIndex: 6, startTime: 30, endTime: 32 },
    { segmentIndex: 7, startTime: 33, endTime: 36 },
  ];

  for (const mappingData of mappings) {
    const mapping = await storage.createAudioMapping({
      audioFileId: audioFile.id,
      segmentId: createdSegments[mappingData.segmentIndex].id,
      startTime: mappingData.startTime,
      endTime: mappingData.endTime,
      createdBy: createdBy,
    });
    console.log(`Created mapping for segment: ${createdSegments[mappingData.segmentIndex].conceptualName}`);
  }

  console.log("Vedic data seeding completed successfully!");
  return { track, chapter, audioFile, segments: createdSegments };
}