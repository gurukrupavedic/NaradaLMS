# Vedic Learning Management System - Product Requirements Document

**Version:** 1.0  
**Last Updated:** December 16, 2025  
**Status:** Production

> For technical architecture, see [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 1. Executive Summary

The Vedic Learning Management System enables content creators to organize Vedic educational materials (mantras, shlokas, prayers) with synchronized audio-text playback across three scripts.

### 1.1 Core Capabilities

- **Content Management**: Create and manage learning tracks with chapters containing Vedic texts
- **Multi-Script Support**: Three scripts - Telugu, Devanagari (Hindi/Sanskrit), IAST (English transliteration)
- **Text Segmentation**: Break chapter content into segments for audio synchronization
- **Audio Mapping**: Map audio recordings to text segments using progressive workflow
- **Interactive Learning**: Students click text segments to hear synchronized audio playback

### 1.2 Target Users

| Role | Capabilities |
|------|--------------|
| **Content Administrator** | Create tracks, chapters, upload audio, segment text, map audio |
| **Learner** | Study chapters with synchronized audio playback, toggle learning modes |

### 1.3 Core Value Proposition

- Multi-script Vedic content with proper typography (custom fonts optimized for diacritical marks)
- Audio-text synchronization for learning pronunciation
- Progressive audio mapping workflow (click-when-heard)
- Dual learning modes: Interactive segments vs. Rich HTML articles

---

## 2. Content Hierarchy

### 2.1 Data Model

```
Track (collection)
  └── Chapter (lesson)
        ├── HTML Content (3 scripts: te, hi, en)
        ├── Audio Files (multiple per chapter)
        ├── Text Segments (script-specific ranges)
        └── Audio Mappings (segment ↔ audio timestamp)
```

### 2.2 Track Requirements

| Field | Required | Description |
|-------|----------|-------------|
| Name | yes | Display name |
| Description | no | Track summary |
| Image | no | Cover image URL |

### 2.3 Chapter Requirements

| Field | Required | Description |
|-------|----------|-------------|
| Title | yes | Chapter title |
| Telugu Content | no | Telugu script HTML |
| Hindi Content | no | Devanagari script HTML |
| English Content | no | IAST script HTML |
| Order | yes | Sort order within track |

### 2.4 Audio File Requirements

| Field | Description |
|-------|-------------|
| Filename | Display name |
| Duration | Length in seconds (auto-extracted) |

**Supported Formats:** MP3, WAV, OGG, M4A

---

## 3. Typography System

### 3.1 Supported Scripts

| Script Code | Script Name | Primary Font | Fallback Font |
|-------------|-------------|--------------|---------------|
| `te` | Telugu | JIMS | Noto Sans Telugu |
| `hi` | Devanagari/Hindi | AdishilaSanVedic | Noto Sans Devanagari |
| `en` | IAST/English | AdishilaSan | Noto Sans |

### 3.2 Font Display Scenarios

#### Scenario A: Standard Display (Fixed Formatting)

**Applies to:** Text mode, Segmentation tab, Mapping tab, Preview (Learn Mode ON)

| Script | Font Size | Font Weight | Line Height |
|--------|-----------|-------------|-------------|
| Telugu | 30px | 400 (regular) | 1.8 |
| Devanagari | 30px | 600 (semi-bold) | 1.8 |
| IAST | 30px | 400 (regular) | 1.8 |

**Rationale:** Standardized display ensures consistent reading experience. Devanagari uses semi-bold weight because AdishilaSanVedic appears lighter than other fonts at regular weight.

#### Scenario B: Rich HTML Editing

**Applies to:** Chapter Text tab (HTML mode)

| Feature | Specification |
|---------|---------------|
| Default font size | 30px |
| Font size options | 12, 14, 16, 18, 20, 24, 28, 30, 32, 36, 48px |
| Font family | Auto-applied based on selected script |
| Custom formatting | Bold, italic, underline, colors, alignment, headings, lists |

**Rationale:** Content creators need full formatting control for rich article presentation.

#### Scenario C: Rich HTML Preview

**Applies to:** Preview tab (Learn Mode OFF)

| Feature | Specification |
|---------|---------------|
| Display mode | Preserve all HTML formatting from editor |
| Font overrides | None - display exactly as authored |
| Custom styles | All colors, sizes, alignments preserved |

**Rationale:** Recitation/article mode should display formatted content as the creator intended.

---

## 4. Rich Text Editor

### 4.1 Editor Modes

| Mode | Description | Toolbar |
|------|-------------|---------|
| HTML Mode | Full WYSIWYG editing | Complete toolbar |
| Text Mode | Plain text view for segmentation | No toolbar |

Mode preference persists via localStorage.

### 4.2 Toolbar Controls

#### Inline Formatting (applies to selected text)

| Control | Shortcut | Behavior |
|---------|----------|----------|
| Bold | Ctrl+B | Toggle bold |
| Italic | Ctrl+I | Toggle italic |
| Underline | Ctrl+U | Toggle underline |
| Font Family | dropdown | JIMS, AdishilaSanVedic, AdishilaSan, Inter |
| Font Size | dropdown | 12-48px (11 options) |
| Text Color | buttons | Black, Red, Blue, Green |
| Link | button | Convert selection to hyperlink |

#### Block Formatting (applies to entire paragraph)

| Control | Behavior |
|---------|----------|
| Heading Level | Paragraph, H1-H6 |
| Numbered List | Toggle ordered list |
| Bullet List | Toggle unordered list |
| Alignment | Left, Center, Right, Justify |

#### Content Insertion (at cursor position)

| Control | Behavior |
|---------|----------|
| Image | Insert image via URL prompt |
| Horizontal Rule | Insert divider line |

### 4.3 Keyboard Behavior (Non-Standard)

**Optimized for mantra/verse content:**

| Key | Action | Rationale |
|-----|--------|-----------|
| Enter | Line break (`<br>`) | Quick access for verse line breaks |
| Shift+Enter | New paragraph | Separate verse sections |

This reverses standard word processor behavior because mantras require frequent line breaks without paragraph spacing.

### 4.4 Bi-Directional Sync Requirement

The toolbar must maintain perfect two-way synchronization:
- **User → Document:** Toolbar actions apply formatting correctly
- **Document → Toolbar:** Cursor movement updates toolbar state in real-time

Example: Moving cursor to bold text highlights the Bold button.

### 4.5 User Help System

An info icon positioned adjacent to the HTML/Text mode toggle provides on-demand keyboard shortcut reference:

| Element | Specification |
|---------|---------------|
| Icon | Information (ℹ️) or question mark |
| Trigger | Click to open |
| Dismiss | Click outside or ESC key |
| State | Non-modal popover |

**Help Content:**
```
Keyboard Shortcuts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Enter             → New line (for mantras)
Shift+Enter       → New paragraph

Ctrl+B            → Bold
Ctrl+I            → Italic
Ctrl+U            → Underline
```

### 4.6 TipTap Extensions

1. StarterKit (base functionality)
2. TextStyle (inline style support)
3. Color (text color)
4. TextAlign (paragraph alignment, types: heading, paragraph)
5. Underline
6. Heading (H1-H6)
7. HardBreak (line breaks)
8. HorizontalRule
9. OrderedList
10. BulletList
11. ListItem
12. Link (openOnClick: false)
13. Image
14. FontFamily
15. FontSize (custom extension)

**FontSize Custom Extension:**
- Applies `fontSize` attribute to `textStyle` mark
- Storage: Inline style (`style="font-size: XXpx"`)
- Commands: `setFontSize(size)`, `unsetFontSize()`

### 4.7 Implementation Requirements

**Focus Preservation:**
All toolbar buttons must use `onMouseDown={(e) => e.preventDefault()}` to prevent editor blur when controls are clicked.

**Toolbar State Synchronization:**
```javascript
editor.on('selectionUpdate', handleUpdate);
editor.on('transaction', handleUpdate);
```

**Editor Configuration:**
- History depth: 100 actions
- History delay: 500ms for grouping edits
- Spell check: Disabled (multilingual content)

---

## 5. Text Segmentation

### 5.1 Purpose

Break chapter text into segments that can be mapped to audio timestamps for synchronized playback.

### 5.2 Segment Requirements

| Field | Description |
|-------|-------------|
| Script | te, hi, or en |
| Start Position | Character index where segment begins |
| End Position | Character index where segment ends |
| Name | User-defined label (optional) |
| Order | Display order |

### 5.3 Segmentation Workflow

1. Select script (te/hi/en)
2. View chapter text with existing segment highlights
3. Select text range to create new segment
4. Assign segment name (optional)
5. Segments appear in right panel with status indicators

### 5.4 Segment Status Colors

| Status | Color | Meaning |
|--------|-------|---------|
| Ready | Gray | Unmapped, available for mapping |
| Mapped | Green | Has audio mapping |
| Selected | Indigo | Currently selected |

---

## 6. Audio-Text Mapping

### 6.1 Purpose

Link text segments to audio timestamps for synchronized playback during learning.

### 6.2 Mapping Requirements

| Field | Description |
|-------|-------------|
| Text Segment | Reference to text segment |
| Audio File | Reference to audio file |
| Start Time | Timestamp in seconds where segment begins |
| End Time | Timestamp in seconds where segment ends |

### 6.3 Progressive Mapping Workflow

1. Select audio file
2. Play audio
3. Click segment button when you hear its text begin
4. System records start timestamp
5. Click again when segment ends (or next segment begins)
6. System records end timestamp and creates mapping
7. Repeat for all segments

### 6.4 Mapping Status Colors

| Status | Color | Meaning |
|--------|-------|---------|
| Ready | Gray | Awaiting mapping |
| Recording | Orange | Start timestamp captured, waiting for end |
| Mapped | Green | Fully mapped with timestamps |
| Selected | Indigo | Currently active |

---

## 7. Learning Experience

### 7.1 Study Chapter Page

Students access chapters to study with synchronized audio.

### 7.2 Learn Mode Toggle

| Mode | Experience |
|------|------------|
| **Learn Mode ON** | Interactive segmented view with clickable audio-mapped segments |
| **Learn Mode OFF** | Rich HTML article view with all custom formatting preserved |

Toggle state persists via localStorage.

### 7.3 Learn Mode ON Features

- Segments displayed as amber-highlighted clickable blocks
- Click segment to play its audio (startTime to endTime)
- Auto-scroll to playing segment
- 30px standardized font display
- Script-appropriate fonts applied

### 7.4 Learn Mode OFF Features

- Full HTML content displayed as authored
- All formatting preserved (fonts, sizes, colors, alignments)
- Traditional reading/recitation experience
- No interactive audio features

---

## 8. User Interface Requirements

### 8.1 Chapter Editor Layout

Five-tab interface:

| Tab | Purpose |
|-----|---------|
| Chapter Text | HTML/Text content editing |
| Audio | Upload and manage audio files |
| Text Segmentation | Create text segments |
| Audio Mapping | Map segments to audio |
| Preview | Test learning experience |

### 8.2 Resizable Panels

Segmentation and Mapping tabs use resizable two-panel layout:
- Left: Text display with segment highlights
- Right: Segment list with status indicators

### 8.3 Design Aesthetics

| Element | Specification |
|---------|---------------|
| Highlight color (idle) | Amber-50 |
| Highlight color (hover) | Amber-100 |
| Selection color | Indigo-200 background, Indigo-400 border |
| Accent color | Indigo throughout |
| Theme | Modern, colorful, elegant (not traditional brown/gold) |

---

## 9. User Flows

### 9.1 Content Creation Flow (Admin)

```
1. Create Track
2. Create Chapter within Track
3. Edit Chapter Content (3 scripts via rich text editor)
4. Upload Audio Files
5. Create Text Segments (select text to define segment boundaries)
6. Map Audio to Text (progressive mapper - click when heard)
```

### 9.2 Learning Flow (Student)

```
1. Browse Tracks
2. Select Chapter
3. Study Chapter
   - Toggle Learn Mode ON: Click segments to hear audio
   - Toggle Learn Mode OFF: Read formatted article
```

---

## 10. Performance Requirements

| Metric | Target |
|--------|--------|
| Chapter load | < 2 seconds |
| Segment highlight response | < 50ms |
| Audio seek accuracy | ± 100ms |

---

## 11. Testing Checklists

### 11.1 Rich Text Editor

#### Inline Formatting
- [ ] Select text, apply bold - only selection becomes bold
- [ ] Select text, change font size - only selection changes
- [ ] Place cursor, type - new text inherits cursor position formatting
- [ ] Move cursor through differently formatted text - toolbar updates in real-time

#### Block Formatting
- [ ] Change heading level - entire paragraph converts
- [ ] Apply alignment - entire paragraph aligns
- [ ] Select multiple paragraphs, apply heading - all convert to same heading level

#### Keyboard Shortcuts
- [ ] Enter creates line break (not paragraph)
- [ ] Shift+Enter creates new paragraph
- [ ] Ctrl+B toggles bold on selection

#### Bi-Directional Sync
- [ ] Select bold text - bold button highlights
- [ ] Move cursor to 24px text - size dropdown shows "24px"
- [ ] Move cursor to centered paragraph - center align button highlights

### 11.2 Text Segmentation

- [ ] Select text creates segment
- [ ] Segment highlights appear correctly
- [ ] Segment list shows all segments with status
- [ ] Deleting segment removes highlight

### 11.3 Audio Mapping

- [ ] Progressive mapper records start time on first click
- [ ] Second click records end time and creates mapping
- [ ] Mapped segments show green status
- [ ] Deleting mapping returns segment to gray status

### 11.4 Learning Experience

- [ ] Learn Mode ON shows clickable segments
- [ ] Clicking segment plays audio from start to end time
- [ ] Learn Mode OFF shows full HTML with formatting
- [ ] Mode toggle persists across page reloads
