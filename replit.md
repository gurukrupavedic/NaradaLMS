# Vedic Learning Management System

## Overview

The Vedic Learning Management System is a full-stack application for managing and delivering Vedic educational content. It supports multilingual content (Telugu, Hindi/Devanagari, English/IAST) with advanced audio-text synchronization. Key functionalities include text segmentation, audio mapping, and visual status indicators. The system aims to provide a comprehensive platform for Vedic education, with a focus on modern, elegant design.

## Recent Changes

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
    -   **Learn Mode ON**: Interactive segmented view with clickable audio-mapped segments (yellow highlights, auto-play from start to end timestamps)
    -   **Learn Mode OFF**: Clean, distraction-free HTML article view for recitation (script-specific fonts, 28px text)
    -   State persists via localStorage for consistent user experience across sessions
-   **Database Schema**: Includes tables for Users, Tracks, Chapters, Audio Files, Text Segments, and Audio Mappings to support hierarchical content organization and synchronization.
-   **Content Creation Workflow**: Involves administrative track creation, chapter development, audio integration, text segmentation, and audio mapping.
-   **UI/UX Decisions**: The design system emphasizes a modern, colorful, and elegant aesthetic, with vibrant colors, subtle hover effects, and a clean white background. It incorporates elements like multi-layered box-shadows for a luminous effect and a comprehensive 24-color palette. The "LMS Design System v1.0" with 26 components is the established standard.

**Typography & Fonts:**
-   **Telugu & IAST Scripts**: Uses JIMS font as default (with Noto Sans Telugu fallback via Google Fonts)
-   **Devanagari Script**: Uses Adishila San font as default (with Noto Sans Devanagari fallback via Google Fonts)
-   **Interface Text**: Uses Inter font family
-   Custom fonts configured in `client/src/index.css` with @font-face declarations
-   Font files location: `client/public/fonts/` (see README.md in that directory for installation instructions)
-   Automatic font application based on selected script in editor, segmentation, mapping, and preview tabs

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