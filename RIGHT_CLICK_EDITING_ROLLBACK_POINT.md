# Right-Click Segment Editing Removal - Rollback Point

## Date: January 23, 2025
## Goal: Remove right-click segment editing feature and all orphaned code

## Current State Before Changes

### Feature Analysis Completed
- Right-click on yellow highlighted segments shows floating popup with edit/delete options
- Feature provides inline segment name editing and deletion
- Redundant with SegmentPanel functionality which provides same capabilities
- Safe to remove - no functional loss, only UI interaction simplification

### Critical Orphan Code Identified

#### File: `client/src/components/text-segmentation/AnnotationLayer.tsx`

**Code to Remove:**
1. **State Declaration (Line 58)**
   ```typescript
   const [editingSegment, setEditingSegment] = useState<string | null>(null);
   ```

2. **Right-Click Handler (Lines 303-314)**
   ```typescript
   onContextMenu={(e) => {
     e.preventDefault();
     const target = e.target as HTMLElement;
     const segmentElement = target.closest('[title]');
     if (segmentElement) {
       const segmentTitle = segmentElement.getAttribute('title');
       const segment = segments.find(s => s.conceptualName === segmentTitle);
       if (segment) {
         setEditingSegment(segment.id);
       }
     }
   }}
   ```

3. **Floating Edit UI (Lines 220-268)**
   - Input field for segment name editing
   - Cancel and Delete buttons
   - Keyboard shortcuts (Enter/Escape)
   - Auto-focus and blur handling

4. **Orphaned Imports**
   ```typescript
   import { Input } from '@/components/ui/input';  // Line 13 - ORPHANED
   import { Trash2 } from 'lucide-react';          // Line 16 - ORPHANED
   ```

5. **All setEditingSegment Calls (8 occurrences)**
   - Lines: 231, 233, 241, 250, 260, 311

**Code to Keep:**
- `Button` import - Used by FloatingSelectionToolbar
- `onSegmentUpdate` prop - Used by SegmentPanel
- `onSegmentDelete` prop - Used by SegmentPanel
- All text highlighting and selection logic
- All segment rendering functionality

### Impact Assessment
- **Code Reduction**: ~55 lines removed
- **Functional Impact**: Zero - SegmentPanel provides same functionality
- **Risk Level**: Zero - Self-contained feature with clean boundaries
- **Files Affected**: Only `AnnotationLayer.tsx` - no other components impacted

### Verification Plan
After removal:
1. Verify segment highlighting still works
2. Verify text selection and segment creation still works
3. Verify SegmentPanel edit/delete functionality still works
4. Verify no console errors from missing imports
5. Verify right-click no longer shows edit popup

## Rollback Instructions
If issues occur, restore this file from git history:
- `client/src/components/text-segmentation/AnnotationLayer.tsx`

The changes are isolated to this single file with no cross-component dependencies.