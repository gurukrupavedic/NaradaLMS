# Segment & Map Tab Restoration Guide

## Quick Reference
If you ever need to restore the original "Segment & Map" tab functionality, follow this step-by-step guide.

**Estimated Time**: 5-30 minutes depending on scope
**Risk Level**: Low (only UI changes, no backend modifications)

## Restoration Steps

### Step 1: Enable Tab in ChapterEditor (5 minutes)

1. **Open**: `client/src/pages/ChapterEditor.tsx`

2. **Uncomment Tab Trigger** (around line 1399-1405):
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

3. **Uncomment Tab Content** (around lines 1640-2495):
```typescript
// UNCOMMENT THIS ENTIRE SECTION:
<TabsContent value="segmentation" className="space-y-6">
  {/* All the Segment & Map functionality */}
</TabsContent>
```

### Step 2: Verify State Variables (2 minutes)

Ensure these state variables are present (should already exist):
```typescript
// Audio and segmentation state
const [selectedAudioFile, setSelectedAudioFile] = useState<any | null>(null);
const [timeMarks, setTimeMarks] = useState<number[]>([]);
const [selectedMark, setSelectedMark] = useState<number | null>(null);
const [isDragging, setIsDragging] = useState(false);
const [editingTimestamp, setEditingTimestamp] = useState<number | null>(null);
// ... and 39 other related state variables
```

### Step 3: Test Core Features (15 minutes)

1. **Audio Upload**: Verify file upload works
2. **Timeline Markers**: Test adding/dragging time markers
3. **Bulk Segment Creation**: Test "Create Audio Segments" button
4. **Media Segment Management**: Test edit/delete operations
5. **Audio Playback**: Verify play/pause/seek functionality

### Step 4: Verify API Integration (5 minutes)

Check these endpoints are working:
- `GET /api/admin/audio-files/${chapterId}`
- `POST /api/admin/media-segments/bulk`
- `PATCH /api/admin/media-segments/${id}`
- `DELETE /api/admin/media-segments/${id}`

## Feature Verification Checklist

### Audio Timeline Controls
- [ ] Drag and drop time markers
- [ ] Edit timestamp by clicking on time labels
- [ ] Visual triangle indicators appear correctly
- [ ] Timeline scrubbing updates audio position

### Audio Playback
- [ ] Play/pause button functionality
- [ ] Stop button resets to beginning
- [ ] Timeline position updates in real-time
- [ ] Audio loading error handling

### Segment Management
- [ ] Bulk segment creation from markers
- [ ] Individual segment editing (start/end times)
- [ ] Segment deletion with confirmation
- [ ] Segment playback with boundary enforcement

### State Management
- [ ] Audio file selection persists
- [ ] Time markers survive audio file changes
- [ ] UI updates reflect backend changes
- [ ] Error states display properly

## Troubleshooting Common Issues

### Timeline Markers Not Draggable
- Check mouse event handlers in lines 253-274
- Verify `handleMouseMove` and `handleMouseUp` are bound
- Ensure `timelineRef` is properly connected

### Audio Not Loading
- Check file path construction: `/uploads/${filename}`
- Verify CORS settings for audio files
- Check browser console for loading errors

### Segments Not Creating
- Verify `createAudioSegmentsMutation` is working
- Check network tab for API call failures
- Ensure `selectedAudioFile` state is set

### State Inconsistencies
- Clear browser cache and reload
- Check for conflicting useEffect dependencies
- Verify query invalidation after mutations

## Rollback Plan

If restoration causes issues:

1. **Re-comment the tab**: Add `//` to tab trigger and content
2. **Clear state**: Reset any problematic state variables
3. **Refresh browser**: Force clean state reload

## Integration with New Tabs

If you restore Segment & Map alongside new experimental tabs:

### 5-Tab Structure
```
Text Content | Media Content | Segment & Map | Text Segmentation | Audio & Mapping
```

### Potential State Conflicts
- Ensure `selectedLanguage` is shared across all tabs
- Coordinate `audioFiles` data between Segment & Map and Audio & Mapping
- Consider unified segment data model

### User Experience Considerations
- Provide clear guidance on which workflow to use
- Consider making Segment & Map "Advanced Mode"
- Add tooltips explaining the difference between approaches

## Code References

### Key Functions to Understand
- `handleMarkTime()` - Adds time markers
- `handleClearMark()` - Removes selected marker
- `createAudioSegmentsMutation()` - Creates segments from markers
- `playAudioSegment()` - Plays specific segment with boundaries

### Important State Variables
- `timeMarks` - Array of timeline marker positions
- `selectedMark` - Currently selected marker for editing
- `mediaSegments` - Audio segments from database
- `selectedAudioFile` - Currently loaded audio file

### Critical Components
- Timeline input with custom markers (lines 1801-1907)
- Audio player controls (lines 1910-2007)
- Media segments list (lines 2030-2315)
- Text segmentation interface (lines 2318-2495)

This guide ensures you can always restore the original functionality if the experimental approach doesn't meet all requirements or if you want to offer both workflows to users.