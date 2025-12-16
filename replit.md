# Vedic Learning Management System

## Overview

The Vedic Learning Management System is a full-stack application for managing and delivering Vedic educational content. It supports multilingual content (Telugu, Hindi/Devanagari, English/IAST) with advanced audio-text synchronization. Key functionalities include text segmentation, audio mapping, and visual status indicators. The system aims to provide a comprehensive platform for Vedic education, with a focus on modern, elegant design.

## Recent Changes

### December 16, 2025 - Documentation Cleanup
**Status:** Completed

Removed 27 outdated documentation files:
- **8 abandoned migration plans** (DaisyUI, Bootstrap 5, design system) - these migration paths were never pursued
- **18 superseded rollback documents** - replaced by Git history and Replit checkpoint system
- **1 superseded font specification** (FONT_IMPLEMENTATION_SUMMARY.md) - replaced by comprehensive `docs/features/font-requirements.md`

**Rationale:** Project has been stable since October 2025. Modern development practices use Git history and automated checkpoint system instead of manual rollback snapshots. This cleanup reflects current system maturity.

**Updated:** `docs/README.md` to guide users to Git/Replit checkpoints for rollbacks

### October 28, 2025 - Font Standardization & Bug Fixes
**Status:** Production Ready

Completed comprehensive font standardization across all scenarios with hybrid approach:

**CSS Infrastructure:**
- Added CSS custom properties: `--font-size-standard: 30px`, `--font-weight-devanagari: 600`
- Removed blocking `.ProseMirror * { font-size: 28px !important; }` rule that prevented customization
- Font size dropdown now fully functional in HTML editor

**Fixed Standard Display (Text mode, Segmentation, Mapping, Preview Learn Mode ON):**
- Standardized font size: 28px → 30px for all scripts
- Fixed Devanagari font: 'Adishila San' → 'AdishilaSanVedic' 
- Fixed IAST font: 'JIMS' → 'AdishilaSan'
- Added semi-bold weight (600) for Devanagari across all components
- Uses CSS variables for consistent sizing

**Fixed HTML Editor (TipTap):**
- Default font size: 28px → 30px
- Added 30px option to dropdown
- Removed font size override that prevented customization
- Font size dropdown now works correctly

**Fixed Preview Tab (Learn Mode OFF):**
- Removed forced fontSize override to preserve user's HTML formatting
- Fixed undefined CSS classes: 'font-jims', 'font-adishila' → 'font-telugu', 'font-devanagari', 'font-iast'
- Now correctly displays all custom formatting from HTML editor

**Documentation:**
- Created comprehensive `docs/features/font-requirements.md` specification
- Documents three distinct scenarios with clear requirements
- Includes implementation history and testing checklist

**Technical Approach:**
- Hybrid solution: CSS variables for repeated standards, inline styles for context-specific needs
- Pragmatic balance between centralization and flexibility
- Non-breaking changes, fully backward compatible

### October 25, 2025 - Content Management MVP Milestone
**Status:** MVP Ready for User Feedback

The content management system has reached MVP completion with the following achievements:

**Visual Design System:**
- Implemented sticky note aesthetic for text segment highlighting (amber-50 idle, amber-100 hover)
- Established indigo as consistent accent color throughout the app
- Unified selection highlighting across all panels (indigo-200 background, indigo-400 border)
- Dynamic number pill colors (gray for idle, indigo-500 for selected segments)
- Design system Tabs component (indigo variant) for HTML/Text mode toggle in rich-text editor

**User Experience Enhancements:**
- Auto-scroll functionality using scrollIntoView API for segment selection across panels
- Visual coherence between left text display and right segment panel
- Refined color hierarchy: Gray (ready), Orange (recording), Green (mapped), Indigo (selected)
- Improved readability for extended Vedic text study with softer highlight tones

**Technical Implementation:**
- SegmentedTextDisplay component with amber/indigo color scheme
- TextSegment design system component with dynamic pill variants
- MappingSegmentCard with CVA-based status colors
- Consistent auto-scroll behavior across segmentation and mapping workflows

**Next Phase:** Collecting feedback from early users before implementing student-facing features and additional refinements.

## User Preferences

Preferred communication style: Simple, everyday language.
Theme preferences: Prefers modern, colorful, elegant design over traditional Vedic brown/gold colors. Loves vibrant color palette with blue, green, purple, orange, pink, indigo (like dashboard tiles). Appreciates subtle, classy hover effects and sleek design. Specifically likes the colorful, contrasting UI components from experiments page. Wants contemporary aesthetic rather than traditional themes. Bootstrap 5 design system preferred for professional implementation with custom colorful palette. Values refined, whisper-light design elements that feel sophisticated and classy rather than bold or heavy.
Design System: Prefers "LMS Design System v1.0" branding with 26 components for professional nomenclature in designer-developer communications.

## System Architecture

The application features a full-stack architecture:
-   **Frontend**: React with TypeScript, Vite, shadcn/ui components, and Tailwind CSS.
-   **Backend**: Express.js server with RESTful API endpoints.
-   **Database**: PostgreSQL with Drizzle ORM.
-   **Authentication**: Replit Auth integration.

**Key Features:**
-   **Content Management System**: Supports creation and management of tracks, chapters (multilingual), audio files, text segmentation, and audio-text mapping.
-   **User Interface**: Provides CRUD operations for content, a visual Text Segmentation Studio, and an innovative "click-when-heard" audio mapping workflow. Multi-language switching is seamless.
-   **Preview Tab Learn Mode**: Toggle switch for two distinct student experiences:
    -   **Learn Mode ON**: Interactive segmented view with clickable audio-mapped segments (amber highlights, auto-play from start to end timestamps, standardized 30px fonts)
    -   **Learn Mode OFF**: Rich HTML article view preserving all custom formatting from editor (fonts, sizes, colors, styles)
    -   State persists via localStorage for consistent user experience across sessions
-   **Database Schema**: Includes tables for Users, Tracks, Chapters, Audio Files, Text Segments, and Audio Mappings to support hierarchical content organization and synchronization.
-   **Content Creation Workflow**: Involves administrative track creation, chapter development, audio integration, text segmentation, and audio mapping.
-   **UI/UX Decisions**: The design system emphasizes a modern, colorful, and elegant aesthetic, with vibrant colors, subtle hover effects, and a clean white background. It incorporates elements like multi-layered box-shadows for a luminous effect and a comprehensive 24-color palette. The "LMS Design System v1.0" with 26 components is the established standard.

**Typography & Fonts:**
-   **Telugu Script**: Uses JIMS font (with Noto Sans Telugu fallback via Google Fonts)
-   **Devanagari Script**: Uses AdishilaSanVedic font with semi-bold weight (600) for standard display (with Noto Sans Devanagari fallback)
-   **IAST/English Script**: Uses AdishilaSan font (with Noto Sans fallback)
-   **Interface Text**: Uses Inter font family
-   **Font Sizing**: Standard display at 30px across all scenarios; HTML editor allows custom sizes (12px-48px)
-   Custom fonts configured in `client/src/index.css` with @font-face declarations and CSS custom properties
-   Font files location: `client/public/fonts/` (see README.md in that directory for installation instructions)
-   Automatic font application based on selected script in editor, segmentation, mapping, and preview tabs
-   See `docs/features/font-requirements.md` for complete specifications

**Layout Architecture:**
-   **Consistent Tab Pattern**: All tabs follow a strict layout structure: TabsContent (viewport constraint) → wrapper (h-full flex flex-col) → header (flex-shrink-0) → content (flex-1 min-h-0 overflow-auto)
-   **Resizable Panels**: Text Segmentation and Audio Mapping tabs use PanelGroup pattern with resizable panels for optimal workspace management
-   **Height Constraints**: Custom div components used instead of shadcn Card components for height-constrained layouts to prevent layout issues
-   **Component Patterns**: 
    -   ProgressiveMapper uses render-props pattern (logic component that accepts children function, returns state object)
    -   Separation of concerns: Layout in parent components, business logic in specialized components
-   **Design Goal**: All tabs dynamically fill to browser window edge with internal scrollbars when content exceeds available space, preventing infinite vertical expansion

## External Dependencies

**Frontend:**
-   React 18, React Router (wouter), TanStack Query
-   Radix UI primitives, shadcn/ui component library
-   TipTap editor
-   React Hook Form with Zod validation

**Backend:**
-   Express.js
-   PostgreSQL with Neon (serverless connection pooling)
-   Drizzle ORM
-   Multer (for audio file handling)
-   music-metadata (for audio file analysis)

**Development Tools:**
-   Vite
-   TypeScript
-   Tailwind CSS
-   tsx (for server-side TypeScript execution)