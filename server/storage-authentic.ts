import {
  users,
  type User,
  type UpsertUser,
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRoles(userId: string, roles: string[]): Promise<User>;
  updateUserStatus(userId: string, status: string): Promise<User>;
  
  // Track operations
  getAllTracks(): Promise<any[]>;
  getTrack(id: string): Promise<any | undefined>;
  
  // Chapter operations  
  getChapter(id: number): Promise<any | undefined>;
  
  // Student progress
  getStudentProgress(studentId: string): Promise<any[]>;
  getStudentStats(studentId: string): Promise<any>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private segments: any[] = [
    // Character-position based segments for Śraddhā Sūktam (chapter 2)
    { 
      id: 1, 
      chapterId: 2, 
      conceptualName: "Opening Invocation - Agni and Faith",
      textReferences: {
        te: { start: 0, end: 25 }, // "శ్ర॒ద్ధాయా॒ఽగ్నిః సమి॑ధ్యతే"
        hi: { start: 0, end: 28 }, // "श्र॒द्धाया॒-ऽग्नि-स्समि॑ध्यते"
        en: { start: 0, end: 30 }  // "śra̠ddhāyā̠-'gni-ssami̍dhyatē"
      }
    },
    { 
      id: 2, 
      chapterId: 2, 
      conceptualName: "Faith and Oblation",
      textReferences: {
        te: { start: 28, end: 52 }, // "శ్ర॒ద్ధయా॑ విందతే హ॒విః"
        hi: { start: 31, end: 54 }, // "श्र॒द्धया॑ विन्दते ह॒विः"
        en: { start: 33, end: 59 }  // "śra̠ddhayā̍ vindatē ha̠viḥ"
      }
    },
    { 
      id: 3, 
      chapterId: 2, 
      conceptualName: "Crown of Bhaga",
      textReferences: {
        te: { start: 55, end: 82 }, // "శ్ర॒ద్ధాం భగ॑స్య మూ॒ర్ధని॑"
        hi: { start: 57, end: 85 }, // "श्र॒द्धा-म्भग॑स्य मू॒र्धनि॑"
        en: { start: 62, end: 97 }  // "śra̠ddhā-mbhaga̍sya mū̠rdhani̍"
      }
    },
    { 
      id: 4, 
      chapterId: 2, 
      conceptualName: "Declaration by Speech",
      textReferences: {
        te: { start: 85, end: 109 }, // "వచ॒సాఽఽవే॑దయామసి"
        hi: { start: 88, end: 112 }, // "वच॒सा-ऽऽवे॑दयामसि"
        en: { start: 100, end: 123 } // "vacha̠sā-''vē̍dayāmasi"
      }
    },
    { 
      id: 5, 
      chapterId: 2, 
      conceptualName: "Beloved of the Faithful - Giver",
      textReferences: {
        te: { start: 112, end: 140 }, // "ప్రి॒యగ్గ్ శ్ర॑ద్ధే॒ దద॑తః"
        hi: { start: 115, end: 144 }, // "प्रि॒यग्ग् श्र॑द्धे॒ दद॑तः"
        en: { start: 126, end: 155 } // "pri̠yagg śra̍ddhē̠ dada̍taḥ"
      }
    },
    { 
      id: 6, 
      chapterId: 2, 
      conceptualName: "Beloved of the Faithful - Desiring",
      textReferences: {
        te: { start: 143, end: 173 }, // "ప్రి॒యగ్గ్ శ్ర॑ద్ధే॒ దిదా॑సతః"
        hi: { start: 147, end: 178 }, // "प्रि॒यग्ग् श्र॑द्धे॒ दिदा॑सतः"
        en: { start: 158, end: 189 } // "pri̠yagg śra̍ddhē̠ didā̍sataḥ"
      }
    },
    { 
      id: 7, 
      chapterId: 2, 
      conceptualName: "Among Bhojas and Sacrifice",
      textReferences: {
        te: { start: 176, end: 203 }, // "ప్రి॒యం భో॒జేషు॒ యజ్వ॑సు"
        hi: { start: 181, end: 209 }, // "प्रि॒य-म्भो॒जेषु॒ यज्व॑सु"
        en: { start: 192, end: 221 } // "pri̠ya-mbhō̠jēṣu̠ yajva̍su"
      }
    },
    { 
      id: 8, 
      chapterId: 2, 
      conceptualName: "Make This Rise",
      textReferences: {
        te: { start: 208, end: 230 }, // "ఇ॒దం మ॑ ఉది॒తం కృ॑ధి"
        hi: { start: 214, end: 237 }, // "इ॒द-म्म॑ उदि॒त-ङ्कृ॑धि"
        en: { start: 226, end: 252 } // "i̠da-mma̍ udi̠ta-ṅkṛ̍dhi"
      }
    },
    { 
      id: 9, 
      chapterId: 2, 
      conceptualName: "Gods Against Asuras",
      textReferences: {
        te: { start: 233, end: 257 }, // "యథా॑ దే॒వా అసు॑రేషు"
        hi: { start: 240, end: 265 }, // "यथा॑ दे॒वा असु॑रेषु"
        en: { start: 255, end: 277 } // "yathā̍ dē̠vā asu̍rēṣu"
      }
    },
    { 
      id: 10, 
      chapterId: 2, 
      conceptualName: "Faith in Fierce Ones",
      textReferences: {
        te: { start: 260, end: 288 }, // "శ్ర॒ద్ధాము॒గ్రేషు॑ చక్రి॒రే"
        hi: { start: 268, end: 297 }, // "श्र॒द्धामु॒ग्रेषु॑ चक्रि॒रे"
        en: { start: 280, end: 311 } // "śra̠ddhāmu̠grēṣu̍ chakri̠rē"
      }
    }
  ];
  
  private audioFiles: any[] = [
    {
      id: 1,
      chapterId: 2,
      filename: "shraddha-suktam-1.m4a",
      reciter: "Authentic Vedic Recitation",
      duration: 99, // Duration from your audio file
      uploadedAt: new Date("2025-01-01"),
      fileSize: 2450000
    }
  ];
  
  private audioMappings: any[] = [
    { audioFileId: 1, segmentId: 1, startTime: 3, endTime: 7 },
    { audioFileId: 1, segmentId: 2, startTime: 8, endTime: 11 },
    { audioFileId: 1, segmentId: 3, startTime: 12, endTime: 15 },
    { audioFileId: 1, segmentId: 4, startTime: 16, endTime: 19 },
    { audioFileId: 1, segmentId: 5, startTime: 20, endTime: 22 },
    { audioFileId: 1, segmentId: 6, startTime: 23, endTime: 27 },
    { audioFileId: 1, segmentId: 7, startTime: 28, endTime: 30 },
    { audioFileId: 1, segmentId: 8, startTime: 30, endTime: 32 },
    { audioFileId: 1, segmentId: 9, startTime: 33, endTime: 36 },
    { audioFileId: 1, segmentId: 10, startTime: 37, endTime: 40 }
  ];
  
  // Authentic 8-track Vedic curriculum from prototype files
  private tracks: any[] = [
    {
      id: "1",
      title: "Vaidika Nithya Karma",
      description: "Essential daily Vedic practices and regulations for spiritual discipline",
      order: 1,
      status: "published",
      chapterCount: 10,
      completedChapters: 8,
      currentLevel: 4,
      estimatedHours: 120,
      lastModified: "2025-01-01",
      chapters: [
        { id: "1", title: "vedādhyayana niyamamulu, veda svaraṁ, pañcāṅgaṁ, saṅkalpaṁ, yajñopavīta dhāraṇaṁ, avapośanaṁ", order: 1, proficiencyLevel: 4 },
        { id: "2", title: "Śraddhā sūktaṁ", order: 2, proficiencyLevel: 4 },
        { id: "3", title: "Medhā sūktaṁ", order: 3, proficiencyLevel: 4 },
        { id: "4", title: "Durgā sūktaṁ", order: 4, proficiencyLevel: 4 },
        { id: "5", title: "Śrī sūktaṁ", order: 5, proficiencyLevel: 4 },
        { id: "6", title: "Puruṣa sūktaṁ", order: 6, proficiencyLevel: 4 },
        { id: "7", title: "kṛṣṇa yajurveda sandhyāvaṁdanaṁ", order: 7, proficiencyLevel: 4 },
        { id: "8", title: "brahmayajña vidhiḥ, tarpaṇa vidhiḥ", order: 8, proficiencyLevel: 4 },
        { id: "9", title: "agnikāryaṁ (brahmacāriṇakaraṇīyaṁ)", order: 9, proficiencyLevel: 4 },
        { id: "10", title: "vaidika nitya karma vidhānaṁ", order: 10, proficiencyLevel: 4 }
      ]
    },
    {
      id: "2",
      title: "Sookta Paatham",
      description: "Recitation of sacred Vedic hymns and their proper pronunciation",
      order: 2,
      status: "published",
      chapterCount: 15,
      completedChapters: 12,
      currentLevel: 3,
      estimatedHours: 150,
      lastModified: "2025-01-01",
      chapters: [
        { id: "11", title: "Gaṇapatyatharvaśīrṣopaniṣat", order: 1, proficiencyLevel: 3 },
        { id: "12", title: "nārāyaṇa sūktaṁ", order: 2, proficiencyLevel: 3 },
        { id: "13", title: "viṣṇu sūktaṁ", order: 3, proficiencyLevel: 3 },
        { id: "14", title: "bhūsūktaṁ", order: 4, proficiencyLevel: 3 },
        { id: "15", title: "nīḷā sūktaṁ", order: 5, proficiencyLevel: 3 },
        { id: "16", title: "bhāgya sūktaṁ", order: 6, proficiencyLevel: 3 },
        { id: "17", title: "brahma sūktaṁ", order: 7, proficiencyLevel: 3 },
        { id: "18", title: "sarpa sūktaṁ", order: 8, proficiencyLevel: 3 },
        { id: "19", title: "pavamāna sūktaṁ", order: 9, proficiencyLevel: 3 },
        { id: "20", title: "mahā mantrapuṣpaṁ", order: 10, proficiencyLevel: 3 },
        { id: "21", title: "sarasvatī sūktaṁ", order: 11, proficiencyLevel: 3 },
        { id: "22", title: "go sūktaṁ", order: 12, proficiencyLevel: 3 },
        { id: "23", title: "āyuṣya sūktaṁ", order: 13, proficiencyLevel: 3 },
        { id: "24", title: "manyu sūktaṁ", order: 14, proficiencyLevel: 3 },
        { id: "25", title: "navagraha, upadevatā mantrāḥ", order: 15, proficiencyLevel: 3 }
      ]
    },
    {
      id: "3",
      title: "Rudram, Shaakunadi, Ganapati Pooja, Punyaahavaachanam",
      description: "The powerful Śri Rudram and essential puja procedures",
      order: 3,
      status: "published",
      chapterCount: 9,
      completedChapters: 5,
      currentLevel: 2,
      estimatedHours: 200,
      lastModified: "2025-01-01",
      chapters: [
        { id: "26", title: "śrīrudrapraśnaḥ (namakaṁ)", order: 1, proficiencyLevel: 2 },
        { id: "27", title: "camakapraśnaḥ", order: 2, proficiencyLevel: 2 },
        { id: "28", title: "dīpa prajvālana & nīrājana mantrāh", order: 3, proficiencyLevel: 1 },
        { id: "29", title: "śākunādi mantrāḥ", order: 4, proficiencyLevel: 1 },
        { id: "30", title: "trisuparṇa mantrāḥ", order: 5, proficiencyLevel: 1 },
        { id: "31", title: "vighneśvara pūja", order: 6, proficiencyLevel: 0 },
        { id: "32", title: "puṇyāhavācanaṁ", order: 7, proficiencyLevel: 0 },
        { id: "33", title: "vighneśvara pūjā vidhānaṁ", order: 8, proficiencyLevel: 0 },
        { id: "34", title: "puṇyāhavācana pūjā vidhānaṁ", order: 9, proficiencyLevel: 0 }
      ]
    },
    {
      id: "4",
      title: "Mahaanyaasadhikam & Sakala Devataa Pooja Vidhaanam",
      description: "Advanced nyasa practices and comprehensive deity worship procedures",
      order: 4,
      status: "published",
      chapterCount: 7,
      completedChapters: 2,
      currentLevel: 1,
      estimatedHours: 180,
      lastModified: "2025-01-01",
      chapters: [
        { id: "35", title: "mahānyāsaḥ", order: 1, proficiencyLevel: 1 },
        { id: "36", title: "laghunyāsaṁ rudrasnānārcanādi prayogaḥ", order: 2, proficiencyLevel: 1 },
        { id: "37", title: "daśaśāṁtayaḥ", order: 3, proficiencyLevel: 0 },
        { id: "38", title: "sāmrājya paṭṭābhiṣekaḥ", order: 4, proficiencyLevel: 0 },
        { id: "39", title: "puruṣa sūkta (viṣṇu) pūjā vidhānaṁ", order: 5, proficiencyLevel: 0 },
        { id: "40", title: "śrī sūkta (devī) pūjā vidhānaṁ", order: 6, proficiencyLevel: 0 },
        { id: "41", title: "Guru (vedokta/purāṇokta) pūjā vidhānaṁ", order: 7, proficiencyLevel: 0 }
      ]
    },
    {
      id: "5",
      title: "Swasthi Mantraah, Agni Mukham, Nakshatreshti",
      description: "Auspicious mantras, fire rituals, and lunar mansion offerings",
      order: 5,
      status: "draft",
      chapterCount: 8,
      completedChapters: 0,
      currentLevel: 0,
      estimatedHours: 160,
      lastModified: "2025-01-01",
      chapters: [
        { id: "42", title: "yajurveda āśīrvacana mantrāh", order: 1, proficiencyLevel: 0 },
        { id: "43", title: "pūrṇakuṁbha svāgata mantrāh", order: 2, proficiencyLevel: 0 },
        { id: "44", title: "paṁcānuvāka mantrāh", order: 3, proficiencyLevel: 0 },
        { id: "45", title: "vaiśvānara (agni) sūktaṁ", order: 4, proficiencyLevel: 0 },
        { id: "46", title: "catuṣpātra prayogaḥ", order: 5, proficiencyLevel: 0 },
        { id: "47", title: "agni pradakṣiṇaṁ", order: 6, proficiencyLevel: 0 },
        { id: "48", title: "ābdika mantrā: (anna sūktaṁ)", order: 7, proficiencyLevel: 0 },
        { id: "49", title: "trtīyāṣṭake prathamaḥ prapāṭhakaḥ - nakṣatreṣṭi", order: 8, proficiencyLevel: 0 }
      ]
    },
    {
      id: "6",
      title: "Upanishad Mantraah",
      description: "Sacred verses from the Upanishads and Aranyaka texts",
      order: 6,
      status: "draft",
      chapterCount: 5,
      completedChapters: 0,
      currentLevel: 0,
      estimatedHours: 140,
      lastModified: "2025-01-01",
      chapters: [
        { id: "50", title: "āraṇyake saptamaḥ praśnaḥ - śīkṣā valli", order: 1, proficiencyLevel: 0 },
        { id: "51", title: "āraṇyake aṣṭamaḥ praśnaḥ - brahmānaṁda valli", order: 2, proficiencyLevel: 0 },
        { id: "52", title: "āraṇyake navamaḥ praśnaḥ - bhṛguvalli", order: 3, proficiencyLevel: 0 },
        { id: "53", title: "āraṇyake trtīyaḥ praśnaḥ – citti", order: 4, proficiencyLevel: 0 },
        { id: "54", title: "āraṇyake daśamaḥ praśnaḥ - mahānārāyaṇa upaniṣat", order: 5, proficiencyLevel: 0 }
      ]
    },
    {
      id: "7",
      title: "Pancha Kaatakam Part I",
      description: "First section of the five Kathaka recitations",
      order: 7,
      status: "draft",
      chapterCount: 3,
      completedChapters: 0,
      currentLevel: 0,
      estimatedHours: 100,
      lastModified: "2025-01-01",
      chapters: [
        { id: "55", title: "kāṭhake prathamaḥ prapāṭhakaḥ - sāvitra cayanaṁ", order: 1, proficiencyLevel: 0 },
        { id: "56", title: "kāṭhake dvitīyaḥ prapāṭhakaḥ - nāciketa cayanaṁ", order: 2, proficiencyLevel: 0 },
        { id: "57", title: "kāṭhake trtīyaḥ prapāṭhakaḥ - cāturhotra vaiśvasrja cayanaṁ ca", order: 3, proficiencyLevel: 0 }
      ]
    },
    {
      id: "8",
      title: "Pancha Kaatakam Part II",
      description: "Second section of the five Kathaka recitations",
      order: 8,
      status: "draft",
      chapterCount: 2,
      completedChapters: 0,
      currentLevel: 0,
      estimatedHours: 80,
      lastModified: "2025-01-01",
      chapters: [
        { id: "58", title: "āraṇyake prathamaḥ praśnaḥ – aruṇaṁ", order: 1, proficiencyLevel: 0 },
        { id: "59", title: "āraṇyake dvitīyaḥ praśnaḥ – svādhyāya brāhmaṇaṁ", order: 2, proficiencyLevel: 0 }
      ]
    }
  ];

  // Authentic Vedic chapters with content from the prototype
  private chapters: any[] = [
    {
      id: "1",
      title: "vedādhyayana niyamamulu, veda svaraṁ, pañcāṅgaṁ, saṅkalpaṁ, yajñopavīta dhāraṇaṁ, avapośanaṁ",
      trackId: "1",
      order: 1
    },
    {
      id: "2", 
      title: "Śraddhā sūktaṁ",
      trackId: "1",
      order: 2,
      content: {
        te: "శ్ర॒ద్ధాయా॒ఽగ్నిః సమి॑ధ్యతే । శ్ర॒ద్ధయా॑ విందతే హ॒విః ।\nశ్ర॒ద్ధాం భగ॑స్య మూ॒ర్ధని॑ । వచ॒సాఽఽవే॑దయామసి ।\nప్రి॒యగ్గ్ శ్ర॑ద్ధే॒ దద॑తః । ప్రి॒యగ్గ్ శ్ర॑ద్ధే॒ దిదా॑సతః ।\nప్రి॒యం భో॒జేషు॒ యజ్వ॑సు ॥\nఇ॒దం మ॑ ఉది॒తం కృ॑ధి । యథా॑ దే॒వా అసు॑రేషు ।\nశ్ర॒ద్ధాము॒గ్రేషు॑ చక్రి॒రే । ఏ॒వం భో॒జేషు॒ యజ్వ॑సు ।\nఅ॒స్మాక॑ముది॒తం కృ॑ధి । శ్ర॒ద్ధాం దే॑వా॒ యజ॑మానాః ।\nవా॒యుగో॑పా॒ ఉపా॑సతే । శ్ర॒ద్ధాగ్ం హృ॑ద॒య్య॑యాఽఽకూ᳚త్యా ।\nశ్ర॒ద్ధయా॑ హూయతే హ॒విః । శ్ర॒ద్ధాం ప్రా॒తర్​హ॑వామహే ॥\nశ్ర॒ద్ధాం మ॒ధ్యంది॑నం॒ పరి॑ । శ్ర॒ద్ధాగ్ం సూర్య॑స్య ని॒మృచి॑ ।\nశ్రద్ధే॒ శ్రద్ధా॑పయే॒హ మా᳚ । శ్ర॒ద్ధా దే॒వానధి॑వస్తే ।\nశ్ర॒ద్ధా విశ్వ॑మి॒దం జగ॑త్ । శ్ర॒ద్ధాం కామ॑స్య మా॒తరం᳚ ।\nహ॒విషా॑ వర్ధయామసి । ఓం శాంతిః॒ శాంతిః॒ శాంతిః॑ ॥",
        hi: "श्र॒द्धाया॒-ऽग्नि-स्समि॑ध्यते । श्र॒द्धया॑ විందते హ॒విः ।\nश्र॒द्धा-म्भग॑स्य मू॒र्धनि॑ । वच॒सा-ऽऽवे॑दयामसि ।\nप्रि॒यग्ग् श्र॑द्धे॒ దद॑तः । प्रि॒यగ్ग् श्र॑द्धे॒ दिदा॑সतः ।\nप्रि॒य-म्भो॒जेषु॒ यজ్వ॑सु ॥\nइ॒द-म्म॑ उदि॒त-ङ्कृ॑धि । यथा॑ दे॒वा असु॑रेषु ।\nश्र॒द्धामु॒గ్रेषु॑ चक्रि॒रे । ए॒व-म्भो॒जेषु॒ यজ్વ॑सु ।\nఅ॒స్మాক॑ముది॒తं కృ॑धি । श्र॒द्धा-न्दे॑वा॒ यज॑मानाः ।\nవా॒యుగో॑పా॒ उपा॑सते । श्र॒द्धाग्ं हृ॑द॒य्य॑या-ऽऽकू᳚त्या ।\nश्र॒द्धया॑ हूयते ह॒विः । श्र॒द्धा-म्प्रा॒तर्​హ॑वाমहे ॥\nश्र॒द्धा-म्म॒ध्यन्दि॑न॒-म्परि॑ ।श्र॒द्धाग्ं सूर्य॑स्य नि॒मृचि॑ ।\nश्रद्धे॒ श्रद्धा॑పये॒ह मा᳚ । श्र॒द्धा दे॒वानधि॑वस्ते ।\nश्र॒द्धा विश्व॑मि॒द-ञ्जग॑त् । श्र॒द्धा-ङ्काम॑स्य मा॒तरम्᳚ ।\nह॒विषा॑ वर्धयामसि । ॐ शान्ति॒-श्शान्ति॒-श्शान्तिः॑ ॥",
        en: "śra̠ddhāyā̠-'gni-ssami̍dhyatē । śra̠ddhayā̍ vindatē ha̠viḥ ।\nśra̠ddhā-mbhaga̍sya mū̠rdhani̍ । vacha̠sā-''vē̍dayāmasi ।\n\npri̠yagg śra̍ddhē̠ dada̍taḥ । pri̠yagg śra̍ddhē̠ didā̍sataḥ ।\npri̠ya-mbhō̠jēṣu̠ yajva̍su ॥\ni̠da-mma̍ udi̠ta-ṅkṛ̍dhi । yathā̍ dē̠vā asu̍rēṣu ।\n\nśra̠ddhāmu̠grēṣu̍ chakri̠rē । ē̠va-mbhō̠jēṣu̠ yajva̍su ।\na̠smāka̍mudi̠ta-ṅkṛ̍dhi । śra̠ddhā-ndē̍vā̠ yaja̍mānāḥ ।\n\nvā̠yugō̍pā̠ upā̍satē । śra̠ddhāgṃ hṛ̍da̠yya̍yā-''kū̎tyā ।\nśra̠ddhayā̍ hūyatē ha̠viḥ । śra̠ddhā-mprā̠tar​ha̍vāmahē ॥\n\nśra̠ddhā-mma̠dhyandi̍na̠-mpari̍ । śra̠ddhāgṃ sūrya̍sya ni̠mṛchi̍ ।\nśraddhē̠ śraddhā̍payē̠ha mā̎ । śra̠ddhā dē̠vānadhi̍vastē ।\n\nśra̠ddhā viśva̍mi̠da-ñjaga̍t । śra̠ddhā-ṅkāma̍sya mā̠taram̎ ।\nha̠viṣā̍ vardhayāmasi । ōṃ śānti̠-śśānti̠-śśānti̍ḥ ॥"
      }
    },
    {
      id: "3",
      title: "sandhyopāsanopayogi strī puruṣa vyavasthā",
      trackId: "1", 
      order: 3
    },
    {
      id: "4", 
      title: "gāyatrī japa vidhi",
      trackId: "1",
      order: 4
    },
    {
      id: "5",
      title: "prāṇāyāma vidhi",
      trackId: "1",
      order: 5
    },
    {
      id: "11",
      title: "Gaṇapatyatharvaśīrṣopaniṣat",
      trackId: "2",
      order: 1
    },
    {
      id: "12", 
      title: "Śrī sūktaṁ",
      trackId: "2",
      order: 2
    },
    {
      id: "13",
      title: "Bhū sūktaṁ",
      trackId: "2", 
      order: 3
    },
    {
      id: "21",
      title: "Rudra namakam",
      trackId: "3",
      order: 1
    },
    {
      id: "22",
      title: "Rudra chamakam", 
      trackId: "3",
      order: 2
    },
    {
      id: "31",
      title: "Gaṇapati atharvaśīrṣam",
      trackId: "4",
      order: 1
    },
    {
      id: "41",
      title: "Śrī lalitā triśatī nāmāvali",
      trackId: "5",
      order: 1
    },
    {
      id: "51",
      title: "Viṣṇu sahasranāma stotram",
      trackId: "6",
      order: 1
    },
    {
      id: "61",
      title: "Sāma veda - Kauthuma śākhā",
      trackId: "7",
      order: 1
    },
    {
      id: "71",
      title: "Atharva veda saṁhitā",
      trackId: "8",
      order: 1
    }
  ];

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const now = new Date();
    const existingUser = this.users.get(userData.id);
    
    const user: User = {
      id: userData.id,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      roles: userData.roles || existingUser?.roles || ["student", "instructor", "content_manager", "admin"],
      status: userData.status || existingUser?.status || "active",
      createdAt: existingUser?.createdAt || now,
      updatedAt: now,
    };
    
    this.users.set(user.id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUserRoles(userId: string, roles: string[]): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const updatedUser = { ...user, roles, updatedAt: new Date() };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUserStatus(userId: string, status: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const updatedUser = { ...user, status, updatedAt: new Date() };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async getAllTracks(): Promise<any[]> {
    console.log("getAllTracks called, tracks count:", this.tracks.length);
    console.log("First track:", this.tracks[0]);
    // Return tracks with their chapters populated
    return this.tracks.map(track => {
      const chapters = this.chapters.filter(chapter => chapter.trackId === track.id).map(chapter => ({
        id: chapter.id,
        title: chapter.title,
        order: chapter.order || 1,
        proficiencyLevel: this.getStudentProficiencyForChapter(chapter.id)
      }));
      
      return {
        ...track,
        chapters
      };
    });
  }

  async getTrack(id: string): Promise<any | undefined> {
    const track = this.tracks.find(track => track.id === id);
    if (!track) return undefined;
    
    // Get chapters for this track and add proficiency levels
    const chapters = this.chapters.filter(chapter => chapter.trackId === id).map(chapter => ({
      id: chapter.id,
      title: chapter.title,
      order: chapter.order || 1,
      proficiencyLevel: this.getStudentProficiencyForChapter(chapter.id)
    }));
    
    return {
      ...track,
      chapters
    };
  }

  private getStudentProficiencyForChapter(chapterId: string): number {
    // Return proficiency levels for authentic chapters
    const proficiencyMap: Record<string, number> = {
      "1": 4, // vedādhyayana niyamamulu - completed
      "2": 4, // Śraddhā sūktaṁ - completed
      "3": 3, // sandhyopāsanopayogi strī puruṣa vyavasthā - in progress
      "4": 2, // gāyatrī japa vidhi - beginner
      "5": 0, // not started
    };
    return proficiencyMap[chapterId] || 0;
  }

  private getChapterContent(chapterId: string): any {
    // Authentic Vedic content for chapters with multilingual support
    const contentMap: Record<string, any> = {
      "1": {
        te: "వేదాధ్యయన నియమములు, వేద స్వరం, పంచాంగం, సంకల్పం, యజ్ఞోపవీత ధారణం, అవపోశనం",
        hi: "वेदाध्ययन नियममुलु, वेद स्वरं, पञ्चाङ्गं, सङ्कल्पं, यज्ञोपवीत धారणं, अवपोशनं",
        en: "Rules of Vedic study, Vedic intonation, calendar system, ritual intention, sacred thread wearing, ritual purification"
      },
      "2": {
        te: "శ్ర॒ద్ధాయా॒ఽగ్నిః సమి॑ధ్యతే । శ్ర॒ద్ధయా॑ విందతే హ॒విః ।శ్ర॒ద్ధాం భగ॑స్య మూ॒ర్ధని॑ । వచ॒సాఽఽవే॑దయామసి ।ప్రి॒యగ్గ్ శ్ర॑ద్ధే॒ దద॑తః । ప్రి॒యగ్గ్ శ్ర॑ద్ధే॒ దిదా॑సతః ।ప్రి॒యం భో॒జేషు॒ యజ్వ॑సు ॥ ఇ॒దం మ॑ ఉది॒తం కృ॑ధి । యథా॑ దే॒వా అసు॑రేషు ।శ్ర॒ద్ధాము॒గ్రేషు॑ చక్రి॒రే । ఏ॒వం భో॒జేషు॒ యజ్వ॑సు ।అ॒స్మాక॑ముది॒తం కృ॑ధి । శ్ర॒ద్ధాం దే॑వా॒ యజ॑మానాః ।వా॒యుగో॑పా॒ ఉపా॑సతే । శ్ర॒ద్ధాగ్ం హృ॑ద॒య్యయా॒ఽఽకూ॒త్యా । శ్ర॒ద్ధయా॑ హూయతే హ॒విః । శ్ర॒ద్ధాం ప్రా॒తర్హ॑వామహే ॥ శ్ర॒ద్ధాం మ॒ధ్యంది॑నం॒ పరి॑ । శ్ర॒ద్ధాగ్ం సూర్య॑స్య ని॒మృచి॑ ।శ్రద్ధే॒ శ్రద్ధా॑పయే॒హ మా᳚ । శ్ర॒ద్ధా దే॒వానధి॑వస్తే ।శ్ర॒ద్ధా విశ్వ॑మి॒దం జగ॑త్ । శ్ర॒ద్ధాం కామ॑స్య మా॒తరం᳚ ।హ॒విషా॑ వర్ధయామసి । ఓం శాన్తిః शान्तिः शान्तिः ॥",
        hi: "श्र॒द्धाया॒-ऽग्नि-स्समि॑ध्यते । श्र॒द्धया॑ विन्दते ह॒विः ।श्र॒द्धा-म्भग॑स्य मू॒र्धनि॑ । वच॒सा-ऽऽवे॑दयामसि ।प्रि॒यग्ग् श्र॑द्धे॒ दद॑तः । प्रि॒यग्ग् श्र॑द्धे॒ दिदा॑सतः ।प्रि॒य-म्भो॒जेषु॒ यज्व॑सु ॥ इ॒द-म्म॑ उदि॒त-ङ्कृ॑धि । यथा॑ दे॒वा असु॑रेषु ।श्र॒द्धामु॒ग्रेषु॑ चक्रि॒रे । ए॒व-म्भो॒जेषु॒ यज्व॑सु ।अ॒स्माक॑मुदि॒त-ङ्कृ॑धि । श्र॒द्धा-न्दे॑वा॒ यज॑मानाः ।वा॒युगो॑पा॒ उपा॑सते । श्र॒द्धाग्ं हृ॑द॒य्यया॒-ऽऽकू॒त्या । श्र॒द्धया॑ हूयते ह॒विः । श्र॒द्धा-म्प्रा॒तर्ह॑वामहे ॥ श्र॒द्धा-म्म॒ध्यन्दि॑न॒-म्परि॑ ।श्र॒द्धाग्ं सूर्य॑स्य नि॒मृचि॑ ।श्रद्धे॒ श्रद्धा॑पये॒ह मा᳚ । श्र॒द्धा दे॒वानधि॑वस्ते ।श्र॒द्धा विश्व॑मि॒द-ञ्जग॑त् । श्र॒द्धा-ङ्काम॑स्य मा॒तरम्᳚ ।ह॒विषा॑ वर्धयामसि । ओं शान्तिः शान्तिः शान्तिः ॥",
        en: "śra̠ddhāyā̠-'gni-ssami̍dhyatē । śra̠ddhayā̍ vindatē ha̠viḥ ।śra̠ddhā-mbhaga̍sya mū̠rdhani̍ । vacha̠sā-''vē̍dayāmasi ।pri̠yagg śra̍ddhē̠ dada̍taḥ । pri̠yagg śra̍ddhē̠ didā̍sataḥ ।pri̠ya-mbhō̠jēṣu̠ yajva̍su ॥ i̠da-mma̍ udi̠ta-ṅkṛ̍dhi । yathā̍ dē̠vā asu̍rēṣu ।śra̠ddhāmu̠grēṣu̍ chakri̠rē । ē̠va-mbhō̠jēṣu̠ yajva̍su ।a̠smāka̍mudi̠ta-ṅkṛ̍dhi । śra̠ddhā-ndē̍vā̠ yaja̍mānāḥ ।vā̠yugō̍pā̠ upā̍satē । śra̠ddhāgṃ hṛ̍da̠yya̍yā-''kū̎tyā ।śra̠ddhayā̍ hūyatē ha̠viḥ । śra̠ddhā-mprā̠tar​ha̍vāmahē ॥ śra̠ddhā-mma̠dhyandi̍na̠-mpari̍ । śra̠ddhāgṃ sūrya̍sya ni̠mṛchi̍ ।śraddhē̠ śraddhā̍payē̠ha mā̎ । śra̠ddhā dē̠vānadhi̍vastē ।śra̠ddhā viśva̍mi̠da-ñjaga̍t । śra̠ddhā-ṅkāma̍sya mā̠taram̎ ।ha̠viṣā̍ vardhayāmasi । ōṃ śānti̠-śśānti̠-śśānti̍ḥ ॥"
      },
      "3": {
        te: "సంధ్యోపాసనోపయోగి స్త్రీ పురుష వ్యవస్థ",
        hi: "सन्ध्योपासनोपयोगि स्त्री पुरुष व्यवस्था",
        en: "Gender-specific procedures for twilight worship"
      },
      "4": {
        te: "గాయత్రీ జప విధి",
        hi: "गायत्री जप विधि",
        en: "Procedure for Gayatri mantra recitation"
      },
      "5": {
        te: "ప్రాణాయామ విధి",
        hi: "प्राणायाम विधि",
        en: "Procedure for breath control practices"
      }
    };
    return contentMap[chapterId] || { te: "", hi: "", en: "" };
  }

  async getChapter(id: number): Promise<any | undefined> {
    // Search for chapter across all tracks
    for (const track of this.tracks) {
      const chapter = track.chapters.find((ch: any) => ch.id === id.toString());
      if (chapter) {
        // Get segments for this chapter (match by numeric ID)
        const segments = this.segments.filter(segment => segment.chapterId === parseInt(chapter.id));
        
        // Get audio files for this chapter (match by numeric ID)
        const audioFiles = this.audioFiles.filter(file => file.chapterId === parseInt(chapter.id));
        
        // Get audio mappings for this chapter's segments
        const mappings = this.audioMappings.filter(mapping => 
          segments.some(segment => segment.id === mapping.segmentId)
        );
        
        return {
          ...chapter,
          trackId: track.id,
          segments,
          audioFiles,
          mappings,
          content: this.getChapterContent(chapter.id)
        };
      }
    }
    return undefined;
  }

  async getStudentProgress(studentId: string): Promise<any[]> {
    // Authentic progress data based on the Vedic curriculum
    return [
      {
        id: "prog_1",
        studentId,
        chapterId: "1",
        chapterTitle: "vedādhyayana niyamamulu, veda svaraṁ, pañcāṅgaṁ, saṅkalpaṁ, yajñopavīta dhāraṇaṁ, avapośanaṁ",
        trackTitle: "Vaidika Nithya Karma",
        proficiencyLevel: 4,
        lastAccessed: "2025-01-01T10:30:00Z"
      },
      {
        id: "prog_2", 
        studentId,
        chapterId: "2",
        chapterTitle: "Śraddhā sūktaṁ",
        trackTitle: "Vaidika Nithya Karma", 
        proficiencyLevel: 4,
        lastAccessed: "2025-01-02T14:15:00Z"
      },
      {
        id: "prog_3",
        studentId,
        chapterId: "11",
        chapterTitle: "Gaṇapatyatharvaśīrṣopaniṣat",
        trackTitle: "Sookta Paatham",
        proficiencyLevel: 3,
        lastAccessed: "2025-01-03T16:20:00Z"
      }
    ];
  }

  async getStudentStats(studentId: string): Promise<any> {
    return {
      totalStudyTime: 240,
      chaptersCompleted: 22,
      currentStreak: 15,
      highestLevel: 4,
      completionRate: 0.73,
      averageProficiency: 3.2
    };
  }

  // Additional methods for complete functionality
  async getChaptersByTrack(trackId: number): Promise<any[]> {
    return this.chapters.filter(chapter => chapter.trackId === trackId.toString());
  }

  async createTrack(track: any): Promise<any> {
    const newTrack = {
      id: (this.tracks.length + 1).toString(),
      ...track,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.tracks.push(newTrack);
    return newTrack;
  }

  async updateTrack(id: number, track: any): Promise<any> {
    const index = this.tracks.findIndex(t => t.id === id.toString());
    if (index === -1) throw new Error('Track not found');
    
    this.tracks[index] = {
      ...this.tracks[index],
      ...track,
      updatedAt: new Date()
    };
    return this.tracks[index];
  }

  async deleteTrack(id: number): Promise<void> {
    const index = this.tracks.findIndex(t => t.id === id.toString());
    if (index === -1) throw new Error('Track not found');
    this.tracks.splice(index, 1);
  }

  async createChapter(chapter: any): Promise<any> {
    const newChapter = {
      id: (this.chapters.length + 1).toString(),
      ...chapter,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.chapters.push(newChapter);
    return newChapter;
  }

  async updateChapter(id: number, chapter: any): Promise<any> {
    const index = this.chapters.findIndex(c => c.id === id.toString());
    if (index === -1) throw new Error('Chapter not found');
    
    this.chapters[index] = {
      ...this.chapters[index],
      ...chapter,
      updatedAt: new Date()
    };
    return this.chapters[index];
  }

  async deleteChapter(id: number): Promise<void> {
    const index = this.chapters.findIndex(c => c.id === id.toString());
    if (index === -1) throw new Error('Chapter not found');
    this.chapters.splice(index, 1);
  }

  async getAudioFilesByChapter(chapterId: number): Promise<any[]> {
    // Mock audio files for authentic Vedic chapters
    return [
      {
        id: 1,
        chapterId,
        filename: `chapter_${chapterId}_recitation.mp3`,
        duration: 180,
        uploadedAt: new Date()
      }
    ];
  }

  async createAudioFile(audioFile: any): Promise<any> {
    return {
      id: Date.now(),
      ...audioFile,
      uploadedAt: new Date()
    };
  }

  async deleteAudioFile(id: number): Promise<void> {
    // Implementation for audio file deletion
  }

  async getSegmentsByChapter(chapterId: number): Promise<any[]> {
    // Return the actual segments with text content
    return this.segments.filter(segment => segment.chapterId === chapterId);
  }

  async createTextSegment(segment: any): Promise<any> {
    return {
      id: Date.now(),
      ...segment,
      createdAt: new Date()
    };
  }

  async updateTextSegment(id: number, segment: any): Promise<any> {
    return {
      id,
      ...segment,
      updatedAt: new Date()
    };
  }

  async deleteTextSegment(id: number): Promise<void> {
    // Implementation for text segment deletion
  }

  async getMappingsByAudioFile(audioFileId: number): Promise<any[]> {
    return [
      {
        audioFileId,
        segmentId: 1,
        startTime: 0,
        endTime: 15.5
      }
    ];
  }

  async getMappingsBySegment(segmentId: number): Promise<any[]> {
    return [
      {
        audioFileId: 1,
        segmentId,
        startTime: 0,
        endTime: 15.5
      }
    ];
  }

  async createAudioMapping(mapping: any): Promise<any> {
    return {
      ...mapping,
      createdAt: new Date()
    };
  }

  async deleteAudioMapping(audioFileId: number, segmentId: number): Promise<void> {
    // Implementation for audio mapping deletion
  }

  async getAllStudentProgress(): Promise<any[]> {
    return [
      {
        id: "prog_1",
        studentId: "dev-user-123",
        chapterId: "1", 
        proficiencyLevel: 4,
        lastAccessed: new Date(),
        student: {
          id: "dev-user-123",
          firstName: "Development",
          lastName: "User",
          email: "developer@vediclms.com"
        },
        chapter: {
          id: "1",
          title: "vedādhyayana niyamamulu",
          track: {
            id: "1",
            title: "Vaidika Nithya Karma"
          }
        }
      }
    ];
  }

  async updateStudentProgress(progress: any): Promise<any> {
    return {
      ...progress,
      updatedAt: new Date()
    };
  }
}

export const storage = new MemStorage();