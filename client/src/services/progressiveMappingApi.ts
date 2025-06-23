/**
 * Progressive Mapping API Service
 * 
 * Handles all backend API calls for audio-text mapping operations.
 * Provides type-safe interface for mapping CRUD operations.
 * 
 * Created: December 2024
 * Purpose: Backend integration for progressive mapping
 */

import { apiRequest } from '@/lib/queryClient';
import type { AudioMappingDatabase } from '@shared/types/text-segmentation';

export const progressiveMappingApi = {
  /**
   * Get all mappings for a specific chapter
   */
  async getMappingsByChapter(chapterId: number): Promise<AudioMappingDatabase[]> {
    const response = await fetch(`/api/mappings/chapter/${chapterId}`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch chapter mappings: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Create a new audio mapping
   */
  async createMapping(mapping: Omit<AudioMappingDatabase, 'id' | 'createdBy' | 'createdAt'>): Promise<AudioMappingDatabase> {
    const response = await apiRequest('POST', '/api/mappings', mapping);
    return response.json();
  },

  /**
   * Update mapping timestamps
   */
  async updateMapping(segmentId: number, updates: { startTime?: number; endTime?: number }): Promise<void> {
    await apiRequest('PATCH', `/api/mappings/${segmentId}`, updates);
  },

  /**
   * Delete a mapping
   */
  async deleteMapping(audioFileId: number, segmentId: number): Promise<void> {
    await apiRequest('DELETE', `/api/mappings/${audioFileId}/${segmentId}`);
  },

  /**
   * Get mappings by audio file (existing endpoint)
   */
  async getMappingsByAudioFile(audioFileId: number): Promise<AudioMappingDatabase[]> {
    const response = await fetch(`/api/mappings/audio/${audioFileId}`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch audio mappings: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Get mappings by segment (existing endpoint)
   */
  async getMappingsBySegment(segmentId: number): Promise<AudioMappingDatabase[]> {
    const response = await fetch(`/api/mappings/segment/${segmentId}`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch segment mappings: ${response.statusText}`);
    }
    return response.json();
  }
};