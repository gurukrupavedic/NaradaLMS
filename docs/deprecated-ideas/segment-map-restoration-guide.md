# Quick Restoration Guide: Segment & Map Tab

## 5-Minute Restoration Steps

### Step 1: Uncomment Tab Trigger
**File**: `client/src/pages/ChapterEditor.tsx`  
**Lines**: 1399-1405

```typescript
// UNCOMMENT THIS:
<TabsTrigger
  value="segmentation"
  className="flex items-center gap-2"
>
  <Music className="w-4 h-4" />
  Segment & Map
</TabsTrigger>
```

### Step 2: Uncomment Tab Content
**File**: `client/src/pages/ChapterEditor.tsx`  
**Lines**: 1640-2495

```typescript
// UNCOMMENT THIS ENTIRE SECTION:
<TabsContent value="segmentation" className="space-y-6">
  {/* All segment & map functionality - 855 lines */}
</TabsContent>
```

### Step 3: Verify State Variables
**File**: `client/src/pages/ChapterEditor.tsx`  
**Lines**: 205-248

Ensure these state variables are active:
- `selectedAudioFile`, `audioPlayer`, `isPlaying`
- `timeMarks`, `selectedMark`, `isDragging` 
- `editingSegmentId`, `mediaSegmentName`
- All 44 state variables for audio/text functionality

### Step 4: Test Core Features
1. Upload audio file
2. Create timeline markers by clicking "Mark Time"
3. Generate bulk segments with "Create Audio Segments"
4. Edit segment times inline
5. Test text selection and segment creation

## Rollback from 4-Tab Structure

If migrating back from new tabs:
1. Comment out new experimental tabs
2. Uncomment original "Segment & Map" tab
3. Remove experimental imports and state
4. Test all original functionality

**Estimated Time**: 5-10 minutes