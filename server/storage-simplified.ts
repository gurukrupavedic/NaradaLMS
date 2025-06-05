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
      id: 6,
      title: "Vaidika Nithya Karma",
      description: "Daily Vedic practices and rituals",
      order: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "system"
    }
  ];

  private chapters: any[] = [
    {
      id: 10,
      trackId: 6,
      title: "Shraddha Suktam",
      order: 1,
      content: {
        te: "శ్రద్ధా సూక్తం తెలుగు వచనం",
        hi: "श्रद्धा सूक्त हिंदी पाठ",
        en: "Shraddha Suktam English translation"
      },
      status: "published",
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "system"
    }
  ];

  private audioFiles: any[] = [
    {
      id: 12,
      chapterId: 10,
      filename: "shraddha-suktam.m4a",
      displayName: "Shraddha Suktam - 1",
      duration: 180,
      fileSize: 2048000,
      uploadedBy: "system",
      createdAt: new Date()
    }
  ];

  private segments: any[] = [];
  private mappings: any[] = [];
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