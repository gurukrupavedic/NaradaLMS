# Font Requirements Specification

**Last Updated:** October 28, 2025

## Overview

This document defines the font display requirements for the Vedic Learning Management System across three distinct scenarios. Each scenario has specific font families, sizes, and weights tailored to their use case.

---

## Scenario 1: Fixed Standard Display

**Where Applied:**
- Chapter Text tab → Text mode
- Segmentation tab
- Mapping tab  
- Preview tab (Learn Mode ON - with clickable segments)

**Font Requirements:**

| Script | Font Family | Font Size | Font Weight | Notes |
|--------|-------------|-----------|-------------|-------|
| Telugu (te) | JIMS | 30px | 400 (regular) | Self-hosted OTF font |
| Devanagari/Hindi (hi) | AdishilaSanVedic | 30px | 600 (semi-bold) | Self-hosted TTF font with bold/italic variants |
| IAST/English (en) | AdishilaSan | 30px | 400 (regular) | Self-hosted TTF font with bold/italic variants |

**Additional Typography:**
- Line height: 1.8
- Letter spacing: 0.02em  
- Word spacing: 0.05em (for IAST readability)

**Purpose:** Clean, standardized reading/learning experience with no customization.

---

## Scenario 2: Rich HTML Editing Mode

**Where Applied:**
- Chapter Text tab → HTML mode (TipTap editor)

**Font Requirements:**

| Feature | Specification |
|---------|--------------|
| **Font Size Dropdown** | MUST be functional - users can select 12px, 14px, 16px, 18px, 20px, 24px, 28px, 30px, 32px, 36px, 48px |
| **Default Starting Size** | 30px (when creating new content or no size specified) |
| **Font Families** | Auto-applied based on selected language:<br>• Telugu: JIMS<br>• Devanagari/Hindi: AdishilaSanVedic<br>• IAST/English: AdishilaSan |
| **All Formatting Tools** | Bold, Italic, Underline, Colors, Alignment, Headings, Lists, Links, Images - all must work |

**Purpose:** Creative editing environment with full formatting control for content creators.

---

## Scenario 3: Rich HTML Preview

**Where Applied:**
- Preview tab (Learn Mode OFF - article/recitation view)

**Font Requirements:**

| Feature | Specification |
|---------|--------------|
| **Display Mode** | Show formatted HTML exactly as created in HTML editing mode |
| **Font Preservation** | Preserve ALL custom formatting:<br>• Custom font sizes set by user<br>• Font colors<br>• Text styles (bold, italic, underline)<br>• Alignments<br>• Any inline styles |
| **Fonts** | Display whatever fonts were applied in HTML editor (can vary per text selection) |

**Purpose:** Beautiful formatted content display for reading/recitation with all rich formatting intact.

---

## Technical Implementation Notes

### Font Files Location
- **Path:** `client/public/fonts/`
- **JIMS:** JIMS-Regular.otf (OpenType format)
- **AdishilaSan:** AdishilaSan-Regular.ttf, AdishilaSan-Bold.ttf, AdishilaSan-Italic.ttf, AdishilaSan-BoldItalic.ttf
- **AdishilaSanVedic:** AdishilaSanVedic-Regular.ttf, AdishilaSanVedic-Bold.ttf, AdishilaSanVedic-Italic.ttf, AdishilaSanVedic-BoldItalic.ttf

### Font Fallbacks
- Telugu: 'JIMS', 'Noto Sans Telugu', sans-serif
- Devanagari: 'AdishilaSanVedic', 'Noto Sans Devanagari', sans-serif  
- IAST/English: 'AdishilaSan', 'Noto Sans', sans-serif

### CSS Classes
```css
.font-telugu { font-family: 'JIMS', 'Noto Sans Telugu', sans-serif; }
.font-devanagari { font-family: 'AdishilaSanVedic', 'Noto Sans Devanagari', sans-serif; }
.font-iast { font-family: 'AdishilaSan', 'Noto Sans', sans-serif; }
```

### CSS Custom Properties
```css
:root {
  --font-size-standard: 30px;
  --font-weight-devanagari: 600;
}
```

**Usage in Components:**
```typescript
// For Scenario 1 (Fixed Standard Display)
style={{
  fontSize: 'var(--font-size-standard)',
  fontWeight: currentScript === 'hi' ? 'var(--font-weight-devanagari)' : 400
}}
```

---

## Design Rationale

### Why 30px for All Scripts?
- **Readability:** Vedic texts with diacritical marks require larger sizes for clarity
- **Consistency:** Uniform size across scripts provides visual coherence
- **Accessibility:** Larger text reduces eye strain during extended study sessions

### Why Semi-Bold for Devanagari?
- **Visual Weight:** AdishilaSanVedic appears lighter than other fonts at regular weight
- **Better Spacing:** Semi-bold provides better presence while maintaining the font's excellent spacing for diacritics
- **Matching Aesthetic:** Creates visual parity with JIMS and AdishilaSan at regular weight

### Why Different Fonts?
- **Script Optimization:** Each font is optimized for its script's unique characteristics
- **Diacritical Support:** JIMS and AdishilaSanVedic properly render complex Vedic accent marks
- **Professional Typography:** Specialized fonts provide superior readability compared to generic system fonts

---

## Implementation History

### October 28, 2025 - Font Standardization Update

**Changes Made:**
1. **Added CSS Custom Properties** (`index.css`):
   - `--font-size-standard: 30px` for consistent sizing
   - `--font-weight-devanagari: 600` for semi-bold Devanagari

2. **Removed Blocking CSS Rule** (`index.css`):
   - Deleted `.ProseMirror * { font-size: 28px !important; }` 
   - This rule was preventing font size customization in HTML editor

3. **Updated SegmentedTextDisplay Component**:
   - Changed font size: 28px → `var(--font-size-standard)` (30px)
   - Fixed Devanagari font: 'Adishila San' → 'AdishilaSanVedic'
   - Fixed IAST font: 'JIMS' → 'AdishilaSan'
   - Added semi-bold weight for Devanagari: `fontWeight: currentScript === 'hi' ? 'var(--font-weight-devanagari)' : 400`

4. **Updated RichTextEditor Component**:
   - Changed default font size: 28px → 30px
   - Added 30px option to font size dropdown
   - Simplified `getFontSize()` to return 30px for all scripts

5. **Fixed Preview Tab (ChapterEditor.tsx)**:
   - Removed forced `fontSize: '28px'` to preserve HTML formatting
   - Fixed CSS classes: 'font-jims', 'font-adishila' → 'font-telugu', 'font-devanagari', 'font-iast'

6. **Updated Fonts.tsx Configuration**:
   - Fixed Devanagari font: 'Adishila_San' → 'AdishilaSanVedic'
   - Fixed IAST font: 'JIMS' → 'AdishilaSan'
   - Updated comments to reflect correct font usage

**Impact:**
- ✅ Font size dropdown now works in HTML editor
- ✅ Consistent 30px display across all Fixed Standard Display scenarios
- ✅ Devanagari appears with proper semi-bold weight
- ✅ Preview mode preserves user's custom formatting
- ✅ Correct fonts applied for each script everywhere

---

## Affected Components

### Primary Components
1. **client/src/components/text-segmentation/SegmentedTextDisplay.tsx**
   - Used in Segmentation tab, Mapping tab, Preview tab (Learn Mode ON)
   - Applies: Scenario 1 requirements

2. **client/src/components/ui/rich-text-editor.tsx**
   - Used in Chapter Text tab (HTML mode and Text mode)
   - Applies: Scenario 2 requirements (HTML mode), Scenario 1 requirements (Text mode)

3. **client/src/pages/ChapterEditor.tsx** (Preview section)
   - Preview tab with Learn Mode toggle
   - Applies: Scenario 1 (Learn Mode ON), Scenario 3 (Learn Mode OFF)

### Supporting Files
4. **client/src/index.css**
   - CSS custom properties and utility classes
   - Font-face declarations for self-hosted fonts

5. **client/src/components/ui/Fonts.tsx**
   - Font configuration constants
   - Google Fonts fallback loader

---

## Testing Checklist

### Scenario 1: Fixed Standard Display
- [ ] Text mode displays 30px for all scripts
- [ ] Devanagari appears semi-bold (weight 600)
- [ ] Segmentation tab shows correct fonts and sizes
- [ ] Mapping tab shows correct fonts and sizes
- [ ] Preview Learn Mode ON shows correct fonts and sizes

### Scenario 2: Rich HTML Editing
- [ ] Font size dropdown is functional
- [ ] Default size is 30px when starting new content
- [ ] Can change to 12px, 14px, 16px, etc.
- [ ] Mixed font sizes work in same document
- [ ] Correct font auto-applies based on language selection

### Scenario 3: Rich HTML Preview
- [ ] Learn Mode OFF displays formatted HTML
- [ ] Custom font sizes are preserved
- [ ] Bold, italic, colors all preserved
- [ ] No forced font size override

---

## Maintenance

### When to Update This Document
- Font family changes
- Font size standard changes
- New display scenarios added
- Typography requirements modified

### Related Documentation
- See `client/public/fonts/README.md` for font installation instructions
- See `replit.md` for overall project architecture

---

## Quick Reference

**Fixed Display (Text mode, Segmentation, Mapping, Preview Learn ON):**
```typescript
{
  te: { font: 'JIMS', size: '30px', weight: 400 },
  hi: { font: 'AdishilaSanVedic', size: '30px', weight: 600 },
  en: { font: 'AdishilaSan', size: '30px', weight: 400 }
}
```

**HTML Editor (Customizable):**
```typescript
{
  defaultSize: '30px',
  customizable: true,
  fontSizeOptions: ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '30px', '32px', '36px', '48px']
}
```

**HTML Preview (Preserve Formatting):**
```typescript
{
  mode: 'preserve-all-html-styles',
  noOverrides: true
}
```
