# Script & Content Format Issues - TODO List

## Overview

This document tracks critical inconsistencies in script labeling, content formatting, and typography across the Vedic LMS application. These issues affect user experience, data integrity, and maintainability.

**Created:** July 30, 2025  
**Priority:** High - User Experience & Data Integrity  
**Estimated Total Effort:** 8-12 hours  

## Issue Categories

- **🏷️ Script Labeling** - Inconsistent terminology across components
- **🎨 Typography** - Font class fragmentation and inconsistencies  
- **📝 Content Processing** - HTML handling and format detection issues
- **📍 Data Integrity** - Segment positioning and database encoding problems
- **🔧 Technical Debt** - Component interfaces and validation gaps

---

## TODO Items

### 🏷️ ISSUE 1: Script Labeling Inconsistencies

**Priority:** Medium  
**Effort:** 2 hours  
**Risk:** Low  

**Problem:** Same script languages called different names across components (Telugu: "TE" vs "Telugu" vs "తెలుగు", Hindi: "DEV" vs "Hindi" vs "Devanagari", English: "IAST" vs "English" vs "English/IAST").

**Affected Files:**
- `client/src/components/common/ScriptSelector.tsx` - Uses "TE", "DEV", "IAST"
- `shared/constants.ts` - Uses "Telugu", "Hindi", "English"  
- `client/src/components/LanguageSwitcher.tsx` - Uses native scripts + mixed format
- `client/src/pages/ChapterEditor.tsx` - Uses "Telugu", "Devanagari", "IAST" in placeholders
- `client/src/pages/ChapterView.tsx` - Uses "Telugu", "Hindi", "English"
- `shared/schema.ts` - Comments use "Telugu", "Devanagari/Hindi", "English/IAST"

**Solution Required:**
- [ ] Create centralized script configuration with canonical names
- [ ] Define single source of truth for display labels
- [ ] Update all components to use centralized config
- [ ] Establish naming convention (e.g., Telugu, Devanagari, IAST)

---

### 🎨 ISSUE 2: Font Class Fragmentation

**Priority:** High  
**Effort:** 3 hours  
**Risk:** Medium  

**Problem:** Different font classes applied to same script content in different components, causing visual inconsistency.

**Specific Mismatches:**
- Telugu: `font-['Noto Sans Telugu']` vs `font-telugu` vs `font-['Tiro_Telugu',serif]`
- Hindi: `font-['Noto Sans Devanagari']` vs `font-devanagari` vs `font-['Tiro_Devanagari_Sanskrit',serif]`
- English: `font-mono` vs `font-['Tiro_Devanagari_Sanskrit',serif]`

**Affected Files:**
- `client/src/components/ui/rich-text-editor.tsx` - Lines 197-204 (Noto Sans fonts)
- `client/src/pages/ChapterEditor.tsx` - Segmentation display (font-telugu, font-devanagari)
- `client/src/components/ui/Fonts.tsx` - Font definitions (Tiro fonts)

**Solution Required:**
- [ ] Standardize font family choices per script
- [ ] Create unified font class system
- [ ] Update rich text editor font references
- [ ] Update display component font classes
- [ ] Ensure font loading matches font usage

---

### 📝 ISSUE 3: HTML Content Processing Inconsistencies

**Priority:** High  
**Effort:** 2 hours  
**Risk:** Medium  

**Problem:** HTML content processed through multiple different pathways with inconsistent logic and font application.

**Processing Paths:**
- Rich Text Editor: Direct HTML passthrough with Noto Sans fonts
- Segmentation Display: Conditional rendering with Tiro fonts and `dangerouslySetInnerHTML`

**Affected Files:**
- `client/src/components/ui/rich-text-editor.tsx` - Direct HTML processing
- `client/src/pages/ChapterEditor.tsx` - Conditional HTML/text rendering logic

**Solution Required:**
- [ ] Create unified content rendering pipeline
- [ ] Standardize HTML processing approach
- [ ] Ensure consistent font application across all views
- [ ] Remove conditional rendering paths where possible

---

### 📍 ISSUE 4: Segment Positioning Calculation Errors

**Priority:** Critical  
**Effort:** 4 hours  
**Risk:** High  

**Problem:** Text segment positions calculated on plain text but applied to HTML content, causing misalignment when HTML formatting changes.

**Technical Flow Issue:**
1. HTML content: `<p>श्रद्धा <strong>सूक्तम्</strong></p>`
2. Plain text extraction: `श्रद्धा सूक्तम्` (tags removed)
3. Position calculation based on plain text
4. Positions applied back to HTML (incorrect due to tag offsets)

**Affected Files:**
- `client/src/pages/ChapterEditor.tsx` - Text selection and segment creation logic
- `client/src/lib/html-utils.ts` - `extractPlainText()` function
- `shared/utils/text-segmentation.ts` - Segment positioning utilities

**Solution Required:**
- [ ] Implement HTML-aware position calculation
- [ ] Create position mapping between HTML and plain text
- [ ] Update segment creation to handle HTML offsets
- [ ] Add position validation for HTML content
- [ ] Test segment stability with formatted content

---

### 📊 ISSUE 5: Database Content Encoding Problems

**Priority:** Medium  
**Effort:** 1 hour  
**Risk:** Medium  

**Problem:** Database shows inconsistent JSON encoding with triple quotes suggesting potential double-encoding.

**Evidence:**
```sql
te_content: """<p></p>"""      -- Triple quotes suggest double-encoding
hi_content: """<p>test</p>"""  -- Same pattern  
en_content: """<p>test</p>"""  -- Consistent but potentially over-encoded
```

**Affected Components:**
- Database storage layer
- Content serialization/deserialization
- API response formatting

**Solution Required:**
- [ ] Investigate JSON encoding pipeline
- [ ] Verify content storage format
- [ ] Fix double-encoding if present
- [ ] Add content encoding validation
- [ ] Test content retrieval integrity

---

### 🔍 ISSUE 6: Content Format Detection Logic

**Priority:** Medium  
**Effort:** 1 hour  
**Risk:** Low  

**Problem:** Content processed differently based on HTML detection, but detection logic may be unreliable.

**Current Detection:**
```typescript
const htmlRegex = /<[a-z][\s\S]*>/i;
return htmlRegex.test(content);
```

**Issues:**
- Simple regex may produce false positives/negatives
- Plain text with `<` characters misidentified as HTML
- No HTML structure validation

**Affected Files:**
- `client/src/lib/html-utils.ts` - `isHtmlContent()` function

**Solution Required:**
- [ ] Improve HTML detection algorithm
- [ ] Add HTML structure validation
- [ ] Handle edge cases (plain text with angle brackets)
- [ ] Add unit tests for detection logic

---

### 📐 ISSUE 7: Script-Specific Typography Rules Missing

**Priority:** Low  
**Effort:** 2 hours  
**Risk:** Low  

**Problem:** No systematic approach to script-specific typography, line breaking, or text rendering rules.

**Missing Elements:**
- Telugu: Line-breaking rules for complex characters
- Devanagari: Conjunct character handling specifications
- IAST: Diacritical mark preservation rules
- All scripts: Consistent spacing, sizing, alignment rules

**Solution Required:**
- [ ] Research script-specific typography requirements
- [ ] Define rendering rules per script
- [ ] Implement typography standards
- [ ] Add script-specific CSS optimizations
- [ ] Test with complex character combinations

---

### 🔧 ISSUE 8: Component Interface Mismatches

**Priority:** Medium  
**Effort:** 1 hour  
**Risk:** Low  

**Problem:** Components expect different prop formats for script handling.

**Interface Issues:**
```typescript
// ScriptSelector expects: currentScript, onScriptChange
// But called with: value, onValueChange
```

**Affected Files:**
- `client/src/components/common/ScriptSelector.tsx` - Component definition
- `client/src/pages/ChapterEditor.tsx` - Component usage

**Solution Required:**
- [ ] Standardize component prop interfaces
- [ ] Update component usage to match interfaces
- [ ] Remove adapter/wrapper logic where possible
- [ ] Add TypeScript validation for prop consistency

---

### ✅ ISSUE 9: Content Validation Absence

**Priority:** Medium  
**Effort:** 2 hours  
**Risk:** Medium  

**Problem:** No validation for script-appropriate content or HTML structure.

**Missing Validations:**
- Telugu: Unicode range validation for Telugu characters
- Devanagari: Devanagari Unicode block validation
- IAST: IAST diacritical mark validation
- HTML: Structure and allowed tag validation

**Solution Required:**
- [ ] Create script-specific content validators
- [ ] Add Unicode range checks per script
- [ ] Implement HTML sanitization/validation
- [ ] Add validation to content input pipeline
- [ ] Create content quality checks

---

### 🔤 ISSUE 10: Font Loading Coordination

**Priority:** Medium  
**Effort:** 1 hour  
**Risk:** Low  

**Problem:** Font loading handled in multiple places with different font families referenced.

**Coordination Issues:**
- `Fonts.tsx`: Loads Google Fonts for Tiro families
- Rich Text Editor: References Noto Sans families (not loaded)
- CSS: May have additional font definitions
- TipTap: May apply own font styles

**Solution Required:**
- [ ] Audit all font loading locations
- [ ] Standardize font loading approach
- [ ] Ensure loaded fonts match usage
- [ ] Remove unused font references
- [ ] Create font loading coordination system

---

## Implementation Priority

### Phase 1 (Critical - Week 1)
- Issue 4: Segment Positioning Calculation Errors (CRITICAL - Data corruption risk)

### Phase 2 (High Priority - Week 2)  
- Issue 2: Font Class Fragmentation (HIGH - Visual inconsistency affects usability)
- Issue 3: HTML Content Processing Inconsistencies (HIGH - Affects core content display)
- Issue 5: Database Content Encoding Problems (HIGH - Potential data integrity issues)

### Phase 3 (Medium Priority - Week 3)
- Issue 1: Script Labeling Inconsistencies (MEDIUM - Cosmetic consistency issue)
- Issue 8: Component Interface Mismatches (MEDIUM - Technical debt)
- Issue 6: Content Format Detection Logic (MEDIUM - Edge case handling)
- Issue 9: Content Validation Absence (MEDIUM - Input validation)
- Issue 10: Font Loading Coordination (MEDIUM - Resource optimization)

### Phase 4 (Enhancement - Week 4)
- Issue 7: Script-Specific Typography Rules (LOW - Enhancement feature)

## Success Criteria

- [ ] All script labels consistent across application
- [ ] Single font family applied per script in all views
- [ ] HTML content renders identically in editor and display
- [ ] Text segments remain stable with HTML formatting
- [ ] Content validation prevents invalid script content
- [ ] Zero visual inconsistencies between components
- [ ] Clean, maintainable typography system

## Notes

- Each issue should be addressed in isolation to prevent regression
- Comprehensive testing required after each fix
- User acceptance testing needed for typography changes
- Database migration may be required for encoding fixes

---

**Last Updated:** July 30, 2025  
**Status:** Ready for Implementation  
**Owner:** Development Team