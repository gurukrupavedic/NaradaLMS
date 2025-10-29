# Dual Mapping System Analysis

**Status**: Complete Analysis - Ready for Consolidation Decision  
**Date**: October 29, 2025  
**Complexity**: High - Two complete parallel systems managing audio-text mappings

---

## Executive Summary

The Vedic LMS currently operates **TWO COMPLETE MAPPING SYSTEMS** in parallel:

1. **Legacy System**: `audioMappings` table (1 table, simpler architecture)
2. **New System**: `mediaSegments` + `segmentMappings` tables (2 tables, normalized architecture)

These systems are **invisible to each other**, creating data inconsistencies across the application. Different UI tabs query different systems, causing split-brain behavior.

---

## System Architecture

### Legacy System (audioMappings)

**Database Schema** (`shared/schema.ts` lines 122-130):
```typescript
export const audioMappings = pgTable("audio_mappings", {
  id: serial("id").primaryKey(),
  audioFileId: integer("audio_file_id").notNull().references(() => audioFiles.id, { onDelete: "cascade" }),
  segmentId: integer("segment_id").notNull().references(() => textSegments.id, { onDelete: "cascade" }),
  startTime: real("start_time").notNull(),
  endTime: real("end_time").notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});
```

**Key Characteristics**:
- **Single table** storing direct mappings between audio files and text segments
- Timestamps stored directly in the mapping record
- Simpler query structure
- Used since project inception

**API Endpoints** (`server/routes-simple.ts` lines 655-763):
- `GET /api/mappings/chapter/:chapterId` - All mappings for a chapter
- `GET /api/mappings/audio/:audioFileId` - Mappings by audio file
- `GET /api/mappings/segment/:segmentId` - Mappings by text segment
- `POST /api/mappings` - Create mapping
- `PATCH /api/mappings/:segmentId` - Update mapping timestamps
- `DELETE /api/mappings/:audioFileId/:segmentId` - Delete mapping

**Storage Layer** (`server/database-storage.ts` lines 762-815):
- `getMappingsByAudioFile(audioFileId)` - Queries `audioMappings` table
- `getMappingsBySegment(segmentId)` - Queries `audioMappings` table
- `createAudioMapping(mapping)` - Inserts into `audioMappings`
- `deleteAudioMapping(audioFileId, segmentId)` - Deletes from `audioMappings`

**Frontend Services** (`client/src/services/progressiveMappingApi.ts`):
```typescript
export const progressiveMappingApi = {
  getMappingsByChapter(chapterId)      // -> /api/mappings/chapter/:id
  getMappingsByAudioFile(audioFileId)  // -> /api/mappings/audio/:id
  getMappingsBySegment(segmentId)      // -> /api/mappings/segment/:id
  createMapping(mapping)               // -> POST /api/mappings
  updateMapping(segmentId, updates)    // -> PATCH /api/mappings/:id
  deleteMapping(audioFileId, segmentId) // -> DELETE /api/mappings/:audioFileId/:segmentId
}
```

---

### New System (mediaSegments + segmentMappings)

**Database Schema** (`shared/schema.ts` lines 101-119):
```typescript
// Media segments - Audio file timestamp segments
export const mediaSegments = pgTable("media_segments", {
  id: serial("id").primaryKey(),
  audioFileId: integer("audio_file_id").notNull().references(() => audioFiles.id, { onDelete: "cascade" }),
  startTimestamp: real("start_timestamp").notNull(),
  endTimestamp: real("end_timestamp").notNull(),
  segmentName: text("segment_name"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Segment mapping - Maps media segments to text segments
export const segmentMappings = pgTable("segment_mappings", {
  id: serial("id").primaryKey(),
  mediaSegmentId: integer("media_segment_id").notNull().references(() => mediaSegments.id, { onDelete: "cascade" }),
  textSegmentId: integer("text_segment_id").notNull().references(() => textSegments.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});
```

**Key Characteristics**:
- **Two-table normalized architecture**
- Separates audio timestamps (`mediaSegments`) from text-audio relationships (`segmentMappings`)
- More flexible: one media segment can map to multiple text segments (many-to-many)
- Allows independent audio segmentation before text mapping
- More complex queries requiring JOINs

**API Endpoints** (`server/routes-simple.ts` lines 571-653):
- `GET /api/media-segments/:audioFileId` - Get all media segments for audio file
- `POST /api/media-segments` - Create new media segment
- `POST /api/media-segments/bulk` - Bulk create media segments
- `PATCH /api/media-segments/:id` - Update media segment
- `DELETE /api/media-segments/:id` - Delete media segment
- `POST /api/segment-mappings` - Create segment mapping
- `DELETE /api/segment-mappings/:id` - Delete segment mapping

**Storage Layer** (`server/database-storage.ts` lines 818-941):
- `getMediaSegmentsByAudioFile(audioFileId)` - Queries `mediaSegments` table
- `createMediaSegment(segment)` - Inserts into `mediaSegments`
- `updateMediaSegment(id, update)` - Updates `mediaSegments`
- `deleteMediaSegment(id)` - Deletes from `mediaSegments` (cascades to `segmentMappings`)
- `getSegmentMappingsByChapter(chapterId)` - Complex JOIN query across 3 tables
- `createSegmentMapping(mapping)` - Inserts into `segmentMappings`
- `deleteSegmentMapping(id)` - Deletes from `segmentMappings`

**Frontend Hook** (`client/src/hooks/useSegmentData.ts` lines 76-189):
```typescript
// Query: /api/mappings/${chapterId} (legacy system!)
const { data: allChapterMappings } = useQuery({
  queryKey: [`/api/mappings/${chapterId}`],
  enabled: !!chapterId,
});

// Mutation: POST /api/segment-mappings (new system!)
const createSegmentMappingMutation = useMutation({
  mutationFn: async (mapping: any) => {
    await apiRequest("POST", "/api/segment-mappings", mapping);
  }
});

// Mutation: DELETE /api/segment-mappings/:id (new system!)
const deleteSegmentMappingMutation = useMutation({
  mutationFn: async (id: number) => {
    await apiRequest("DELETE", `/api/segment-mappings/${id}`);
  }
});
```

**CRITICAL BUG**: `useSegmentData` hook has schizophrenic behavior:
- **Reads** from legacy system (`/api/mappings`)
- **Writes** to new system (`/api/segment-mappings`)
- Result: UI shows outdated status, creating invisible mappings

---

## Frontend Usage Breakdown

### Audio Mapping Tab
**Location**: `client/src/pages/ChapterEditor.tsx` lines 2333-2497  
**System Used**: **LEGACY (`audioMappings`)**

**Queries**:
```typescript
// Line 610-613: Fetch all chapter mappings for status display
const { data: allChapterMappings = [] } = useQuery({
  queryKey: [`/api/mappings/chapter/${chapterId}`],
  enabled: !!chapterId
});

// Line 695-697: Fetch mappings for selected audio file
const { data: audioFileMappings = [] } = useQuery<AudioMappingDatabase[]>({
  queryKey: [`/api/mappings/audio/${selectedAudioFile?.id}`],
  enabled: !!selectedAudioFile?.id,
});
```

**Mutations**:
```typescript
// Line 1250-1268: Create mapping
const createMappingMutation = useMutation({
  mutationFn: async (mappingData) => {
    return progressiveMappingApi.createMapping(mappingData);
  }
});

// Line 1271-1293: Update mapping
const updateMappingMutation = useMutation({
  mutationFn: async ({ segmentId, updates }) => {
    return progressiveMappingApi.updateMapping(segmentId, updates);
  }
});

// Line 1296-1313: Delete mapping
const deleteMappingMutation = useMutation({
  mutationFn: async ({ audioFileId, segmentId }) => {
    return progressiveMappingApi.deleteMapping(audioFileId, segmentId);
  }
});
```

**Component**: ProgressiveMapper (lines 1654-2485)
- Displays text segments with mapping status
- Shows unmapped/mapped indicators based on `allChapterMappings`
- Click-when-heard workflow for creating mappings
- All CRUD operations use `progressiveMappingApi` (legacy system)

---

### Preview Tab
**Location**: `client/src/pages/ChapterEditor.tsx` lines 3438-3520  
**System Used**: **LEGACY (`audioMappings`)**

**Queries**:
```typescript
// Line 610-613: Same query as Audio Mapping tab
const { data: allChapterMappings = [] } = useQuery({
  queryKey: [`/api/mappings/chapter/${chapterId}`],
  enabled: !!chapterId
});
```

**Segment Click Handler** (lines 616-692):
```typescript
const handlePreviewSegmentClick = useCallback((segmentId: number | undefined) => {
  // Find mapping from legacy system
  const mapping = allChapterMappings.find(m => m.segmentId === segmentId);
  
  if (!mapping) {
    console.log('No mapping found for segment:', segmentId);
    return;
  }
  
  // Use mapping.startTime and mapping.endTime for audio playback
  previewAudioRef.currentTime = mapping.startTime;
  // Auto-stop at mapping.endTime
}, [allChapterMappings?.length]);
```

**Component**: SegmentedTextDisplay (lines 3486-3494)
- In Learn Mode: clickable text segments
- Queries legacy `audioMappings` for playback timestamps
- Highlights selected segment during audio playback

---

### Media Segmentation Panel
**Location**: `client/src/pages/ChapterEditor.tsx` lines 2524-2780  
**System Used**: **NEW (`mediaSegments` + `segmentMappings`)**

**Queries**:
```typescript
// Line 711-715: Fetch media segments for selected audio file
const { data: mediaSegments = [] } = useQuery({
  queryKey: [`/api/media-segments/${selectedAudioFileId}`],
  enabled: !!selectedAudioFileId,
});
```

**Mutations**:
```typescript
// Line 762-777: Update media segment
const updateMediaSegmentMutation = useMutation({
  mutationFn: async ({ id, updates }) => {
    await apiRequest("PATCH", `/api/media-segments/${id}`, updates);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ 
      queryKey: [`/api/media-segments/${selectedAudioFile.id}`] 
    });
  }
});

// Line 789-800: Delete media segment
const deleteMediaSegmentMutation = useMutation({
  mutationFn: async (id: number) => {
    await apiRequest("DELETE", `/api/media-segments/${id}`);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ 
      queryKey: [`/api/media-segments/${selectedAudioFile.id}`] 
    });
  }
});

// Line 1154-1162: Bulk create media segments
mutationFn: async (segments: any[]) => {
  await apiRequest("POST", "/api/media-segments/bulk", { 
    audioFileId: selectedAudioFileId, 
    segments 
  });
},
onSuccess: () => {
  queryClient.invalidateQueries({ 
    queryKey: [`/api/media-segments/${selectedAudioFileId}`] 
  });
}
```

**UI Display**:
- Shows list of media segments for selected audio file
- Each media segment shows `startTimestamp` - `endTimestamp` range
- CRUD operations for audio timestamp segments
- **No visibility** into legacy `audioMappings` data

---

### Text Segmentation Tab
**Location**: `client/src/components/chapter-editor/SegmentationTab.tsx`  
**System Used**: **BOTH (Inconsistent!)**

**Props Received**:
```typescript
interface SegmentationTabProps {
  allChapterMappings: any[]; // From LEGACY system query
  // ... other props
}
```

**Usage**:
```typescript
// Line 42-43: Passed to TextSegment components
segments: any[],
mappings: any[], // allChapterMappings from legacy system
```

**Display Logic**:
- Text segments show "mapped" status if found in `allChapterMappings`
- BUT creation happens via `useSegmentData` which writes to NEW system
- **Result**: Newly created mappings invisible until page reload

---

## Data Flow Analysis

### Legacy System Flow (Audio Mapping Tab & Preview)

```
User Action (Audio Mapping Tab)
    ↓
Click "Create Mapping"
    ↓
progressiveMappingApi.createMapping()
    ↓
POST /api/mappings
    ↓
storage.createAudioMapping()
    ↓
INSERT INTO audioMappings (audioFileId, segmentId, startTime, endTime, createdBy)
    ↓
Cache Invalidation: /api/mappings/chapter/${chapterId}
    ↓
UI Updates: allChapterMappings refetched
    ↓
Preview Tab Sees New Mapping
```

### New System Flow (Media Segmentation Panel)

```
User Action (Media Segmentation Panel)
    ↓
Create Media Segment
    ↓
POST /api/media-segments/bulk
    ↓
storage.createMediaSegment()
    ↓
INSERT INTO mediaSegments (audioFileId, startTimestamp, endTimestamp, segmentName, createdBy)
    ↓
Cache Invalidation: /api/media-segments/${audioFileId}
    ↓
UI Updates: mediaSegments refetched
    ↓
(Optional) Create Segment Mapping
    ↓
POST /api/segment-mappings
    ↓
storage.createSegmentMapping()
    ↓
INSERT INTO segmentMappings (mediaSegmentId, textSegmentId, createdBy)
    ↓
NO CACHE INVALIDATION FOR LEGACY QUERIES!
    ↓
Audio Mapping Tab & Preview Tab DO NOT SEE THIS DATA
```

---

## Critical Issues

### 1. Split-Brain Data Inconsistency

**Problem**: Different tabs query different systems, creating invisible data

**Example Scenario**:
1. User creates media segments in Media Segmentation panel → writes to `mediaSegments`
2. User creates segment mappings → writes to `segmentMappings`
3. User switches to Audio Mapping tab → queries `audioMappings` (empty!)
4. UI shows "0 mapped segments" even though mappings exist in `segmentMappings`

**Impact**: Users think their work is lost, data appears inconsistent

---

### 2. useSegmentData Hook Schizophrenia

**Location**: `client/src/hooks/useSegmentData.ts` lines 76-189

**Bug**:
```typescript
// READS from legacy system
const { data: allChapterMappings = [] } = useQuery({
  queryKey: [`/api/mappings/${chapterId}`], // ← LEGACY
  enabled: !!chapterId,
});

// WRITES to new system
const createSegmentMappingMutation = useMutation({
  mutationFn: async (mapping: any) => {
    await apiRequest("POST", "/api/segment-mappings", mapping); // ← NEW
  }
});
```

**Result**: 
- Status indicators query legacy system
- Mutations write to new system
- UI never updates to show created mappings

---

### 3. Cascade Delete Works (Correctly)

**Good News**: Both systems properly cascade delete

**Legacy System**:
```typescript
// audioMappings schema
audioFileId: integer("audio_file_id").references(() => audioFiles.id, { onDelete: "cascade" })
segmentId: integer("segment_id").references(() => textSegments.id, { onDelete: "cascade" })
```
- Delete audio file → deletes all `audioMappings` for that file
- Delete text segment → deletes all `audioMappings` for that segment

**New System**:
```typescript
// mediaSegments schema
audioFileId: integer("audio_file_id").references(() => audioFiles.id, { onDelete: "cascade" })

// segmentMappings schema
mediaSegmentId: integer("media_segment_id").references(() => mediaSegments.id, { onDelete: "cascade" })
textSegmentId: integer("text_segment_id").references(() => textSegments.id, { onDelete: "cascade" })
```
- Delete audio file → deletes `mediaSegments` → cascades to `segmentMappings`
- Delete text segment → deletes `segmentMappings`
- Delete media segment → deletes `segmentMappings`

**Implication**: Data integrity is maintained within each system, but NOT across systems

---

## System Comparison

| Feature | Legacy (audioMappings) | New (mediaSegments + segmentMappings) |
|---------|------------------------|---------------------------------------|
| **Tables** | 1 table | 2 tables (normalized) |
| **Complexity** | Simple direct mapping | Requires JOINs |
| **Flexibility** | 1:1 audio-to-text | Many-to-many capable |
| **Query Performance** | Fast (single table) | Slower (JOINs required) |
| **Data Model** | Denormalized | Normalized |
| **Frontend Usage** | Audio Mapping Tab, Preview Tab | Media Segmentation Panel |
| **API Maturity** | Complete CRUD | Complete CRUD |
| **Cache Invalidation** | Comprehensive | Isolated to new system |
| **Status Indicators** | Working correctly | Invisible to legacy queries |

---

## Frontend Component Summary

### Components Using LEGACY System:
1. **Audio Mapping Tab** (`ChapterEditor.tsx` lines 2333-2497)
   - Full CRUD via `progressiveMappingApi`
   - ProgressiveMapper component
   - Status badges showing mapped/unmapped counts

2. **Preview Tab** (`ChapterEditor.tsx` lines 3438-3520)
   - Read-only access for playback
   - Segment click handler
   - SegmentedTextDisplay component

3. **Text Segmentation Tab** (partially)
   - Receives `allChapterMappings` prop
   - Shows mapping status indicators

### Components Using NEW System:
1. **Media Segmentation Panel** (`ChapterEditor.tsx` lines 2524-2780)
   - Bulk media segment creation
   - Media segment CRUD
   - Isolated to new system queries

2. **useSegmentData Hook** (partially - writes only)
   - Creates `segmentMappings`
   - Deletes `segmentMappings`
   - BUT reads from legacy system (BUG)

---

## Migration Complexity Assessment

### Option 1: Migrate to New System (Recommended)

**Pros**:
- More flexible architecture (many-to-many)
- Better separation of concerns
- Supports independent audio segmentation workflow
- Normalized data model

**Cons**:
- Requires updating 3+ frontend components
- More complex queries (JOINs)
- Data migration script needed for existing `audioMappings`

**Estimated Effort**: Medium-High
- Data migration script
- Update Audio Mapping Tab to query new system
- Update Preview Tab to query new system
- Fix `useSegmentData` hook
- Update all cache invalidation logic
- Comprehensive testing across all tabs

---

### Option 2: Migrate to Legacy System

**Pros**:
- Simpler architecture
- Faster queries (no JOINs)
- Less code to maintain
- Existing frontend already uses it

**Cons**:
- Loses many-to-many capability
- Loses independent audio segmentation workflow
- Denormalized data model
- Less flexible for future features

**Estimated Effort**: Medium
- Drop new tables
- Update Media Segmentation Panel to use legacy system
- Fix `useSegmentData` hook
- Remove unused API endpoints
- Update documentation

---

### Option 3: Keep Both, Add Bridge Layer (Not Recommended)

**Pros**:
- No immediate breaking changes
- Gradual migration possible

**Cons**:
- Maintains technical debt
- Adds complexity
- Data synchronization overhead
- High risk of bugs

**Estimated Effort**: High (and ongoing maintenance burden)

---

## Recommendation

**Migrate to NEW System** (`mediaSegments` + `segmentMappings`)

**Rationale**:
1. More flexible architecture supports future features
2. Enables independent audio segmentation workflow
3. Better data normalization
4. Already has complete API implementation
5. Only 3 components need updating (doable in one session)

**Migration Path**:
1. Write data migration script (`audioMappings` → `mediaSegments` + `segmentMappings`)
2. Update Audio Mapping Tab queries and mutations
3. Update Preview Tab queries
4. Fix `useSegmentData` hook read operations
5. Update cache invalidation across all components
6. Test all workflows thoroughly
7. Mark `audioMappings` as deprecated (keep for rollback)
8. After 1-2 weeks of stability, drop `audioMappings` table

---

## Next Steps

**Immediate Actions**:
1. Get user approval for migration approach
2. Create detailed migration task list
3. Write reversible data migration script
4. Update frontend components one by one
5. Comprehensive testing before deployment

**DO NOT** proceed with consolidation without user approval and thorough planning.

---

## Technical Debt Score

**Current State**: 🔴 HIGH RISK
- Two systems running in parallel
- Data inconsistency across UI
- User confusion about mapping status
- Invisible data problem in useSegmentData hook

**Post-Migration**: 🟢 LOW RISK
- Single source of truth
- Consistent UI across all tabs
- Clean architecture
- Maintainable codebase

---

## Appendix: Key File References

### Database Schema
- `shared/schema.ts` lines 89-130 (both systems defined)

### Backend
- `server/database-storage.ts` lines 762-941 (both systems implemented)
- `server/routes-simple.ts` lines 571-763 (all API endpoints)

### Frontend Services
- `client/src/services/progressiveMappingApi.ts` (legacy system wrapper)
- `client/src/hooks/useSegmentData.ts` (schizophrenic hook)

### Frontend Components
- `client/src/pages/ChapterEditor.tsx` (all tabs implementation)
- Audio Mapping Tab: lines 2333-2497
- Media Segmentation Panel: lines 2524-2780
- Preview Tab: lines 3438-3520

---

**End of Analysis**
