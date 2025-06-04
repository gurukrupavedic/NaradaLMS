import { db } from "./db";
import { tracks, chapters, users } from "@shared/schema";
import { eq } from "drizzle-orm";

// Authentic 8-track Vedic curriculum from prototype files
const AUTHENTIC_CURRICULUM = [
  {
    title: "Vaidika Nithya Karma",
    description: "Essential daily Vedic practices and rituals for spiritual development",
    order: 1,
    estimatedHours: 120,
    chapters: [
      "vedādhyayana niyamamulu, veda svaraṁ, pañcāṅgaṁ, saṅkalpaṁ, yajñopavīta dhāraṇaṁ, avapośanaṁ",
      "Śraddhā sūktaṁ", "Medhā sūktaṁ", "Durgā sūktaṁ", "Śrī sūktaṁ", "Puruṣa sūktaṁ",
      "krṣṇa yajurveda sandhyāvaṁdanaṁ", "brahmayajña vidhiḥ, tarpaṇa vidhiḥ",
      "agnikāryaṁ (brahmacāriṇakaraṇīyaṁ)", "vaidika nitya karma vidhānaṁ"
    ]
  },
  {
    title: "Sookta Paatham",
    description: "Sacred hymns and verses for devotional practice and spiritual elevation",
    order: 2,
    estimatedHours: 100,
    chapters: [
      "Gaṇapatyatharvaśīrṣopaniṣat", "nārāyaṇa sūktaṁ", "viṣṇu sūktaṁ", "bhūsūktaṁ",
      "nīḷā sūktaṁ", "bhāgya sūktaṁ", "brahma sūktaṁ", "sarpa sūktaṁ", "pavamāna sūktaṁ",
      "mahā mantrapuṣpaṁ", "sarasvatī sūktaṁ", "go sūktaṁ", "āyuṣya sūktaṁ",
      "manyu sūktaṁ", "navagraha, upadevatā mantrāḥ"
    ]
  },
  {
    title: "Rudram, Shaakunadi, Ganapati Pooja, Punyaahavaachanam",
    description: "Advanced worship practices including Rudra prayers and ceremonial procedures",
    order: 3,
    estimatedHours: 80,
    chapters: [
      "śrīrudrapraśnaḥ (namakaṁ)", "camakapraśnaḥ", "dīpa prajvālana & nīrājana mantrāh",
      "śākunādi mantrāḥ", "trisuparṇa mantrāḥ", "vighneśvara pūja", "puṇyāhavācanaṁ",
      "vighneśvara pūjā vidhānaṁ", "puṇyāhavācana pūjā vidhānaṁ"
    ]
  },
  {
    title: "Mahaanyaasadhikam & Sakala Devataa Pooja Vidhaanam",
    description: "Comprehensive deity worship procedures and advanced ceremonial practices",
    order: 4,
    estimatedHours: 90,
    chapters: [
      "mahānyāsaḥ", "laghunyāsaṁ rudrasnānārcanādi prayogaḥ", "daśaśāṁtayaḥ",
      "sāmrājya paṭṭābhiṣekaḥ", "puruṣa sūkta (viṣṇu) pūjā vidhānaṁ",
      "śrī sūkta (devī) pūjā vidhānaṁ", "Guru (vedokta/purāṇokta) pūjā vidhānaṁ"
    ]
  },
  {
    title: "Swasthi Mantraah, Agni Mukham, Nakshatreshti",
    description: "Auspicious mantras, fire ceremonies, and stellar worship practices",
    order: 5,
    estimatedHours: 70,
    chapters: [
      "yajurveda āśīrvacana mantrāh", "pūrṇakuṁbha svāgata mantrāh", "paṁcānuvāka mantrāh",
      "vaiśvānara (agni) sūktaṁ", "catuṣpātra prayogaḥ", "agni pradakṣiṇaṁ",
      "ābdika mantrā: (anna sūktaṁ)", "trtīyāṣṭake prathamaḥ prapāṭhakaḥ - nakṣatreṣṭi"
    ]
  },
  {
    title: "Upanishad Mantraah",
    description: "Sacred Upanishadic teachings and philosophical foundations",
    order: 6,
    estimatedHours: 110,
    chapters: [
      "āraṇyake saptamaḥ praśnaḥ - śīkṣā valli", "āraṇyake aṣṭamaḥ praśnaḥ - brahmānaṁda valli",
      "āraṇyake navamaḥ praśnaḥ - bhṛguvalli", "āraṇyake trtīyaḥ praśnaḥ – citti",
      "āraṇyake daśamaḥ praśnaḥ - mahānārāyaṇa upaniṣat"
    ]
  },
  {
    title: "Pancha Kaatakam Part I",
    description: "First section of the five Kathaka collections with specialized ceremonies",
    order: 7,
    estimatedHours: 60,
    chapters: [
      "kāṭhake prathamaḥ prapāṭhakaḥ - sāvitra cayanaṁ",
      "kāṭhake dvitīyaḥ prapāṭhakaḥ - nāciketa cayanaṁ",
      "kāṭhake trtīyaḥ prapāṭhakaḥ - cāturhotra vaiśvasrja cayanaṁ ca"
    ]
  },
  {
    title: "Pancha Kaatakam Part II",
    description: "Second section of the Kathaka collections with Aranyaka teachings",
    order: 8,
    estimatedHours: 50,
    chapters: [
      "āraṇyake prathamaḥ praśnaḥ – aruṇaṁ",
      "āraṇyake dvitīyaḥ praśnaḥ – svādhyāya brāhmaṇaṁ"
    ]
  }
];

export async function initializeDatabase(): Promise<void> {
  console.log("Initializing database with authentic Vedic curriculum...");
  
  // Create system admin user if not exists
  const systemAdminId = "system-admin-vedic-lms";
  const existingAdmin = await db.select().from(users).where(eq(users.id, systemAdminId)).limit(1);
  
  if (existingAdmin.length === 0) {
    await db.insert(users).values({
      id: systemAdminId,
      email: "admin@vediclms.system",
      firstName: "System",
      lastName: "Administrator", 
      roles: ["admin", "content_manager", "instructor"],
      status: "active"
    });
    console.log("Created system administrator");
  }

  // Create tracks and chapters
  for (const trackData of AUTHENTIC_CURRICULUM) {
    const existingTrack = await db.select().from(tracks).where(eq(tracks.title, trackData.title)).limit(1);
    
    let trackId: number;
    
    if (existingTrack.length === 0) {
      const [newTrack] = await db.insert(tracks).values({
        title: trackData.title,
        description: trackData.description,
        order: trackData.order,
        status: "published",
        estimatedHours: trackData.estimatedHours,
        createdBy: systemAdminId,
      }).returning();
      
      trackId = newTrack.id;
      console.log(`✓ Created track: ${trackData.title}`);
    } else {
      trackId = existingTrack[0].id;
      console.log(`- Track exists: ${trackData.title}`);
      continue; // Skip chapters if track exists
    }

    // Create chapters
    for (let i = 0; i < trackData.chapters.length; i++) {
      const chapterTitle = trackData.chapters[i];
      
      await db.insert(chapters).values({
        title: chapterTitle,
        trackId,
        order: i + 1,
        status: "published",
        content: {
          te: `${chapterTitle}\n\n[Telugu content to be added by content managers]`,
          hi: `${chapterTitle}\n\n[Devanagari content to be added by content managers]`,
          en: `${chapterTitle}\n\n[English/IAST content to be added by content managers]`
        },
        createdBy: systemAdminId,
      });
    }
    console.log(`  ✓ Created ${trackData.chapters.length} chapters`);
  }
  
  console.log("Database initialization completed successfully!");
}