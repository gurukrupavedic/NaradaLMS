/**
 * Mapping Status Utilities
 * 
 * Shared utilities for determining and converting mapping status
 * across different components and data formats.
 */

import type { AudioMappingDatabase } from '@shared/types/text-segmentation';

export type MappingStatus = 'mapped' | 'unmapped';

/**
 * Determines if a segment has any audio mappings
 * Uses simple existence check for now (no validation)
 */
export const getMappingStatus = (
  segmentId: number, 
  mappings: AudioMappingDatabase[]
): MappingStatus => {
  return mappings.some(mapping => mapping.segmentId === segmentId) 
    ? 'mapped' 
    : 'unmapped';
};

/**
 * Batch status calculation for multiple segments
 * Optimized for performance with large datasets
 */
export const getBatchMappingStatus = (
  segmentIds: number[],
  mappings: AudioMappingDatabase[]
): Map<number, MappingStatus> => {
  const statusMap = new Map<number, MappingStatus>();
  const mappedSegmentIds = new Set(mappings.map(m => m.segmentId));
  
  segmentIds.forEach(segmentId => {
    statusMap.set(
      segmentId, 
      mappedSegmentIds.has(segmentId) ? 'mapped' : 'unmapped'
    );
  });
  
  return statusMap;
};