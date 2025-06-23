# Link Status Error Detection - Implementation Plan

## Overview
Implement comprehensive error detection for segment-to-audio mappings to identify broken links and display red broken-link icons in the UI.

## Error States to Detect

### 1. Audio File Deletion
**Scenario**: Text segment mapped to audio file that no longer exists
- **Detection**: Check if referenced audio file ID exists in database
- **Query**: `SELECT id FROM audio_files WHERE id = mapping.audioFileId`
- **Error Type**: `AUDIO_FILE_MISSING`

### 2. Media Segment Missing
**Scenario**: Mapping references media segment that was deleted
- **Detection**: Verify media segment exists and belongs to correct audio file
- **Query**: `SELECT id FROM media_segments WHERE id = mapping.mediaSegmentId AND audioFileId = mapping.audioFileId`
- **Error Type**: `MEDIA_SEGMENT_MISSING`

### 3. Invalid Time Ranges
**Scenario**: Media segment has invalid or corrupted time data
- **Detection**: Check for logical time ranges (start < end, both > 0)
- **Validation**: `startTime >= 0 AND endTime > startTime AND endTime <= audioDuration`
- **Error Type**: `INVALID_TIME_RANGE`

### 4. Audio File Corruption
**Scenario**: Audio file exists in database but physical file is missing/corrupted
- **Detection**: Verify file exists at stored path and is readable
- **Check**: File system validation + basic metadata reading
- **Error Type**: `AUDIO_FILE_CORRUPTED`

### 5. Chapter Mismatch
**Scenario**: Mapped audio file doesn't belong to current chapter
- **Detection**: Verify audio file's chapterId matches text segment's chapterId
- **Query**: Compare `audio_files.chapterId` with `text_segments.chapterId`
- **Error Type**: `CHAPTER_MISMATCH`

## Implementation Strategy

### 1. Database Layer
```typescript
// New function in database-storage.ts
async validateSegmentMapping(mappingId: number): Promise<MappingValidationResult> {
  // Check all error conditions
  // Return detailed error information
}

interface MappingValidationResult {
  isValid: boolean;
  errors: MappingError[];
  mapping: SegmentMapping;
}

interface MappingError {
  type: 'AUDIO_FILE_MISSING' | 'MEDIA_SEGMENT_MISSING' | 'INVALID_TIME_RANGE' | 'AUDIO_FILE_CORRUPTED' | 'CHAPTER_MISMATCH';
  message: string;
  severity: 'warning' | 'error';
}
```

### 2. Validation Service
```typescript
// New file: shared/mapping-validator.ts
export class MappingValidator {
  async validateAllMappings(chapterId: number): Promise<Map<string, MappingValidationResult>>;
  async validateSingleMapping(mappingId: number): Promise<MappingValidationResult>;
  private checkAudioFileExists(audioFileId: number): Promise<boolean>;
  private checkMediaSegmentExists(mediaSegmentId: number): Promise<boolean>;
  private validateTimeRanges(segment: MediaSegment): boolean;
  private checkFileSystemIntegrity(filePath: string): Promise<boolean>;
}
```

### 3. UI Integration
```typescript
// Enhanced status calculation in SegmentPanel.tsx
const getMappingStatus = (segmentId: string, mappings: AudioMapping[], validationResults?: Map<string, MappingValidationResult>) => {
  const mapping = getSegmentMapping(segmentId, mappings);
  if (!mapping) return 'unmapped';
  
  const validation = validationResults?.get(segmentId);
  if (validation && !validation.isValid) return 'broken';
  
  return 'mapped';
};
```

### 4. Performance Considerations
- **Batch validation**: Validate all chapter mappings in single operation
- **Caching**: Cache validation results to avoid repeated checks
- **Background validation**: Run validation periodically, not on every render
- **Lazy loading**: Only validate when user views segment panel

### 5. User Experience
- **Error tooltips**: Show specific error details on hover
- **Bulk repair**: Provide tools to fix common issues
- **Error summary**: Show chapter-level error count in header
- **Auto-refresh**: Re-validate after user makes changes

## API Endpoints Needed

### 1. Validation Endpoint
```
GET /api/admin/chapters/{id}/validate-mappings
Response: { segmentId: ValidationResult }
```

### 2. Repair Endpoint
```
POST /api/admin/mappings/{id}/repair
Body: { repairAction: 'remove' | 'reassign' | 'fix-times' }
```

## Testing Requirements

### 1. Error Simulation
- Create test scenarios for each error type
- Verify correct icon states and colors
- Test tooltip content and formatting

### 2. Performance Testing
- Measure validation time with large datasets
- Test caching effectiveness
- Verify UI responsiveness during validation

### 3. Edge Cases
- Multiple simultaneous errors on single mapping
- Partially corrupted data scenarios
- Network failures during validation

## Implementation Priority
1. **Phase 1**: Basic file existence checks (AUDIO_FILE_MISSING, MEDIA_SEGMENT_MISSING)
2. **Phase 2**: Time range validation (INVALID_TIME_RANGE)
3. **Phase 3**: File system integrity (AUDIO_FILE_CORRUPTED)
4. **Phase 4**: Advanced validation and repair tools

## Dependencies
- No new external libraries required
- Uses existing database and file system utilities
- Leverages current mapping and utility functions

---
*Status: Planning Phase*
*Estimated Implementation Time: 8-12 hours*
*Priority: Medium (post-MVP feature)*