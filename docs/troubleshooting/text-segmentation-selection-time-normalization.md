# Text Segmentation: Current Status & Historical Issues

**Status**: FUNCTIONAL - Minor UI Issue Documented  
**Date**: June 19, 2025 (Original), July 30, 2025 (Updated)  
**Component**: Text Segmentation Studio  

## Current Status (July 30, 2025)

**Text segmentation is FUNCTIONAL** with current implementation using `getDisplayText()` approach. Testing on Śraddhā sūktaṁ English script confirms:

✅ **Working Features:**
- Single-line text selection works perfectly
- Multi-line text selection creates segments successfully  
- Position calculations are accurate
- Segment creation/deletion operational
- Audio mapping integration functional

⚠️ **Minor UI Issue (Non-blocking):**
- Multi-line segment selections display as continuous single line in UI
- Line breaks are removed from visual display in segment cards
- Functionality preserved - just visual formatting limitation
- **Decision**: Acceptable for current use, not a show stopper

## Historical Problem Analysis (June 19, 2025)

Previous issues documented here were from earlier implementation attempts. Current system resolved these through consistent plain-text processing via `getDisplayText()` function.

## Symptoms Observed

1. **Selection Corruption**: Text segments show different content than what user actually selected
2. **Position Mismatch**: Calculated start/end positions don't align with intended selection
3. **Multi-line Issues**: Selections spanning multiple lines capture incorrect text ranges
4. **Unicode Handling**: Telugu/Devanagari characters with diacritical marks cause position drift

## Root Cause Analysis

### Primary Issue: Normalization Timing
We attempted to solve line break inconsistencies by normalizing content at storage time. This created a new problem:

- **Storage**: Content normalized with consistent `\n` line breaks
- **Browser DOM**: Renders text with browser-specific line break handling
- **Selection API**: Returns text in DOM format (not matching normalized storage)
- **Position Calculation**: Tries to match DOM selection against normalized storage

### Technical Details

1. **DOM vs Storage Mismatch**: Browser `getSelection()` returns text formatted by DOM rendering, which differs from our normalized storage strings

2. **Unicode Complexity**: Telugu/Devanagari combining characters and diacritical marks may have different representations between DOM and storage

3. **Line Break Handling**: Despite normalization, browser rendering and string storage handle whitespace differently

4. **Character-by-Character Positioning**: Using `indexOf()` for position calculation is fragile with complex Unicode scripts

## Previous Attempts and Why They Failed

### Attempt 1: Dual Storage Approach
- **Method**: Store both display and segmentation versions of content
- **Outcome**: Overly complex, didn't solve core DOM vs storage mismatch
- **Reason for Failure**: Still had mismatch between what user sees and what we calculate against

### Attempt 2: Storage-Time Normalization (Current)
- **Method**: Normalize content when storing, use for both display and segmentation
- **Outcome**: Partial success but still position corruption
- **Reason for Failure**: DOM-rendered text doesn't exactly match normalized storage

## Proposed Solution: Selection-Time Normalization

### Simple Approach (TL;DR)

**The Problem**: User selects text in browser, but our position calculation doesn't match because browser text ≠ stored text.

**The Fix**: 
1. Store content exactly as it appears to user (no changes)
2. When user selects text, temporarily clean both the selection and stored text 
3. Calculate position using the cleaned versions
4. Save the position relative to the original content

**Why This Works**: Browser and storage will always match perfectly since we don't modify stored content. We only use cleaning for the brief moment of position calculation.

**Implementation**: 
- Keep original content exactly as entered (for display and DOM matching)
- When user selects text: temporarily normalize both selection and stored content
- Calculate positions using normalized versions
- Store the segment with positions relative to original content
- Display always uses original content

### Core Strategy
Normalize at the moment of text selection for position calculation only, while keeping original content for display.

### Implementation Approach

#### 1. Content Storage
```javascript
// Store original content exactly as provided
content: {
  te: `శ్ర॒ద్ధాయా॒ఽగ్నిః సమి॑ధ్యతే । శ్ర॒ద్ధయా॑ విందతే హ॒విః ।
శ్ర॒ద్ధాం భగ॑స్య మూ॒ర్ధని॑ । వచ॒సాఽఽవే॑దయామసి ।`, // Original formatting
  hi: `...`, // Original formatting
  en: `...`  // Original formatting
}
```

#### 2. Selection Processing Flow
```javascript
// When user selects text
const handleTextSelection = (userSelection) => {
  // 1. Get raw selection from browser
  const rawSelection = window.getSelection().toString();
  
  // 2. Get original stored content
  const originalContent = getDisplayText(content, language);
  
  // 3. Normalize BOTH for comparison
  const normalizedSelection = normalizeLineBreaks(rawSelection);
  const normalizedContent = normalizeLineBreaks(originalContent);
  
  // 4. Calculate position in normalized space
  const normalizedPosition = normalizedContent.indexOf(normalizedSelection);
  
  // 5. Convert back to original content position
  const originalPosition = mapNormalizedToOriginal(normalizedPosition, originalContent);
  
  // 6. Store segment with original content positions
  createSegment({
    textReferences: {
      [language]: {
        start: originalPosition.start,
        end: originalPosition.end
      }
    }
  });
};
```

#### 3. Position Mapping Function
```javascript
const mapNormalizedToOriginal = (normalizedPos, originalText) => {
  // Convert position from normalized space back to original text space
  // Account for line break differences between normalized and original
};
```

#### 4. Display and Highlighting
```javascript
// Use original content for display (perfect DOM match)
const displayText = content[language]; // No normalization

// Use stored positions directly for highlighting
const highlightSegment = (segment) => {
  const range = segment.textReferences[language];
  return displayText.slice(range.start, range.end);
};
```

### Why This Will Work

1. **Perfect DOM Match**: Display content identical to what user interacts with
2. **Consistent Comparison**: Both selection and target use same normalization at selection time
3. **Accurate Positioning**: Calculations done in controlled normalized space
4. **Format Preservation**: Original formatting maintained for display fidelity
5. **Reliable Mapping**: Positions converted back to original content coordinate system

## Implementation Steps

### Phase 1: Revert Storage Changes
1. Remove `normalizeLineBreaks()` calls from storage
2. Restore original content formatting in `server/storage-simplified.ts`
3. Update utility functions to handle original content

### Phase 2: Update Selection Logic
1. Modify `Experiment1_AnnotationLayer.tsx` selection handler
2. Implement selection-time normalization
3. Create position mapping utilities
4. Update `getTextPosition()` function

### Phase 3: Testing & Validation
1. Test with single-line selections
2. Test with multi-line selections
3. Test with complex Unicode characters
4. Verify position accuracy across all languages

## Files to Modify

- `server/storage-simplified.ts` - Remove storage normalization
- `shared/experiment1-utils.ts` - Update utility functions
- `client/src/components/experiment1/Experiment1_AnnotationLayer.tsx` - Main selection logic
- Test with clean Shradha Suktam content

## Technical Considerations

1. **Performance**: Normalization at selection time vs storage time
2. **Memory**: Storing original vs normalized content
3. **Complexity**: Position mapping logic implementation
4. **Edge Cases**: Empty selections, special characters, very long texts

## Success Criteria (Status as of July 30, 2025)

- [x] Text selections match exactly what user highlighted
- [x] Positions calculate accurately for single and multi-line selections
- [x] Unicode characters handle correctly across all three languages (Telugu, Hindi, English)
- [x] No text corruption in segment display (content preserved correctly)
- [x] Consistent behavior across different browsers
- [⚠️] Visual formatting: Multi-line segments display as single line (minor UI issue only)

## Current Working Implementation

The segmentation system uses a **clean conversion approach**:
1. **Storage**: HTML format (preserves rich formatting)
2. **Display**: `getDisplayText()` converts HTML → plain text consistently
3. **Selection**: Browser selects from plain text display
4. **Positioning**: Calculated on same plain text (no HTML/DOM conflicts)
5. **Segments**: Store positions relative to normalized plain text

This approach eliminated the DOM vs storage mismatch issues documented in earlier attempts.

## Notes

This approach addresses the fundamental issue that the previous solutions missed: the mismatch between DOM-rendered content and stored content. By keeping them identical and only normalizing during the comparison phase, we eliminate the source of position calculation errors.

The pain point we discovered is that any pre-processing of content for storage creates a disconnect with the browser's native text selection behavior. The solution is to maintain this native behavior and only apply normalization as a temporary processing step during position calculation.