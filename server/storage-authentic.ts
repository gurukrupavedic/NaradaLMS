import {
  users,
  type User,
  type UpsertUser,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Interface for storage operations based on prototype requirements
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
  
  // Authentic Vedic content based on prototype
  private tracks: any[] = [
    {
      id: "1",
      title: "Vaidika Nithya Karma",
      description: "Essential daily Vedic practices and regulations for spiritual discipline",
      order: 1,
      status: "published",
      chapterCount: 2,
      completedChapters: 1,
      currentLevel: 2,
      estimatedHours: 12,
      lastModified: "2025-05-28"
    },
    {
      id: "2", 
      title: "Sookta Paatham",
      description: "Recitation of sacred Vedic hymns and their proper pronunciation",
      order: 2,
      status: "draft",
      chapterCount: 1,
      completedChapters: 0,
      currentLevel: 1,
      estimatedHours: 15,
      lastModified: "2025-06-01"
    },
    {
      id: "3",
      title: "Rudram Namakam Chamakam", 
      description: "The powerful Śri Rudram from Yajurveda - Namakam and Chamakam portions",
      order: 3,
      status: "draft",
      chapterCount: 0,
      completedChapters: 0,
      currentLevel: 0,
      estimatedHours: 25,
      lastModified: "2025-06-02"
    }
  ];
  
  // Authentic Vedic chapters based on prototype
  private chapters: any[] = [
    {
      id: "1",
      title: "Vedādhyayana Niyamamulu",
      trackId: "1",
      order: 1,
      content: {
        te: "ఇది వేదాధ్యయన నియమములు పై పూర్తి తెలుగు పాఠం. వేదాధ్యయనము చేయుటకు పూర్వము గురువును వందించి, శుచిగా నుండి, పూర్వదిక్కు ముఖముగా గాని, ఉత్తరదిక్కు ముఖముగా గాని కూర్చుని అధ్యయనము చేయవలెను. వేదమును అధ్యయనము చేయుచున్నప్పుడు మనస్సును స్థిరపరచి, ఏకాగ్రచిత్తముతో వినవలెను.",
        hi: "यह वेदाध्ययन नियममुलु पर पूरा देवनागरी पाठ है। वेदाध्ययन करने से पूर्व गुरु को वन्दना करके, शुद्ध होकर, पूर्व दिशा की ओर अथवा उत्तर दिशा की ओर मुख करके बैठकर अध्ययन करना चाहिए। वेद का अध्ययन करते समय मन को स्थिर करके, एकाग्रचित्त से सुनना चाहिए।",
        en: "This is the full English (IAST) text for Vedādhyayana Niyamamulu. Before studying the Vedas, one should venerate the guru, purify oneself, and sit facing east or north for study. While studying the Vedas, one should stabilize the mind and listen with concentrated attention."
      },
      status: "published",
      audioFiles: [
        {
          id: "1",
          name: "Reciter A - Niyamamulu.mp3",
          reciter: "Acharya Alpha",
          url: "/audio/niyamamulu-acharya-alpha.mp3"
        }
      ],
      segments: [
        {
          id: 1,
          conceptualName: "Segment 1: First Rule - Guru Vandana",
          textReferences: {
            te: { start: 0, end: 89 },
            hi: { start: 0, end: 92 },
            en: { start: 0, end: 95 }
          }
        },
        {
          id: 2,
          conceptualName: "Segment 2: Second Rule - Direction and Posture",
          textReferences: {
            te: { start: 90, end: 195 },
            hi: { start: 93, end: 198 },
            en: { start: 96, end: 201 }
          }
        }
      ],
      mappings: [
        {
          segmentId: 1,
          audioFileId: "1",
          startTime: 5.2,
          endTime: 10.5
        },
        {
          segmentId: 2,
          audioFileId: "1",
          startTime: 11.0,
          endTime: 18.3
        }
      ]
    },
    {
      id: "2",
      title: "Śraddhā Sūktaṁ",
      trackId: "1",
      order: 2,
      content: {
        te: "శ్రద్ధాయా॒ఽగ్నిస్సమి॑ధ్యతే । శ్రద్ధయా॑ విందతే హ॒విస్ ।\nశ్రద్ధాం భాగ॒ధేయే॑షు అ॒గ్రే॒ వాచా॑ వ॒దామసి॑ ॥\n\nశ్రద్ధాం విశ్వా॑సి దేవత॒ా ాశ్రద్ధయా॑ య॒జ్ఞమ్ అ॒ఙ్గిర॑స్ ।\nశ్రద్ధాం రా॒ష్ట్రే॒ రాజా॑నశ్చ॒ శ్రద్ధాం ప॒శవోऽ॑భి జాయతే ॥",
        hi: "श्रद्धाया॒ऽग्निस्समि॑ध्यते । श्रद्धया॑ विन्दते ह॒विस् ।\nश्रद्धां भाग॒धेये॑षु अ॒ग्रे॒ वाचा॑ व॒दामसि॑ ॥\n\nश्रद्धां विश्वा॑सि देवता॒ श्रद्धया॑ य॒ज्ञम् अ॒ङ्गिर॑स् ।\nश्रद्धां रा॒ष्ट्रे॒ राजा॑नश्च॒ श्रद्धां प॒शवोऽ॑भि जायते ॥",
        en: "śraddhāyā̠-'gni-ssami̍dhyatē । śraddhayā̍ vindatē ha̠vis ।\nśraddhāṃ bhāga̠dhēyē̍ṣu a̠grē̠ vācā̍ va̠dāmasi̍ ॥\n\nśraddhāṃ viśvā̍si dēvatā̠ śraddhayā̍ ya̠jñam a̠ṅgira̍s ।\nśraddhāṃ rā̠ṣṭrē̠ rājā̍naśca̠ śraddhāṃ pa̠śavō'̍bhi jāyatē ॥"
      },
      status: "published",
      audioFiles: [
        {
          id: "2",
          name: "Shraddha Suktam - Teacher A.mp3",
          reciter: "Teacher A",
          url: "/audio/shraddha-suktam-teacher-a.mp3"
        }
      ],
      segments: [
        {
          id: 3,
          conceptualName: "Verse 1, Line 1",
          textReferences: {
            te: { start: 0, end: 31 },
            hi: { start: 0, end: 33 },
            en: { start: 0, end: 40 }
          }
        },
        {
          id: 4,
          conceptualName: "Verse 1, Line 2",
          textReferences: {
            te: { start: 34, end: 62 },
            hi: { start: 36, end: 64 },
            en: { start: 43, end: 71 }
          }
        }
      ],
      mappings: [
        {
          segmentId: 3,
          audioFileId: "2",
          startTime: 3.0,
          endTime: 7.0
        },
        {
          segmentId: 4,
          audioFileId: "2",
          startTime: 8.0,
          endTime: 11.0
        }
      ]
    },
    {
      id: "3",
      title: "Gaṇapatyatharvaśīrṣopaniṣat",
      trackId: "2",
      order: 1,
      content: {
        te: "ప్రారంభ తెలుగు వచనం. గణపతికి నమస్కారము చేసి, మఙ్గళకర్తయైన వినాయకుని స్మరించుచు ఈ ఉపనిషత్తు ప్రారంభిస్తున్నాము.",
        hi: "",
        en: "Initial English text. We begin this Upanishad by offering salutations to Gaṇapati and remembering the auspicious Vināyaka."
      },
      status: "draft",
      audioFiles: [],
      segments: [],
      mappings: []
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
    const track = this.tracks.find(track => track.id === id);
    if (!track) return undefined;
    
    // Include chapters for this track
    const trackChapters = this.chapters.filter(chapter => chapter.trackId === track.id);
    return {
      ...track,
      chapters: trackChapters
    };
  }

  async getChapter(id: string): Promise<any | undefined> {
    return this.chapters.find(chapter => chapter.id === id);
  }

  async getStudentProgress(studentId: string): Promise<any[]> {
    // Mock progress data based on authentic content
    return [
      {
        id: "prog_1",
        studentId,
        chapterId: "1",
        chapterTitle: "Vedādhyayana Niyamamulu",
        trackTitle: "Vaidika Nithya Karma",
        proficiencyLevel: 3,
        lastAccessed: "2025-01-01T10:30:00Z"
      },
      {
        id: "prog_2", 
        studentId,
        chapterId: "2",
        chapterTitle: "Śraddhā Sūktaṁ",
        trackTitle: "Vaidika Nithya Karma", 
        proficiencyLevel: 2,
        lastAccessed: "2025-01-02T14:15:00Z"
      }
    ];
  }

  async getStudentStats(studentId: string): Promise<any> {
    return {
      totalStudyTime: 24,
      chaptersCompleted: 2,
      currentStreak: 5,
      highestLevel: 3
    };
  }
}

export const storage = new MemStorage();