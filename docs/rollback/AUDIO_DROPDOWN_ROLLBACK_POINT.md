# Audio Dropdown State Management - Rollback Point

## Issue Analysis
**Problem**: The Mapping tab dropdown for audio file selection is broken
- Hard-coded to always select first file: `audioFiles[0]?.id.toString()`
- Empty onValueChange handler with TODO comment
- ProgressiveMapper receives hard-coded first file instead of user selection

## Current State Review (Pre-Fix)

### State Management
- `selectedAudioFile` state exists at line 273: `useState<any | null>(null)`
- State is properly used in other parts of the application
- Media segments query depends on selectedAudioFileId (line 554)

### Broken Implementation (Lines 1934-1937)
```typescript
<Select
  value={audioFiles[0]?.id.toString() || ''}  // HARD-CODED FIRST FILE
  onValueChange={(value) => {
    // TODO: Handle audio file selection  // EMPTY HANDLER
  }}
>
```

### Broken ProgressiveMapper Props (Line 1986)
```typescript
<ProgressiveMapper
  audioUrl={audioFiles[0]?.filename ? `/uploads/${audioFiles[0].filename}` : ''}  // HARD-CODED
```

### Working Reference Implementation (Lines 2061-2114)
The legacy segmentation tab has working dropdown implementation that we can use as reference.

## Rollback Instructions
If issues arise, revert the following files to this state:
- `client/src/pages/ChapterEditor.tsx` (lines 1934, 1935-1937, 1986)

## Implementation Plan Ready
Ready to proceed with 3-line fix to connect dropdown to existing selectedAudioFile state.