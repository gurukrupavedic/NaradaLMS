import { db } from "./db";
import { tracks, chapters } from "@shared/schema";
import { eq } from "drizzle-orm";

// Authentic 8-track Vedic curriculum data from prototype files
const AUTHENTIC_TRACKS_DATA = [
  {
    title: "Vaidika Nithya Karma",
    description: "Essential daily Vedic practices and rituals for spiritual development",
    order: 1,
    status: "published" as const,
    estimatedHours: 120,
    chapters: [
      { title: "vedādhyayana niyamamulu, veda svaraṁ, pañcāṅgaṁ, saṅkalpaṁ, yajñopavīta dhāraṇaṁ, avapośanaṁ", order: 1 },
      { title: "Śraddhā sūktaṁ", order: 2 },
      { title: "Medhā sūktaṁ", order: 3 },
      { title: "Durgā sūktaṁ", order: 4 },
      { title: "Śrī sūktaṁ", order: 5 },
      { title: "Puruṣa sūktaṁ", order: 6 },
      { title: "krṣṇa yajurveda sandhyāvaṁdanaṁ", order: 7 },
      { title: "brahmayajña vidhiḥ, tarpaṇa vidhiḥ", order: 8 },
      { title: "agnikāryaṁ (brahmacāriṇakaraṇīyaṁ)", order: 9 },
      { title: "vaidika nitya karma vidhānaṁ", order: 10 }
    ]
  },
  {
    title: "Sookta Paatham",
    description: "Sacred hymns and verses for devotional practice and spiritual elevation",
    order: 2,
    status: "published" as const,
    estimatedHours: 100,
    chapters: [
      { title: "Gaṇapatyatharvaśīrṣopaniṣat", order: 1 },
      { title: "nārāyaṇa sūktaṁ", order: 2 },
      { title: "viṣṇu sūktaṁ", order: 3 },
      { title: "bhūsūktaṁ", order: 4 },
      { title: "nīḷā sūktaṁ", order: 5 },
      { title: "bhāgya sūktaṁ", order: 6 },
      { title: "brahma sūktaṁ", order: 7 },
      { title: "sarpa sūktaṁ", order: 8 },
      { title: "pavamāna sūktaṁ", order: 9 },
      { title: "mahā mantrapuṣpaṁ", order: 10 },
      { title: "sarasvatī sūktaṁ", order: 11 },
      { title: "go sūktaṁ", order: 12 },
      { title: "āyuṣya sūktaṁ", order: 13 },
      { title: "manyu sūktaṁ", order: 14 },
      { title: "navagraha, upadevatā mantrāḥ", order: 15 }
    ]
  },
  {
    title: "Rudram, Shaakunadi, Ganapati Pooja, Punyaahavaachanam",
    description: "Advanced worship practices including Rudra prayers and ceremonial procedures",
    order: 3,
    status: "published" as const,
    estimatedHours: 80,
    chapters: [
      { title: "śrīrudrapraśnaḥ (namakaṁ)", order: 1 },
      { title: "camakapraśnaḥ", order: 2 },
      { title: "dīpa prajvālana & nīrājana mantrāh", order: 3 },
      { title: "śākunādi mantrāḥ", order: 4 },
      { title: "trisuparṇa mantrāḥ", order: 5 },
      { title: "vighneśvara pūja", order: 6 },
      { title: "puṇyāhavācanaṁ", order: 7 },
      { title: "vighneśvara pūjā vidhānaṁ", order: 8 },
      { title: "puṇyāhavācana pūjā vidhānaṁ", order: 9 }
    ]
  },
  {
    title: "Mahaanyaasadhikam & Sakala Devataa Pooja Vidhaanam",
    description: "Comprehensive deity worship procedures and advanced ceremonial practices",
    order: 4,
    status: "published" as const,
    estimatedHours: 90,
    chapters: [
      { title: "mahānyāsaḥ", order: 1 },
      { title: "laghunyāsaṁ rudrasnānārcanādi prayogaḥ", order: 2 },
      { title: "daśaśāṁtayaḥ", order: 3 },
      { title: "sāmrājya paṭṭābhiṣekaḥ", order: 4 },
      { title: "puruṣa sūkta (viṣṇu) pūjā vidhānaṁ", order: 5 },
      { title: "śrī sūkta (devī) pūjā vidhānaṁ", order: 6 },
      { title: "Guru (vedokta/purāṇokta) pūjā vidhānaṁ", order: 7 }
    ]
  },
  {
    title: "Swasthi Mantraah, Agni Mukham, Nakshatreshti",
    description: "Auspicious mantras, fire ceremonies, and stellar worship practices",
    order: 5,
    status: "published" as const,
    estimatedHours: 70,
    chapters: [
      { title: "yajurveda āśīrvacana mantrāh", order: 1 },
      { title: "pūrṇakuṁbha svāgata mantrāh", order: 2 },
      { title: "paṁcānuvāka mantrāh", order: 3 },
      { title: "vaiśvānara (agni) sūktaṁ", order: 4 },
      { title: "catuṣpātra prayogaḥ", order: 5 },
      { title: "agni pradakṣiṇaṁ", order: 6 },
      { title: "ābdika mantrā: (anna sūktaṁ)", order: 7 },
      { title: "trtīyāṣṭake prathamaḥ prapāṭhakaḥ - nakṣatreṣṭi", order: 8 }
    ]
  },
  {
    title: "Upanishad Mantraah",
    description: "Sacred Upanishadic teachings and philosophical foundations",
    order: 6,
    status: "published" as const,
    estimatedHours: 110,
    chapters: [
      { title: "āraṇyake saptamaḥ praśnaḥ - śīkṣā valli", order: 1 },
      { title: "āraṇyake aṣṭamaḥ praśnaḥ - brahmānaṁda valli", order: 2 },
      { title: "āraṇyake navamaḥ praśnaḥ - bhṛguvalli", order: 3 },
      { title: "āraṇyake trtīyaḥ praśnaḥ – citti", order: 4 },
      { title: "āraṇyake daśamaḥ praśnaḥ - mahānārāyaṇa upaniṣat", order: 5 }
    ]
  },
  {
    title: "Pancha Kaatakam Part I",
    description: "First section of the five Kathaka collections with specialized ceremonies",
    order: 7,
    status: "published" as const,
    estimatedHours: 60,
    chapters: [
      { title: "kāṭhake prathamaḥ prapāṭhakaḥ - sāvitra cayanaṁ", order: 1 },
      { title: "kāṭhake dvitīyaḥ prapāṭhakaḥ - nāciketa cayanaṁ", order: 2 },
      { title: "kāṭhake trtīyaḥ prapāṭhakaḥ - cāturhotra vaiśvasrja cayanaṁ ca", order: 3 }
    ]
  },
  {
    title: "Pancha Kaatakam Part II",
    description: "Second section of the Kathaka collections with Aranyaka teachings",
    order: 8,
    status: "published" as const,
    estimatedHours: 50,
    chapters: [
      { title: "āraṇyake prathamaḥ praśnaḥ – aruṇaṁ", order: 1 },
      { title: "āraṇyake dvitīyaḥ praśnaḥ – svādhyāya brāhmaṇaṁ", order: 2 }
    ]
  }
];

export async function seedAuthenticData(createdBy: string) {
  console.log("Seeding authentic Vedic curriculum data...");
  
  for (const trackData of AUTHENTIC_TRACKS_DATA) {
    // Check if track already exists
    const existingTrack = await db.select().from(tracks).where(eq(tracks.title, trackData.title)).limit(1);
    
    let trackId: number;
    
    if (existingTrack.length === 0) {
      // Create new track
      const [newTrack] = await db.insert(tracks).values({
        title: trackData.title,
        description: trackData.description,
        order: trackData.order,
        status: trackData.status,
        estimatedHours: trackData.estimatedHours,
        createdBy,
      }).returning();
      
      trackId = newTrack.id;
      console.log(`Created track: ${trackData.title}`);
    } else {
      trackId = existingTrack[0].id;
      console.log(`Track already exists: ${trackData.title}`);
    }
    
    // Create chapters for this track
    for (const chapterData of trackData.chapters) {
      const existingChapter = await db.select().from(chapters)
        .where(eq(chapters.title, chapterData.title))
        .limit(1);
        
      if (existingChapter.length === 0) {
        await db.insert(chapters).values({
          title: chapterData.title,
          trackId,
          order: chapterData.order,
          status: "published",
          content: {
            te: `${chapterData.title} - Telugu content to be added`,
            hi: `${chapterData.title} - Devanagari content to be added`, 
            en: `${chapterData.title} - English/IAST content to be added`
          },
          createdBy,
        });
        console.log(`  Created chapter: ${chapterData.title}`);
      }
    }
  }
  
  console.log("Authentic curriculum data seeding completed!");
}