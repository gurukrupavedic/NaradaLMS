// Simplified in-memory storage without authentication
export interface IStorage {
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

  // Audio mapping operations
  getMappingsByAudioFile(audioFileId: number): Promise<any[]>;
  getMappingsBySegment(segmentId: number): Promise<any[]>;
  createAudioMapping(mapping: any): Promise<any>;
  deleteAudioMapping(audioFileId: number, segmentId: number): Promise<void>;
}

export class MemStorage implements IStorage {
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
    { id: 2, trackId: 1, title: "Śraddhā sūktaṁ", order: 2, status: "published", content: { te: "శ్రద్ధా సూక్తం", hi: "श्रद्धा सूक्त", en: "Shraddha Suktam" }, createdAt: new Date(), updatedAt: new Date(), createdBy: "system" },
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
    return this.chapters.find(chapter => chapter.id === id);
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
}

export const storage = new MemStorage();