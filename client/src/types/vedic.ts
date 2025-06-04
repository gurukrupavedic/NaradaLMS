import type { Chapter, AudioFile, TextSegment, AudioMapping } from "@shared/schema";

export interface ChapterWithDetails extends Chapter {
  audioFiles: AudioFile[];
  segments: TextSegment[];
  audioMappings: Array<{
    audioFileId: number;
    mappings: AudioMapping[];
  }>;
}

export interface TrackWithChapters {
  id: number;
  title: string;
  description: string | null;
  order: number;
  status: string;
  createdBy: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  chapters: Chapter[];
}

export interface ContentCompleteness {
  hasText: boolean;
  hasAudio: boolean;
  hasSegments: boolean;
  hasMappings: boolean;
}

export interface SegmentMapping {
  segmentId: number;
  startTime: number;
  endTime: number;
}

export interface AudioFileWithMappings extends AudioFile {
  mappings: SegmentMapping[];
}

export type ScriptType = 'te' | 'hi' | 'en';

export interface ScriptOption {
  id: ScriptType;
  name: string;
  fullName: string;
  fontClass: string;
}

export const SCRIPT_OPTIONS: ScriptOption[] = [
  { id: 'te', name: 'తెలుగు', fullName: 'Telugu', fontClass: 'font-tiro-telugu' },
  { id: 'hi', name: 'देवनागरी', fullName: 'Devanagari', fontClass: 'font-tiro-devanagari' },
  { id: 'en', name: 'English (IAST)', fullName: 'English (IAST)', fontClass: 'font-tiro-devanagari' },
];
