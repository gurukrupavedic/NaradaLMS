# Vedic Learning Management System - Product Requirements Document

**Version:** 1.0  
**Last Updated:** December 16, 2025  
**Status:** Production

---

## 1. Executive Summary

The Vedic Learning Management System is a full-stack web application for managing and delivering Vedic educational content (mantras, shlokas, prayers) with multilingual support and synchronized audio-text playback.

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

## 2. Technology Stack

### 2.1 Frontend

| Technology | Purpose |
|------------|---------|
| React 18 + TypeScript | UI framework |
| Vite | Build tool with hot reload |
| Wouter | Lightweight routing |
| TanStack Query v5 | Server state management |
| Tailwind CSS | Styling |
| Shadcn/ui | Component library |
| TipTap | Rich text editor |
| Lucide React | Icons |

### 2.2 Backend

| Technology | Purpose |
|------------|---------|
| Node.js + Express.js | API server |
| TypeScript (tsx) | Server-side language |
| Drizzle ORM | Database queries |
| PostgreSQL (Neon) | Database with serverless connection pooling |
| Multer | File uploads |
| music-metadata | Audio file analysis |

### 2.3 Shared

| Technology | Purpose |
|------------|---------|
| Zod | Schema validation |
| drizzle-zod | Type generation from schema |

---

## 3. Application Structure

```
vedic-lms/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── ui/            # Shadcn base components
│   │   │   ├── design-system/ # Custom design system (26 components)
│   │   │   ├── audio-mapping/ # Progressive mapper components
│   │   │   └── text-segmentation/ # Segmentation components
│   │   ├── pages/             # Route-level page components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Utilities (queryClient, etc.)
│   │   └── App.tsx            # Root component with routing
│   └── public/
│       └── fonts/             # Custom Vedic script fonts
├── server/                    # Backend Express application
│   ├── index.ts               # Server entry point
│   ├── routes-simple.ts       # API route definitions
│   ├── database-storage.ts    # Database access layer
│   └── vite.ts                # Vite dev server integration
├── shared/                    # Shared code between frontend/backend
│   └── schema.ts              # Database schema + types
└── uploads/                   # Uploaded audio files
```

### 3.1 Path Aliases

```typescript
@/          → client/src/
@shared     → shared/
@assets     → attached_assets/
```

---

## 4. Data Model

### 4.1 Entity Relationships

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   tracks    │──────<│  chapters   │──────<│ audio_files │
│             │  1:N  │             │  1:N  │             │
└─────────────┘       └─────────────┘       └─────────────┘
                             │
                             │ 1:N
                             ▼
                      ┌─────────────┐       ┌───────────────┐
                      │text_segments│──────<│segment_mappings│
                      │             │  1:N  │               │
                      └─────────────┘       └───────────────┘
                                                   │
                                                   │ N:1
                                                   ▼
                                            ┌───────────────┐
                                            │media_segments │
                                            │               │
                                            └───────────────┘
```

### 4.2 Table Definitions

#### Tracks

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | auto | yes | Primary key |
| name | string | yes | Display name |
| description | string | no | Track summary |
| imageUrl | string | no | Cover image URL |

#### Chapters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | auto | yes | Primary key |
| trackId | ref | yes | Parent track |
| title | string | yes | Chapter title |
| teluguContent | html | no | Telugu script content |
| hindiContent | html | no | Devanagari script content |
| englishContent | html | no | IAST script content |
| order | integer | yes | Sort order within track |

#### Audio Files

| Field | Type | Description |
|-------|------|-------------|
| id | auto | Primary key |
| chapterId | ref | Parent chapter |
| filename | string | Display name |
| filePath | string | Server storage path |
| duration | float | Length in seconds |
| mimeType | string | audio/mpeg, audio/wav, etc. |

**Supported Formats:** MP3, WAV, OGG, M4A

#### Text Segments

| Field | Type | Description |
|-------|------|-------------|
| id | auto | Primary key |
| chapterId | ref | Parent chapter |
| script | enum | te, hi, en |
| startPosition | integer | Character index start |
| endPosition | integer | Character index end |
| conceptualName | string | User-defined label |
| order | integer | Display order |

#### Media Segments

| Field | Type | Description |
|-------|------|-------------|
| id | auto | Primary key |
| audioFileId | ref | Parent audio file |
| startTime | float | Start timestamp (seconds) |
| endTime | float | End timestamp (seconds) |

#### Segment Mappings

| Field | Type | Description |
|-------|------|-------------|
| id | auto | Primary key |
| mediaSegmentId | ref | Audio time range |
| textSegmentId | ref | Text segment |
| createdBy | string | User who created |

---

## 5. Typography System

### 5.1 Supported Scripts

| Script Code | Script Name | Primary Font | Fallback Font |
|-------------|-------------|--------------|---------------|
| `te` | Telugu | JIMS | Noto Sans Telugu |
| `hi` | Devanagari/Hindi | AdishilaSanVedic | Noto Sans Devanagari |
| `en` | IAST/English | AdishilaSan | Noto Sans |

### 5.2 Font Display Scenarios

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

### 5.3 Font Files

| Font | Format | Location |
|------|--------|----------|
| JIMS | OTF | `client/public/fonts/JIMS-Regular.otf` |
| AdishilaSan | TTF | `client/public/fonts/AdishilaSan-*.ttf` |
| AdishilaSanVedic | TTF | `client/public/fonts/AdishilaSanVedic-*.ttf` |

### 5.4 CSS Classes

```css
.font-telugu { font-family: 'JIMS', 'Noto Sans Telugu', sans-serif; }
.font-devanagari { font-family: 'AdishilaSanVedic', 'Noto Sans Devanagari', sans-serif; }
.font-iast { font-family: 'AdishilaSan', 'Noto Sans', sans-serif; }
```

---

## 6. Rich Text Editor

### 6.1 Editor Modes

| Mode | Description | Toolbar |
|------|-------------|---------|
| HTML Mode | Full WYSIWYG editing | Complete toolbar |
| Text Mode | Plain text view for segmentation | No toolbar |

Mode preference persists via localStorage.

### 6.2 Toolbar Controls

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

### 6.3 Keyboard Behavior (Non-Standard)

**Optimized for mantra/verse content:**

| Key | Action | Rationale |
|-----|--------|-----------|
| Enter | Line break (`<br>`) | Quick access for verse line breaks |
| Shift+Enter | New paragraph | Separate verse sections |

This reverses standard word processor behavior because mantras require frequent line breaks without paragraph spacing.

### 6.4 Bi-Directional Sync Requirement

The toolbar must maintain perfect two-way synchronization:
- **User → Document:** Toolbar actions apply formatting correctly
- **Document → Toolbar:** Cursor movement updates toolbar state in real-time

Example: Moving cursor to bold text highlights the Bold button.

### 6.5 User Help System

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

### 6.6 TipTap Extensions

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

### 6.7 Implementation Requirements

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

## 7. Text Segmentation

### 7.1 Purpose

Break chapter text into segments that can be mapped to audio timestamps for synchronized playback.

### 7.2 Segmentation Workflow

1. Select script (te/hi/en)
2. View chapter text with existing segment highlights
3. Select text range to create new segment
4. Assign segment name (optional)
5. Segments appear in right panel with status indicators

### 7.3 Segment Status Colors

| Status | Color | Meaning |
|--------|-------|---------|
| Ready | Gray | Unmapped, available for mapping |
| Mapped | Green | Has audio mapping |
| Selected | Indigo | Currently selected |

---

## 8. Audio-Text Mapping System

### 8.1 Purpose

Link text segments to audio timestamps for synchronized playback during learning.

### 8.2 Progressive Mapping Workflow

1. Select audio file
2. Play audio
3. Click segment button when you hear its text begin
4. System records start timestamp
5. Click again when segment ends (or next segment begins)
6. System records end timestamp and creates mapping
7. Repeat for all segments

### 8.3 Mapping Status Colors

| Status | Color | Meaning |
|--------|-------|---------|
| Ready | Gray | Awaiting mapping |
| Recording | Orange | Start timestamp captured, waiting for end |
| Mapped | Green | Fully mapped with timestamps |
| Selected | Indigo | Currently active |

### 8.4 Unified API Pattern

| Endpoint | Purpose |
|----------|---------|
| `GET /api/mappings/chapter/:chapterId` | Fetch all mappings for a chapter |
| `GET /api/mappings/audio/:audioFileId` | Fetch mappings for an audio file |
| `POST /api/mappings` | Create mapping (atomically creates media segment + mapping) |
| `DELETE /api/mappings/:audioFileId/:segmentId` | Delete a mapping |

### 8.5 Data Flow

```
ProgressiveMapper UI (drag/click to map)
    ↓
progressiveMappingApi.createMapping()
    ↓
POST /api/mappings
    ↓
storage.createMappingWithMediaSegment() (atomic insert)
    ↓
PostgreSQL (media_segments + segment_mappings)
```

---

## 9. Learning Experience

### 9.1 Study Chapter Page

Students access chapters via `/study/:chapterId` route.

### 9.2 Learn Mode Toggle

| Mode | Experience |
|------|------------|
| **Learn Mode ON** | Interactive segmented view with clickable audio-mapped segments |
| **Learn Mode OFF** | Rich HTML article view with all custom formatting preserved |

Toggle state persists via localStorage.

### 9.3 Learn Mode ON Features

- Segments displayed as amber-highlighted clickable blocks
- Click segment to play its audio (startTime to endTime)
- Auto-scroll to playing segment
- 30px standardized font display
- Script-appropriate fonts applied

### 9.4 Learn Mode OFF Features

- Full HTML content displayed as authored
- All formatting preserved (fonts, sizes, colors, alignments)
- Traditional reading/recitation experience
- No interactive audio features

---

## 10. User Interface

### 10.1 Frontend Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | SimpleDashboard | Home dashboard with navigation |
| `/manage/tracks` | ManageTracks | Track list management |
| `/manage/tracks/:id` | ManageChapters | Chapter list for a track |
| `/manage/tracks/:trackId/chapters/:chapterId` | EditChapter | Multi-tab chapter editor |
| `/learn/tracks` | LearnTracks | Browse available tracks |
| `/learn/tracks/:id` | LearnChapters | Browse chapters in a track |
| `/study/:chapterId` | StudyChapter | Interactive learning view |

### 10.2 Chapter Editor Tabs

| Tab | Purpose |
|-----|---------|
| Chapter Text | HTML/Text content editing |
| Audio | Upload and manage audio files |
| Text Segmentation | Create text segments |
| Audio Mapping | Map segments to audio |
| Preview | Test learning experience |

### 10.3 Resizable Panels

Segmentation and Mapping tabs use resizable two-panel layout:
- Left: Text display with segment highlights
- Right: Segment list with status indicators

### 10.4 Design Aesthetics

| Element | Specification |
|---------|---------------|
| Highlight color (idle) | Amber-50 |
| Highlight color (hover) | Amber-100 |
| Selection color | Indigo-200 background, Indigo-400 border |
| Accent color | Indigo throughout |
| Theme | Modern, colorful, elegant (not traditional brown/gold) |

---

## 11. API Reference

### 11.1 RESTful Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tracks` | GET, POST | List/create tracks |
| `/api/tracks/:id` | GET, PUT, DELETE | Single track operations |
| `/api/chapters/:trackId` | GET, POST | List/create chapters in track |
| `/api/chapters/:id/details` | GET, PUT | Single chapter with content |
| `/api/audio-files/:chapterId` | GET | Audio files for chapter |
| `/api/audio-files/:chapterId/upload` | POST | Upload audio file |
| `/api/segments/:chapterId/:script` | GET, POST | Text segments for chapter/script |
| `/api/segments/:id` | PUT, DELETE | Single segment operations |
| `/api/mappings/chapter/:chapterId` | GET | Audio mappings for chapter |
| `/api/mappings` | POST | Create audio-text mapping |
| `/api/mappings/:audioFileId/:segmentId` | DELETE | Remove mapping |

### 11.2 Data Flow Architecture

```
Frontend Component
       │
       │ useQuery / useMutation
       ▼
 TanStack Query (queryClient)
       │
       │ fetch with apiRequest()
       ▼
 Express API Routes (routes-simple.ts)
       │
       │ storage.methodName()
       ▼
 Database Storage Layer (database-storage.ts)
       │
       │ Drizzle ORM
       ▼
   PostgreSQL Database
```

---

## 12. State Management

| State Type | Technology | Purpose |
|------------|------------|---------|
| Server State | TanStack Query | API data with caching |
| Local UI State | React useState | Component-level state |
| Form State | React Hook Form + Zod | Form validation |
| Auth State | Context | Replit Auth integration |
| Preferences | localStorage | Learn mode, editor mode persistence |

---

## 13. Technical Constraints

### 13.1 Browser Requirements

- Modern browsers with ES2020+ support
- Web Audio API for playback
- localStorage for preference persistence

### 13.2 Performance Targets

| Metric | Target |
|--------|--------|
| Chapter load | < 2 seconds |
| Segment highlight response | < 50ms |
| Audio seek accuracy | ± 100ms |

### 13.3 Development Commands

```bash
npm run dev          # Start development server (port 5000)
npm run db:push      # Sync database schema
```

---

## 14. Testing Checklists

### 14.1 Rich Text Editor

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

## 15. Component Reference

| Component | Location | Purpose |
|-----------|----------|---------|
| RichTextEditor | `client/src/components/ui/rich-text-editor.tsx` | TipTap-based editor |
| SegmentedTextDisplay | `client/src/components/text-segmentation/SegmentedTextDisplay.tsx` | Highlighted text view |
| ProgressiveMapper | `client/src/components/audio-mapping/ProgressiveMapper.tsx` | Audio mapping workflow |
| ChapterEditor | `client/src/pages/ChapterEditor.tsx` | Main editing interface |
| StudyChapter | `client/src/pages/StudyChapter.tsx` | Student learning view |

---

## Appendix: Related Documentation

| Document | Purpose |
|----------|---------|
| `docs/implementation/*.md` | TODO items and future features |
| `replit.md` | Project overview and recent changes |
