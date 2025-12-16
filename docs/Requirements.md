# Vedic LMS - Functional Requirements

**Version:** 1.0  
**Last Updated:** December 16, 2025  
**Status:** Production

---

## 1. Overview

The Vedic Learning Management System enables content creators to organize Vedic educational materials (mantras, shlokas, prayers) with synchronized audio-text playback across three scripts: Telugu, Devanagari (Hindi), and IAST (English transliteration).

### 1.1 Target Users

| Role | Capabilities |
|------|--------------|
| **Content Administrator** | Create tracks, chapters, upload audio, segment text, map audio |
| **Learner** | Study chapters with synchronized audio playback, toggle between learning modes |

### 1.2 Core Value Proposition

- Multi-script Vedic content with proper typography
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

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | auto | yes | Primary key |
| name | string | yes | Display name |
| description | string | no | Track summary |
| imageUrl | string | no | Cover image URL |

### 2.3 Chapter Requirements

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | auto | yes | Primary key |
| trackId | ref | yes | Parent track |
| title | string | yes | Chapter title |
| teluguContent | html | no | Telugu script content |
| hindiContent | html | no | Devanagari script content |
| englishContent | html | no | IAST script content |
| order | integer | yes | Sort order within track |

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

**Rationale:** Standardized display ensures consistent reading experience for learning. Devanagari uses semi-bold weight because AdishilaSanVedic appears lighter than other fonts at regular weight.

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

### 3.3 Font Files

| Font | Format | Location |
|------|--------|----------|
| JIMS | OTF | `client/public/fonts/JIMS-Regular.otf` |
| AdishilaSan | TTF | `client/public/fonts/AdishilaSan-*.ttf` |
| AdishilaSanVedic | TTF | `client/public/fonts/AdishilaSanVedic-*.ttf` |

### 3.4 CSS Classes

```css
.font-telugu { font-family: 'JIMS', 'Noto Sans Telugu', sans-serif; }
.font-devanagari { font-family: 'AdishilaSanVedic', 'Noto Sans Devanagari', sans-serif; }
.font-iast { font-family: 'AdishilaSan', 'Noto Sans', sans-serif; }
```

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

The editor uses these TipTap extensions:

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
All toolbar buttons must use `onMouseDown={(e) => e.preventDefault()}` to prevent editor blur when controls are clicked. This preserves text selection for formatting commands.

**Toolbar State Synchronization:**
Component must subscribe to TipTap events for real-time toolbar updates:
```javascript
editor.on('selectionUpdate', handleUpdate);
editor.on('transaction', handleUpdate);
```

**Editor Configuration:**
- History depth: 100 actions
- History delay: 500ms for grouping edits
- Spell check: Disabled (multilingual content)

### 4.8 Testing Checklist

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

---

## 5. Text Segmentation

### 5.1 Purpose

Break chapter text into segments that can be mapped to audio timestamps for synchronized playback.

### 5.2 Segment Data Model

| Field | Type | Description |
|-------|------|-------------|
| id | auto | Primary key |
| chapterId | ref | Parent chapter |
| script | enum | te, hi, en |
| startPosition | integer | Character index start |
| endPosition | integer | Character index end |
| conceptualName | string | User-defined label |
| order | integer | Display order |

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

### 6.2 Mapping Data Model

**Media Segments Table:**
| Field | Type | Description |
|-------|------|-------------|
| id | auto | Primary key |
| audioFileId | ref | Parent audio file |
| startTime | float | Start timestamp (seconds) |
| endTime | float | End timestamp (seconds) |

**Segment Mappings Table:**
| Field | Type | Description |
|-------|------|-------------|
| id | auto | Primary key |
| mediaSegmentId | ref | Audio time range |
| textSegmentId | ref | Text segment |
| createdBy | string | User who created |

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

Students access chapters via `/study/:chapterId` route.

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

## 8. Audio File Management

### 8.1 Audio File Data Model

| Field | Type | Description |
|-------|------|-------------|
| id | auto | Primary key |
| chapterId | ref | Parent chapter |
| filename | string | Display name |
| filePath | string | Server storage path |
| duration | float | Length in seconds |
| mimeType | string | audio/mpeg, audio/wav, etc. |

### 8.2 Supported Formats

- MP3 (audio/mpeg)
- WAV (audio/wav)
- OGG (audio/ogg)
- M4A (audio/mp4)

### 8.3 Upload Workflow

1. Navigate to chapter editor Audio tab
2. Select audio file from device
3. System uploads and extracts metadata (duration)
4. Audio appears in chapter audio list
5. Audio available for mapping workflow

---

## 9. User Interface Patterns

### 9.1 Chapter Editor Layout

Five-tab interface:

| Tab | Purpose |
|-----|---------|
| Chapter Text | HTML/Text content editing |
| Audio | Upload and manage audio files |
| Text Segmentation | Create text segments |
| Audio Mapping | Map segments to audio |
| Preview | Test learning experience |

### 9.2 Resizable Panels

Segmentation and Mapping tabs use resizable two-panel layout:
- Left: Text display with segment highlights
- Right: Segment list with status indicators

### 9.3 Design Aesthetics

| Element | Specification |
|---------|---------------|
| Highlight color (idle) | Amber-50 |
| Highlight color (hover) | Amber-100 |
| Selection color | Indigo-200 background, Indigo-400 border |
| Accent color | Indigo throughout |
| Theme | Modern, colorful, elegant (not traditional brown/gold) |

---

## 10. API Patterns

### 10.1 RESTful Endpoints

| Pattern | Purpose |
|---------|---------|
| `GET /api/tracks` | List all tracks |
| `GET /api/chapters/:trackId` | List chapters in track |
| `GET /api/chapters/:id/details` | Single chapter with content |
| `GET /api/audio-files/:chapterId` | Audio files for chapter |
| `GET /api/segments/:chapterId/:script` | Text segments for chapter/script |
| `GET /api/mappings/chapter/:chapterId` | Audio mappings for chapter |
| `POST /api/mappings` | Create audio-text mapping |
| `DELETE /api/mappings/:audioFileId/:segmentId` | Remove mapping |

### 10.2 Data Flow

```
React Component
    │ useQuery / useMutation
    ▼
TanStack Query (cache layer)
    │ apiRequest()
    ▼
Express API Routes
    │ storage.method()
    ▼
Drizzle ORM → PostgreSQL
```

---

## 11. Technical Constraints

### 11.1 Browser Requirements

- Modern browsers with ES2020+ support
- Web Audio API for playback
- localStorage for preference persistence

### 11.2 Performance Targets

| Metric | Target |
|--------|--------|
| Chapter load | < 2 seconds |
| Segment highlight response | < 50ms |
| Audio seek accuracy | ± 100ms |

### 11.3 Database

- PostgreSQL with Drizzle ORM
- Neon serverless connection pooling

---

## Appendix A: Component Reference

| Component | Location | Purpose |
|-----------|----------|---------|
| RichTextEditor | `client/src/components/ui/rich-text-editor.tsx` | TipTap-based editor |
| SegmentedTextDisplay | `client/src/components/text-segmentation/SegmentedTextDisplay.tsx` | Highlighted text view |
| ProgressiveMapper | `client/src/components/audio-mapping/ProgressiveMapper.tsx` | Audio mapping workflow |
| ChapterEditor | `client/src/pages/ChapterEditor.tsx` | Main editing interface |
| StudyChapter | `client/src/pages/StudyChapter.tsx` | Student learning view |

---

## Appendix B: Related Documentation

| Document | Purpose |
|----------|---------|
| `docs/ARCHITECTURE.md` | System architecture and data flow |
| `docs/implementation/*.md` | TODO items and future features |
| `replit.md` | Project overview and recent changes |
