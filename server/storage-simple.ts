import type { User, UpsertUser } from "@shared/schema";

// Simple in-memory storage for initial testing
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
  getChapter(id: string): Promise<any | undefined>;
  
  // Student progress
  getStudentProgress(studentId: string): Promise<any[]>;
  getStudentStats(studentId: string): Promise<any>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private tracks: any[] = [
    {
      id: "1",
      title: "Śraddhā Sūktam",
      description: "Learn the sacred hymn to Faith from Rigveda Saṃhitā (RV 10.151)",
      status: "published",
      chapters: [
        {
          id: "1",
          title: "श्रद्धाया॒ऽग्निस्समि॑ध्यते",
          order: 1,
          proficiencyLevel: 2
        },
        {
          id: "2", 
          title: "श्रद्धया॑ विन्दते ह॒विः",
          order: 2,
          proficiencyLevel: 1
        }
      ]
    },
    {
      id: "2",
      title: "Vedādhyayana Niyamāḥ",
      description: "Essential rules and principles for Vedic study",
      status: "published", 
      chapters: [
        {
          id: "3",
          title: "वेदाध्ययन नियमाः",
          order: 1,
          proficiencyLevel: 3
        }
      ]
    }
  ];
  
  private chapters: any[] = [
    {
      id: "1",
      title: "श्रद्धाया॒ऽग्निस्समि॑ध्यते",
      trackId: "1",
      order: 1,
      content: {
        te: "శ్రద్ధాయా॒ఽగ్నిస్సమి॑ధ్యతే । శ్రద్ధయా॑ హోత్రి॒యం కృ॒తమ్ ।\nశ్రద్ధాం భాగ॒ధేయే॑షు అ॒గ్రే॒ వాచా॑ వ॒దామసి॑ ॥",
        hi: "श्रद्धाया॒ऽग्निस्समि॑ध्यते । श्रद्धया॑ होत्रि॒यं कृ॒तम् ।\nश्रद्धां भाग॒धेये॑षु अ॒ग्रे॒ वाचा॑ व॒दामसि॑ ॥",
        en: "śraddhāyā̠-'gni-ssami̍dhyatē । śraddhayā̍ hōtri̠yaṃ kṛ̠tam ।\nśraddhāṃ bhāga̠dhēyē̍ṣu a̠grē̠ vācā̍ va̠dāmasi̍ ॥"
      },
      status: "published",
      audioFiles: [
        {
          id: "1",
          name: "Śraddhā Sūktam - Verse 1",
          reciter: "Paṇḍita Rāma Śāstrī",
          url: "/audio/shraddha-sukta-verse1.mp3"
        }
      ],
      segments: [
        {
          id: 1,
          conceptualName: "श्रद्धाया॒ऽग्निस्समि॑ध्यते",
          textReferences: {
            te: { start: 0, end: 25 },
            hi: { start: 0, end: 23 },
            en: { start: 0, end: 26 }
          }
        },
        {
          id: 2,
          conceptualName: "श्रद्धया॑ होत्रि॒यं कृ॒तम्",
          textReferences: {
            te: { start: 28, end: 56 },
            hi: { start: 26, end: 48 },
            en: { start: 29, end: 52 }
          }
        }
      ],
      mappings: [
        {
          segmentId: 1,
          audioFileId: "1",
          startTime: 0.5,
          endTime: 3.2
        },
        {
          segmentId: 2,
          audioFileId: "1", 
          startTime: 3.5,
          endTime: 6.8
        }
      ]
    },
    {
      id: "2",
      title: "श्रद्धया॑ विन्दते ह॒विः",
      trackId: "1",
      order: 2,
      content: {
        te: "శ్రద్ధయా॑ విన్తతే హ॒విః । శ్రద్ధ॒యా యజ్ఞ॒మాయ॑జే ।\nశ్రద్ధాం దేవే॑షు ధీమహి ॥",
        hi: "श्रद्धया॑ विन्दते ह॒विः । श्रद्ध॒या यज्ञ॒माय॑जे ।\nश्रद्धां देवे॑षु धीमहि ॥",
        en: "śraddhayā̍ vindatē ha̠viḥ । śraddha̠yā yajña̠māya̍jē ।\nśraddhāṃ dēvē̍ṣu dhīmahi ॥"
      },
      status: "published",
      audioFiles: [
        {
          id: "2",
          name: "Śraddhā Sūktam - Verse 2",
          reciter: "Paṇḍita Rāma Śāstrī",
          url: "/audio/shraddha-sukta-verse2.mp3"
        }
      ],
      segments: [
        {
          id: 3,
          conceptualName: "श्रद्धया॑ विन्दते ह॒विः",
          textReferences: {
            te: { start: 0, end: 25 },
            hi: { start: 0, end: 21 },
            en: { start: 0, end: 24 }
          }
        }
      ],
      mappings: [
        {
          segmentId: 3,
          audioFileId: "2",
          startTime: 0.3,
          endTime: 2.9
        }
      ]
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
    return this.tracks;
  }

  async getTrack(id: string): Promise<any | undefined> {
    return this.tracks.find(track => track.id === id);
  }

  async getChapter(id: string): Promise<any | undefined> {
    return this.chapters.find(chapter => chapter.id === id);
  }

  async getStudentProgress(studentId: string): Promise<any[]> {
    return [
      { chapterId: "1", proficiencyLevel: 2 },
      { chapterId: "2", proficiencyLevel: 1 },
      { chapterId: "3", proficiencyLevel: 3 }
    ];
  }

  async getStudentStats(studentId: string): Promise<any> {
    return {
      totalStudyTime: 24,
      chaptersCompleted: 8,
      currentStreak: 5,
      level: 3
    };
  }
}

export const storage = new MemStorage();