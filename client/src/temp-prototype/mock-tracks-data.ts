/**
 * Mock data generator for Tracks & Chapters prototyping
 * Generates realistic track/chapter structure for testing UI layouts
 */

export interface MockChapter {
  id: number;
  trackId: number;
  title: string;
  description: string;
  status: 'draft' | 'published';
  order: number;
}

export interface MockTrack {
  id: number;
  title: string;
  description: string;
  order: number;
  chapters: MockChapter[];
}

const TRACK_TITLES = [
  'Vedic Foundations',
  'Rigveda Mantras',
  'Yajurveda Rituals',
  'Samaveda Melodies',
  'Atharvaveda Teachings',
  'Upanishadic Philosophy',
  'Vedantic Wisdom',
  'Ritual Practices',
  'Sacred Sounds',
  'Cosmic Knowledge',
  'Divine Hymns',
  'Spiritual Path',
  'Ancient Wisdom',
  'Eternal Truths',
  'Transcendental Teaching',
];

const CHAPTER_TITLES = [
  'Introduction & Overview',
  'Fundamental Concepts',
  'Core Principles',
  'Sacred Texts',
  'Practical Applications',
  'Deep Dive',
  'Advanced Topics',
  'Integration & Synthesis',
  'Historical Context',
  'Spiritual Significance',
  'Recitation Techniques',
  'Commentary & Analysis',
];

const DESCRIPTIONS = {
  tracks: [
    'A comprehensive exploration of foundational Vedic concepts and their modern applications.',
    'Deep dive into sacred mantras and their phonetic significance.',
    'Understanding the structure and purpose of Vedic rituals.',
    'The musical dimension of Vedic traditions.',
    'Healing and protection through ancient knowledge.',
    'The philosophical underpinnings of Vedic wisdom.',
    'Non-dual understanding and self-realization.',
    'Practical steps for spiritual development.',
    'The power and importance of sacred sounds.',
    'Understanding the universe through Vedic lens.',
    'The devotional aspects of Vedic traditions.',
    'Guidance for modern spiritual seekers.',
    'Timeless wisdom from ancient texts.',
    'Unchanging principles of existence.',
    'The highest teachings of Indian philosophy.',
  ],
  chapters: [
    'Understanding the basic structure and philosophy.',
    'Essential ideas you need to know.',
    'Key teachings and core beliefs.',
    'Exploring important textual passages.',
    'How to apply these teachings in daily life.',
    'Detailed examination and analysis.',
    'Complex concepts and their relationships.',
    'Bringing everything together for complete understanding.',
    'How these teachings developed over time.',
    'The deeper meaning and purpose.',
    'Methods for proper recitation and chanting.',
    'Expert interpretation and scholarly perspectives.',
  ],
};

function getRandomDescription(type: 'tracks' | 'chapters'): string {
  const descriptions = DESCRIPTIONS[type];
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

function getRandomStatus(): 'draft' | 'published' {
  return Math.random() > 0.4 ? 'published' : 'draft';
}

export function generateMockTracks(count: number = 12): MockTrack[] {
  const tracks: MockTrack[] = [];

  for (let i = 0; i < count; i++) {
    const trackId = i + 1;
    const chapterCount = Math.floor(Math.random() * 5) + 8; // 8-12 chapters

    const chapters: MockChapter[] = [];
    for (let j = 0; j < chapterCount; j++) {
      chapters.push({
        id: trackId * 1000 + j + 1,
        trackId,
        title: `${CHAPTER_TITLES[j % CHAPTER_TITLES.length]} - Part ${Math.floor(j / CHAPTER_TITLES.length) + 1}`,
        description: getRandomDescription('chapters'),
        status: getRandomStatus(),
        order: j + 1,
      });
    }

    tracks.push({
      id: trackId,
      title: TRACK_TITLES[i % TRACK_TITLES.length],
      description: getRandomDescription('tracks'),
      order: i + 1,
      chapters: chapters.sort((a, b) => a.order - b.order),
    });
  }

  return tracks.sort((a, b) => a.order - b.order);
}

export const MOCK_TRACKS = generateMockTracks(12);
