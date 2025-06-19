// Simplified in-memory storage without authentication
import { normalizeLineBreaks } from '../shared/experiment1-utils';
export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<any>;
  upsertUser(user: any): Promise<any>;
  getAllUsers(): Promise<any[]>;
  updateUserRoles(userId: string, roles: string[]): Promise<any>;
  updateUserStatus(userId: string, status: string): Promise<any>;
  
  // Track operations
  getAllTracks(): Promise<any[]>;
  getTrack(id: number): Promise<any | undefined>;
  createTrack(track: any): Promise<any>;
  updateTrack(id: number, track: any): Promise<any>;
  deleteTrack(id: number): Promise<void>;

  // Chapter operations
  getChaptersByTrack(trackId: number): Promise<any[]>;
  getChapter(id: number): Promise<any | undefined>;
  createChapter(chapter: any): Promise<any>;
  updateChapter(id: number, chapter: any): Promise<any>;
  deleteChapter(id: number): Promise<void>;

  // Audio file operations
  getAudioFilesByChapter(chapterId: number): Promise<any[]>;
  createAudioFile(audioFile: any): Promise<any>;
  updateAudioFile(id: number, audioFile: any): Promise<any>;
  deleteAudioFile(id: number): Promise<void>;

  // Text segment operations
  getSegmentsByChapter(chapterId: number): Promise<any[]>;
  createTextSegment(segment: any): Promise<any>;
  updateTextSegment(id: number, segment: any): Promise<any>;
  deleteTextSegment(id: number): Promise<void>;

  // Media segment operations
  getMediaSegmentsByAudioFile(audioFileId: number): Promise<any[]>;
  createMediaSegment(segment: any): Promise<any>;
  updateMediaSegment(id: number, segment: any): Promise<any>;
  deleteMediaSegment(id: number): Promise<void>;

  // Segment mapping operations
  getSegmentMappingsByChapter(chapterId: number): Promise<any[]>;
  createSegmentMapping(mapping: any): Promise<any>;
  deleteSegmentMapping(id: number): Promise<void>;

  // Audio mapping operations (legacy)
  getMappingsByAudioFile(audioFileId: number): Promise<any[]>;
  getMappingsBySegment(segmentId: number): Promise<any[]>;
  createAudioMapping(mapping: any): Promise<any>;
  deleteAudioMapping(audioFileId: number, segmentId: number): Promise<void>;

  // Student progress
  getStudentProgress(studentId: string): Promise<any[]>;
  getStudentStats(studentId: string): Promise<any>;
}

export class MemStorage implements IStorage {
  private users: Map<string, any> = new Map();
  private mediaSegments: any[] = [];
  private segmentMappings: any[] = [];
  private studentProgress: any[] = [];
  
  private tracks: any[] = [
    {
      id: 1,
      title: "Vaidika Nithya Karma",
      description: "Essential daily Vedic practices and rituals for spiritual development",
      order: 1,
      status: "published",
      estimatedHours: 120,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "system"
    },
    {
      id: 2,
      title: "Sookta Paatham",
      description: "Sacred hymns and verses for devotional practice and spiritual elevation",
      order: 2,
      status: "published",
      estimatedHours: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "system"
    },
    {
      id: 3,
      title: "Rudram, Shaakunadi, Ganapati Pooja, Punyaahavaachanam",
      description: "Advanced worship practices including Rudra prayers and ceremonial procedures",
      order: 3,
      status: "published",
      estimatedHours: 80,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "system"
    },
    {
      id: 4,
      title: "Mahaanyaasadhikam & Sakala Devataa Pooja Vidhaanam",
      description: "Comprehensive deity worship procedures and advanced ceremonial practices",
      order: 4,
      status: "published",
      estimatedHours: 90,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "system"
    },
    {
      id: 5,
      title: "Swasthi Mantraah, Agni Mukham, Nakshatreshti",
      description: "Auspicious mantras, fire ceremonies, and stellar worship practices",
      order: 5,
      status: "published",
      estimatedHours: 70,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "system"
    },
    {
      id: 6,
      title: "Upanishad Mantraah",
      description: "Sacred Upanishadic teachings and philosophical foundations",
      order: 6,
      status: "published",
      estimatedHours: 110,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "system"
    },
    {
      id: 7,
      title: "Pancha Kaatakam Part I",
      description: "First section of the five Kathaka collections with specialized ceremonies",
      order: 7,
      status: "published",
      estimatedHours: 60,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "system"
    },
    {
      id: 8,
      title: "Pancha Kaatakam Part II",
      description: "Second section of the Kathaka collections with Aranyaka teachings",
      order: 8,
      status: "published",
      estimatedHours: 50,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "system"
    }
  ];

  private chapters: any[] = [
    // Track 1: Vaidika Nithya Karma chapters
    { id: 1, trackId: 1, title: "vedādhyayana niyamamulu, veda svaraṁ, pañcāṅgaṁ, saṅkalpaṁ, yajñopavīta dhāraṇaṁ, avapośanaṁ", order: 1, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { 
      id: 2, 
      trackId: 1, 
      title: "Śraddhā sūktaṁ", 
      order: 2, 
      status: "published", 
      content: { 
        te: `శ్ర॒ద్ధాయా॒ఽగ్నిః సమి॑ధ్యతే । శ్ర॒ద్ధయా॑ విందతే హ॒విః ।
శ్ర॒ద్ధాం భగ॑స్య మూ॒ర్ధని॑ । వచ॒సాఽఽవే॑దయామసి ।
ప్రి॒యగ్గ్ శ్ర॑ద్ధే॒ దద॑తః । ప్రి॒యగ్గ్ శ్ర॑ద్ధే॒ దిదా॑సతః ।
ప్రి॒యం భో॒జేషు॒ యజ్వ॑సు ॥
ఇ॒దం మ॑ ఉది॒తం కృ॑ధి । యథా॑ దే॒వా అసు॑రేషు ।
శ్ర॒ద్ధాము॒గ్రేషు॑ చక్రి॒రే । ఏ॒వం భో॒జేషు॒ యజ్వ॑సు ।
అ॒స్మాక॑ముది॒తం కృ॑ధి । శ్ర॒ద్ధాం దే॑వా॒ యజ॑మానాః ।
వా॒యుగో॑పా॒ ఉపా॑సతే । శ్ర॒ద్ధాగ్ం హృ॑ద॒య్య॑యాఽఽకూ᳚త్యా ।
శ్ర॒ద్ధయా॑ హూయతే హ॒విః । శ్ర॒ద్ధాం ప్రా॒తర్హ॑వామహే ॥
శ్ర॒ద్ధాం మ॒ధ్యంది॑నం॒ పరి॑ । శ్ర॒ద్ధాగ్ం సూర్య॑స్య ని॒మృచి॑ ।
శ్రద్ధే॒ శ్రద్ధా॑పయే॒హ మా᳚ । శ్ర॒ద్ధా దే॒వానధి॑వస్తే ।
శ్ర॒ద్ధా విశ్వ॑మి॒దం జగ॑త్ । శ్ర॒ద్ధాం కామ॑స్య మా॒తరం᳚ ।
హ॒విషా॑ వర్ధయామసి । ఓం శాంతిః॒ శాంతిః॒ శాంతిః॑ ॥`, 
        hi: `श्र॒द्धाया॒-ऽग्नि-स्समि॑ध्यते । श्र॒द्धया॑ विन्दते ह॒विः ।
श्र॒द्धा-म्भग॑स्य मू॒र्धनि॑ । वच॒सा-ऽऽवे॑दयामसि ।
प्रि॒यग्ग् श्र॑द्धे॒ दद॑तः । प्रि॒यग्ग् श्र॑द्धे॒ दिदा॑सतः ।
प्रि॒य-म्भो॒जेषु॒ यज्व॑सु ॥
इ॒द-म्म॑ उदि॒त-ङ्कृ॑धि । यथा॑ दे॒वा असु॑रेषु ।
श्र॒द्धामु॒ग्रेषु॑ चक्रि॒रे । ए॒व-म्भो॒जेषु॒ यज्व॑सु ।
अ॒स्माक॑मुदि॒त-ङ्कृ॑धि । श्र॒द्धा-न्दे॑वा॒ यज॑मानाः ।
वा॒युगो॑पा॒ उपा॑सते । श्र॒द्धाग्ं हृ॑द॒य्य॑या-ऽऽकू᳚त्या ।
श्र॒द्धया॑ हूयते ह॒विः । श्र॒द्धा-म्प्रा॒तर्ह॑वामहे ॥
श्र॒द्धा-म्म॒ध्यन्दि॑न॒-म्परि॑ ।श्र॒द्धाग्ं सूर्य॑स्य नि॒मृचि॑ ।
श्रद्धे॒ श्रद्धा॑पये॒ह मा᳚ । श्र॒द्धा दे॒वानधि॑वस्ते ।
श्र॒द्धा विश्व॑मि॒द-ञ्जग॑त् । श्र॒द्धा-ङ्काम॑स्य मा॒तरम्᳚ ।
ह॒विषा॑ वर्धयामसि । ॐ शान्ति॒-श्शान्ति॒-श्शान्तिः॑ ॥`, 
        en: `śra̠ddhāyā̠-'gni-ssami̍dhyatē । śra̠ddhayā̍ vindatē ha̠viḥ ।
śra̠ddhā-mbhaga̍sya mū̠rdhani̍ । vacha̠sā-''vē̍dayāmasi ।
pri̠yagg śra̍ddhē̠ dada̍taḥ । pri̠yagg śra̍ddhē̠ didā̍sataḥ ।
pri̠ya-mbhō̠jēṣu̠ yajva̍su ॥
i̠da-mma̍ udi̠ta-ṅkṛ̍dhi । yathā̍ dē̠vā asu̍rēṣu ।
śra̠ddhāmu̠grēṣu̍ chakri̠rē । ē̠va-mbhō̠jēṣu̠ yajva̍su ।
a̠smāka̍mudi̠ta-ṅkṛ̍dhi । śra̠ddhā-ndē̍vā̠ yaja̍mānāḥ ।
vā̠yugō̍pā̠ upā̍satē । śra̠ddhāgṃ hṛ̍da̠yya̍yā-''kū̎tyā ।
śra̠ddhayā̍ hūyatē ha̠viḥ । śra̠ddhā-mprā̠tarha̍vāmahē ॥
śra̠ddhā-mma̠dhyandi̍na̠-mpari̍ । śra̠ddhāgṃ sūrya̍sya ni̠mṛchi̍ ।
śraddhē̠ śraddhā̍payē̠ha mā̎ । śra̠ddhā dē̠vānadhi̍vastē ।
śra̠ddhā viśva̍mi̠da-ñjaga̍t । śra̠ddhā-ṅkāma̍sya mā̠taram̎ ।
ha̠viṣā̍ vardhayāmasi । ōṃ śānti̠-śśānti̠-śśānti̍ḥ ॥`
      }, 
      createdAt: new Date(), 
      updatedAt: new Date(), 
      createdBy: "system" 
    },
    { id: 3, trackId: 1, title: "Medhā sūktaṁ", order: 3, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { id: 4, trackId: 1, title: "Durgā sūktaṁ", order: 4, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { id: 5, trackId: 1, title: "Śrī sūktaṁ", order: 5, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { id: 6, trackId: 1, title: "Puruṣa sūktaṁ", order: 6, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { id: 7, trackId: 1, title: "krṣṇa yajurveda sandhyāvaṁdanaṁ", order: 7, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { id: 8, trackId: 1, title: "brahmayajña vidhiḥ, tarpaṇa vidhiḥ", order: 8, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { id: 9, trackId: 1, title: "agnikāryaṁ (brahmacāriṇakaraṇīyaṁ)", order: 9, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { id: 10, trackId: 1, title: "vaidika nitya karma vidhānaṁ", order: 10, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },

    // Track 2: Sookta Paatham chapters  
    { id: 11, trackId: 2, title: "Gaṇapatyatharvaśīrṣopaniṣat", order: 1, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { id: 12, trackId: 2, title: "nārāyaṇa sūktaṁ", order: 2, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { id: 13, trackId: 2, title: "viṣṇu sūktaṁ", order: 3, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { id: 14, trackId: 2, title: "bhūsūktaṁ", order: 4, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { id: 15, trackId: 2, title: "nīḷā sūktaṁ", order: 5, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { id: 16, trackId: 2, title: "bhāgya sūktaṁ", order: 6, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { id: 17, trackId: 2, title: "brahma sūktaṁ", order: 7, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { id: 18, trackId: 2, title: "sarpa sūktaṁ", order: 8, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { id: 19, trackId: 2, title: "pavamāna sūktaṁ", order: 9, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { id: 20, trackId: 2, title: "mahā mantrapuṣpaṁ", order: 10, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { id: 21, trackId: 2, title: "sarasvatī sūktaṁ", order: 11, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { id: 22, trackId: 2, title: "go sūktaṁ", order: 12, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { id: 23, trackId: 2, title: "āyuṣya sūktaṁ", order: 13, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { id: 24, trackId: 2, title: "manyu sūktaṁ", order: 14, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { id: 25, trackId: 2, title: "navagraha, upadevatā mantrāḥ", order: 15, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },

    // Track 3: Rudram, Shaakunadi, Ganapati Pooja, Punyaahavaachanam chapters
    { id: 26, trackId: 3, title: "śrīrudrapraśnaḥ (namakaṁ)", order: 1, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { id: 27, trackId: 3, title: "camakapraśnaḥ", order: 2, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { id: 28, trackId: 3, title: "dīpa prajvālana & nīrājana mantrāh", order: 3, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { id: 29, trackId: 3, title: "śākunādi mantrāḥ", order: 4, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { id: 30, trackId: 3, title: "trisuparṇa mantrāḥ", order: 5, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { id: 31, trackId: 3, title: "vighneśvara pūja", order: 6, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { id: 32, trackId: 3, title: "puṇyāhavācanaṁ", order: 7, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { id: 33, trackId: 3, title: "vighneśvara pūjā vidhānaṁ", order: 8, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
    { id: 34, trackId: 3, title: "puṇyāhavācana pūjā vidhānaṁ", order: 9, status: "published", createdAt: new Date(), updatedAt: new Date(), createdBy: "system" }
  ];

  private audioFiles: any[] = [];

  private segments: any[] = [
    {
      id: 8,
      chapterId: 1,
      conceptualName: "Opening Invocation - Agni and Faith",
      textReferences: {
        te: { start: 0, end: 95 },
        hi: { start: 0, end: 95 },
        en: { start: 0, end: 95 }
      },
      createdBy: "system",
      createdAt: new Date()
    },
    {
      id: 9,
      chapterId: 1,
      conceptualName: "Faith and Oblation",
      textReferences: {
        te: { start: 96, end: 190 },
        hi: { start: 96, end: 190 },
        en: { start: 96, end: 190 }
      },
      createdBy: "system",
      createdAt: new Date()
    },
    {
      id: 10,
      chapterId: 1,
      conceptualName: "Faith as Ultimate",
      textReferences: {
        te: { start: 191, end: 285 },
        hi: { start: 191, end: 285 },
        en: { start: 191, end: 285 }
      },
      createdBy: "system",
      createdAt: new Date()
    }
  ];
  
  private mappings: any[] = [
    {
      id: 1,
      audioFileId: 1,
      segmentId: 8,
      startTime: 0.0,
      endTime: 12.5,
      createdBy: "system",
      createdAt: new Date()
    },
    {
      id: 2,
      audioFileId: 1,
      segmentId: 9,
      startTime: 12.5,
      endTime: 25.0,
      createdBy: "system",
      createdAt: new Date()
    },
    {
      id: 3,
      audioFileId: 1,
      segmentId: 10,
      startTime: 25.0,
      endTime: 37.5,
      createdBy: "system",
      createdAt: new Date()
    }
  ];
  private nextId = 100;

  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<any> {
    return this.users.get(id);
  }

  async upsertUser(userData: any): Promise<any> {
    const user = {
      id: userData.id,
      email: userData.email || `user${userData.id}@example.com`,
      firstName: userData.firstName || "User",
      lastName: userData.lastName || "",
      roles: userData.roles || ["student"],
      status: userData.status || "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      ...userData
    };
    this.users.set(user.id, user);
    return user;
  }

  async getAllUsers(): Promise<any[]> {
    return Array.from(this.users.values());
  }

  async updateUserRoles(userId: string, roles: string[]): Promise<any> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    user.roles = roles;
    user.updatedAt = new Date();
    this.users.set(userId, user);
    return user;
  }

  async updateUserStatus(userId: string, status: string): Promise<any> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    user.status = status;
    user.updatedAt = new Date();
    this.users.set(userId, user);
    return user;
  }

  // Track operations
  async getAllTracks(): Promise<any[]> {
    return [...this.tracks];
  }

  async getTrack(id: number): Promise<any | undefined> {
    return this.tracks.find(track => track.id === id);
  }

  async createTrack(track: any): Promise<any> {
    const newTrack = {
      ...track,
      id: this.nextId++,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.tracks.push(newTrack);
    return newTrack;
  }

  async updateTrack(id: number, track: any): Promise<any> {
    const index = this.tracks.findIndex(t => t.id === id);
    if (index === -1) throw new Error("Track not found");
    
    this.tracks[index] = {
      ...this.tracks[index],
      ...track,
      updatedAt: new Date()
    };
    return this.tracks[index];
  }

  async deleteTrack(id: number): Promise<void> {
    const index = this.tracks.findIndex(t => t.id === id);
    if (index === -1) throw new Error("Track not found");
    this.tracks.splice(index, 1);
  }

  // Chapter operations
  async getChaptersByTrack(trackId: number): Promise<any[]> {
    return this.chapters.filter(chapter => chapter.trackId === trackId);
  }

  async getChapter(id: number): Promise<any | undefined> {
    const chapter = this.chapters.find(chapter => chapter.id === id);
    if (!chapter) return undefined;
    
    // Normalize line breaks in content for consistent text matching
    if (chapter.content) {
      const normalizedContent: any = {};
      for (const [lang, content] of Object.entries(chapter.content)) {
        if (typeof content === 'string') {
          normalizedContent[lang] = normalizeLineBreaks(content);
        } else if (content && typeof content === 'object') {
          const contentObj = content as any;
          normalizedContent[lang] = {
            display: normalizeLineBreaks(contentObj.display || ''),
            segmentation: normalizeLineBreaks(contentObj.segmentation || '')
          };
        }
      }
      return { ...chapter, content: normalizedContent };
    }
    
    return chapter;
  }

  async createChapter(chapter: any): Promise<any> {
    const newChapter = {
      ...chapter,
      id: this.nextId++,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.chapters.push(newChapter);
    return newChapter;
  }

  async updateChapter(id: number, chapter: any): Promise<any> {
    const index = this.chapters.findIndex(c => c.id === id);
    if (index === -1) throw new Error("Chapter not found");
    
    this.chapters[index] = {
      ...this.chapters[index],
      ...chapter,
      updatedAt: new Date()
    };
    return this.chapters[index];
  }

  async deleteChapter(id: number): Promise<void> {
    const index = this.chapters.findIndex(c => c.id === id);
    if (index === -1) throw new Error("Chapter not found");
    this.chapters.splice(index, 1);
  }

  // Audio file operations
  async getAudioFilesByChapter(chapterId: number): Promise<any[]> {
    return this.audioFiles.filter(file => file.chapterId === chapterId);
  }

  async createAudioFile(audioFile: any): Promise<any> {
    const newAudioFile = {
      ...audioFile,
      id: this.nextId++,
      createdAt: new Date()
    };
    this.audioFiles.push(newAudioFile);
    return newAudioFile;
  }

  async updateAudioFile(id: number, audioFile: any): Promise<any> {
    const index = this.audioFiles.findIndex(f => f.id === id);
    if (index === -1) throw new Error("Audio file not found");
    
    this.audioFiles[index] = {
      ...this.audioFiles[index],
      ...audioFile,
      updatedAt: new Date()
    };
    return this.audioFiles[index];
  }

  async deleteAudioFile(id: number): Promise<void> {
    const index = this.audioFiles.findIndex(f => f.id === id);
    if (index === -1) throw new Error("Audio file not found");
    this.audioFiles.splice(index, 1);
  }

  // Text segment operations
  async getSegmentsByChapter(chapterId: number): Promise<any[]> {
    return this.segments.filter(segment => segment.chapterId === chapterId);
  }

  async createTextSegment(segment: any): Promise<any> {
    const newSegment = {
      ...segment,
      id: this.nextId++,
      createdAt: new Date()
    };
    this.segments.push(newSegment);
    return newSegment;
  }

  async updateTextSegment(id: number, segment: any): Promise<any> {
    const index = this.segments.findIndex(s => s.id === id);
    if (index === -1) throw new Error("Segment not found");
    
    this.segments[index] = {
      ...this.segments[index],
      ...segment,
      updatedAt: new Date()
    };
    return this.segments[index];
  }

  async deleteTextSegment(id: number): Promise<void> {
    const index = this.segments.findIndex(s => s.id === id);
    if (index === -1) throw new Error("Segment not found");
    this.segments.splice(index, 1);
  }

  // Audio mapping operations
  async getMappingsByAudioFile(audioFileId: number): Promise<any[]> {
    return this.mappings.filter(mapping => mapping.audioFileId === audioFileId);
  }

  async getMappingsBySegment(segmentId: number): Promise<any[]> {
    return this.mappings.filter(mapping => mapping.segmentId === segmentId);
  }

  async createAudioMapping(mapping: any): Promise<any> {
    const newMapping = {
      ...mapping,
      id: this.nextId++,
      createdAt: new Date()
    };
    this.mappings.push(newMapping);
    return newMapping;
  }

  async deleteAudioMapping(audioFileId: number, segmentId: number): Promise<void> {
    const index = this.mappings.findIndex(
      m => m.audioFileId === audioFileId && m.segmentId === segmentId
    );
    if (index === -1) throw new Error("Mapping not found");
    this.mappings.splice(index, 1);
  }

  // Media segment operations
  async getMediaSegmentsByAudioFile(audioFileId: number): Promise<any[]> {
    return this.mediaSegments.filter(segment => segment.audioFileId === audioFileId);
  }

  async createMediaSegment(segment: any): Promise<any> {
    const newSegment = {
      ...segment,
      id: this.nextId++,
      createdAt: new Date()
    };
    this.mediaSegments.push(newSegment);
    return newSegment;
  }

  async updateMediaSegment(id: number, segmentUpdate: any): Promise<any> {
    const index = this.mediaSegments.findIndex(s => s.id === id);
    if (index === -1) throw new Error("Media segment not found");
    this.mediaSegments[index] = { ...this.mediaSegments[index], ...segmentUpdate, updatedAt: new Date() };
    return this.mediaSegments[index];
  }

  async deleteMediaSegment(id: number): Promise<void> {
    const index = this.mediaSegments.findIndex(s => s.id === id);
    if (index === -1) throw new Error("Media segment not found");
    this.mediaSegments.splice(index, 1);
  }

  // Segment mapping operations
  async getSegmentMappingsByChapter(chapterId: number): Promise<any[]> {
    return this.segmentMappings.filter(mapping => mapping.chapterId === chapterId);
  }

  async createSegmentMapping(mapping: any): Promise<any> {
    const newMapping = {
      ...mapping,
      id: this.nextId++,
      createdAt: new Date()
    };
    this.segmentMappings.push(newMapping);
    return newMapping;
  }

  async deleteSegmentMapping(id: number): Promise<void> {
    const index = this.segmentMappings.findIndex(m => m.id === id);
    if (index === -1) throw new Error("Segment mapping not found");
    this.segmentMappings.splice(index, 1);
  }

  // Student progress operations
  async getStudentProgress(studentId: string): Promise<any[]> {
    return this.studentProgress.filter(progress => progress.studentId === studentId);
  }

  async getStudentStats(studentId: string): Promise<any> {
    const progress = this.studentProgress.filter(p => p.studentId === studentId);
    const totalChapters = this.chapters.length;
    const completedChapters = progress.filter(p => p.proficiencyLevel >= 3).length;
    const averageProficiency = progress.length > 0 
      ? progress.reduce((sum, p) => sum + p.proficiencyLevel, 0) / progress.length 
      : 0;

    return {
      totalChapters,
      completedChapters,
      averageProficiency: Math.round(averageProficiency * 100) / 100,
      progressPercentage: totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0
    };
  }
}

export const storage = new MemStorage();