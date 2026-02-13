/**
 * Mapping Status Utilities
 * 
 * Shared utilities for determining and converting mapping status
 * across different components and data formats.
 * 
 * Updated: December 2025 - Migrated to normalized mapping system
 */

import type { MappingWithTimestamps } from '@narada/types';

export type MappingStatus = 'mapped' | 'unmapped';

export const getMappingStatus = (
  segmentId: number, 
  mappings: MappingWithTimestamps[]
): MappingStatus => {
  return mappings.some(mapping => mapping.textSegmentId === segmentId) 
    ? 'mapped' 
    : 'unmapped';
};

export const getBatchMappingStatus = (
  segmentIds: number[],
  mappings: MappingWithTimestamps[]
): Map<number, MappingStatus> => {
  const statusMap = new Map<number, MappingStatus>();
  const mappedSegmentIds = new Set(mappings.map(m => m.textSegmentId));
  
  segmentIds.forEach(segmentId => {
    statusMap.set(
      segmentId, 
      mappedSegmentIds.has(segmentId) ? 'mapped' : 'unmapped'
    );
  });
  
  return statusMap;
};
