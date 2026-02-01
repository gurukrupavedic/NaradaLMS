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
import type { MappingWithTimestamps } from '@shared/types/text-segmentation';

export const progressiveMappingApi = {
  /**
   * Get all mappings for a specific chapter (legacy - for learning interface)
   */
  async getMappingsByChapter(chapterId: number): Promise<MappingWithTimestamps[]> {
    const response = await apiRequest('GET', `/api/mappings/chapter/${chapterId}`);
    return response.json();
  },

  /**
   * Create a new audio mapping
   */
  async createMapping(mapping: Omit<MappingWithTimestamps, 'mappingId' | 'mediaSegmentId'>): Promise<MappingWithTimestamps> {
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
   * Get mappings by audio file (primary method for content management)
   */
  async getMappingsByAudioFile(audioFileId: number): Promise<MappingWithTimestamps[]> {
    const response = await apiRequest('GET', `/api/mappings/audio/${audioFileId}`);
    return response.json();
  },

  /**
   * Get mapping count for specific audio file
   */
  async getMappingCountByAudioFile(audioFileId: number): Promise<{ count: number }> {
    const response = await apiRequest('GET', `/api/mappings/audio/${audioFileId}/count`);
    return response.json();
  },

  /**
   * Get mappings by segment (existing endpoint)
   */
  async getMappingsBySegment(segmentId: number): Promise<MappingWithTimestamps[]> {
    const response = await apiRequest('GET', `/api/mappings/segment/${segmentId}`);
    return response.json();
  }
};