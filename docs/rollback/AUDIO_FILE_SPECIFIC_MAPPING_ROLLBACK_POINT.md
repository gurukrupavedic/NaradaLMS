# Audio File Specific Mapping Implementation - Rollback Point

**Date:** December 23, 2024  
**Status:** Pre-Implementation Safety Checkpoint  
**Purpose:** Complete system state backup before implementing audio-file-specific mapping functionality

## IMPLEMENTATION OVERVIEW

### Problem Being Solved
- Mappings currently show for entire chapter regardless of selected audio file
- Progress tracking inaccurate across different audio files  
- Session clearing affects all audio files instead of current selection
- No warning when clearing existing mapping work

### Solution Architecture
- Switch from chapter-based to audio-file-based mapping queries
- Add audio file context to session management
- Implement warning dialog for destructive operations
- Update progress calculation per audio file

## CURRENT WORKING STATE

### Frontend Query Structure
**File:** `client/src/pages/ChapterEditor.tsx`  
**Lines 551-556:**
```typescript
// Fetch mappings for the chapter
const { data: chapterMappings = [], refetch: refetchMappings } = useQuery<AudioMappingDatabase[]>({
  queryKey: [`/api/mappings/chapter/${chapterId}`],
  enabled: !!chapterId,
  queryFn: () => progressiveMappingApi.getMappingsByChapter(parseInt(chapterId!))
});
```

### ProgressiveMapper Integration
**File:** `client/src/pages/ChapterEditor.tsx`  
**Lines 2094-2109:**
```typescript
<ProgressiveMapper
  audioUrl={`/uploads/${selectedAudioFile.filename}`}
  segments={segments.map(s => ({ ...s, id: s.id.toString() }))}
  currentLanguage={contentLanguage}
  content={chapterContent}
  mappings={mappings.map(convertDatabaseMapping)} // Shows ALL chapter mappings
  onMappingCreate={(mapping) => {
    createMappingMutation.mutate({
      segmentId: parseInt(mapping.segmentId),
      audioFileId: selectedAudioFile.id,
      startTime: mapping.startTime,
      endTime: mapping.endTime,
      createdBy: "system"
    });
  }}
/>
```

### Session Management Logic
**File:** `shared/hooks/useMappingControls.ts`  
**Lines 67-78:**
```typescript
const startMappingSession = () => {
  onSessionChange('active');
  onActiveSegmentChange(null);
  onSessionStartTimeChange(currentTime);
  
  // Clear existing mappings for current language
  segments.forEach(segment => {
    if (mappings.some(m => m.segmentId === segment.id)) {
      onMappingDelete(segment.id);
    }
  });
};
```

### Progress Calculation
**File:** `client/src/pages/ChapterEditor.tsx`  
**Lines 62-63:**
```typescript
const mappedSegments = currentLanguageSegments.filter(s => mappings.some(m => m.segmentId === s.id));
const progressPercentage = currentLanguageSegments.length > 0 ? (mappedSegments.length / currentLanguageSegments.length) * 100 : 0;
```

### API Service Methods
**File:** `client/src/services/progressiveMappingApi.ts`  
**Lines 18-26:**
```typescript
async getMappingsByChapter(chapterId: number): Promise<AudioMappingDatabase[]> {
  const response = await fetch(`/api/mappings/chapter/${chapterId}`, {
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch chapter mappings: ${response.statusText}`);
  }
  return response.json();
},
```

## BACKEND API STATE

### Existing Endpoints
**File:** `server/routes-simple.ts`

**Chapter Mappings Endpoint (Lines 530-549):**
```typescript
app.get('/api/mappings/chapter/:chapterId', async (req, res) => {
  try {
    const chapterId = parseInt(req.params.chapterId);
    
    // Get all segments for the chapter first
    const segments = await storage.getSegmentsByChapter(chapterId);
    const allMappings = [];
    
    // Fetch mappings for each segment
    for (const segment of segments) {
      const mappings = await storage.getMappingsBySegment(segment.id);
      allMappings.push(...mappings);
    }
    
    res.json(allMappings);
  } catch (error) {
    console.error("Error fetching chapter mappings:", error);
    res.status(500).json({ message: "Failed to fetch chapter mappings" });
  }
});
```

**Audio File Mappings Endpoint (Lines 551-560):**
```typescript
app.get('/api/mappings/audio/:audioFileId', async (req, res) => {
  try {
    const audioFileId = parseInt(req.params.audioFileId);
    const mappings = await storage.getMappingsByAudioFile(audioFileId);
    res.json(mappings);
  } catch (error) {
    console.error("Error fetching audio mappings:", error);
    res.status(500).json({ message: "Failed to fetch audio mappings" });
  }
});
```

## COMPONENT ARCHITECTURE STATE

### Audio Player Panel
**File:** `client/src/components/audio-mapping/AudioPlayerPanel.tsx`  
- Session control buttons working
- Progress display showing chapter-wide metrics
- No warning dialogs implemented

### Progressive Mapper
**File:** `client/src/components/audio-mapping/ProgressiveMapper.tsx`  
- Audio file switching functional
- Mapping creation working with correct audioFileId
- Session management integrated via useMappingControls

### Segment Mapping Grid  
**File:** `client/src/components/audio-mapping/SegmentMappingGrid.tsx`  
- Displaying timestamp pills for all chapter mappings
- Click handlers for segment interaction working

## DATABASE SCHEMA STATE

### Audio Mappings Table
**File:** `shared/schema.ts`
```typescript
export const audioMappings = pgTable("audio_mappings", {
  id: serial("id").primaryKey(),
  audioFileId: integer("audio_file_id").notNull(),
  segmentId: integer("segment_id").notNull(),
  startTime: real("start_time").notNull(),
  endTime: real("end_time").notNull(),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
```

### Storage Interface
**File:** `server/database-storage.ts`  
- `getMappingsByAudioFile(audioFileId)` method exists and functional
- `getMappingsByChapter(chapterId)` method working via segment iteration
- `createAudioMapping()` and `deleteAudioMapping()` methods operational

## VERIFICATION CHECKLIST

### Before Implementation Changes
- [ ] Progressive mapping fully functional with current chapter-based approach
- [ ] Audio file switching working (shows wrong mappings but no crashes)
- [ ] Session management (start/pause/stop/reset) operational
- [ ] Mapping creation and deletion working correctly
- [ ] Progress tracking showing completion percentages
- [ ] Backend endpoints responding correctly

### Core Functionality Tests
- [ ] Can create mappings in active session
- [ ] Can switch between audio files without errors
- [ ] Can start/stop mapping sessions
- [ ] Progress bar updates during mapping
- [ ] Database persistence working correctly

## ROLLBACK PROCEDURE

### If Implementation Issues Occur

**Step 1: Revert Query Changes**
```typescript
// Restore ChapterEditor.tsx lines 551-556
const { data: chapterMappings = [], refetch: refetchMappings } = useQuery<AudioMappingDatabase[]>({
  queryKey: [`/api/mappings/chapter/${chapterId}`],
  enabled: !!chapterId,
  queryFn: () => progressiveMappingApi.getMappingsByChapter(parseInt(chapterId!))
});
```

**Step 2: Restore Session Logic**
```typescript
// Restore useMappingControls.ts lines 67-78
const startMappingSession = () => {
  onSessionChange('active');
  onActiveSegmentChange(null);
  onSessionStartTimeChange(currentTime);
  
  // Clear existing mappings for current language
  segments.forEach(segment => {
    if (mappings.some(m => m.segmentId === segment.id)) {
      onMappingDelete(segment.id);
    }
  });
};
```

**Step 3: Remove New Components**
- Delete any warning dialog components
- Remove audio file context from mapping controls
- Restore original progress calculation logic

### Emergency Restoration Commands
```bash
# If Git available
git checkout -- client/src/pages/ChapterEditor.tsx
git checkout -- shared/hooks/useMappingControls.ts
git checkout -- client/src/services/progressiveMappingApi.ts

# Restart application
npm run dev
```

## SUCCESS METRICS POST-ROLLBACK

- [ ] Can switch audio files without seeing wrong mappings
- [ ] Progress accurately reflects current audio file
- [ ] Session clearing only affects current audio file
- [ ] Warning appears before clearing existing work
- [ ] All existing functionality preserved

## RISK ASSESSMENT

### Low Risk Changes
- Warning dialog implementation (isolated component)
- Progress calculation updates (visual only)
- Backend endpoint verification (read-only testing)

### Medium Risk Changes  
- Query switching (affects data loading)
- Session logic updates (affects user workflow)

### High Risk Changes
- None identified - all changes are incremental and reversible

## IMPLEMENTATION DEPENDENCIES

### Required for Success
- Existing `/api/mappings/audio/:audioFileId` endpoint functional
- selectedAudioFile state management working
- Database audioFileId field populated correctly

### Nice to Have
- Caching strategy for multiple audio file queries
- Loading states for audio file switching
- Bulk operations for mapping management

---

**ROLLBACK TRIGGER CONDITIONS:**
- Mapping interface becomes non-functional
- Audio file switching causes crashes
- Session management stops working
- Data corruption or loss occurs
- Performance degrades significantly

**This rollback point ensures complete restoration capability for the audio-file-specific mapping implementation.**