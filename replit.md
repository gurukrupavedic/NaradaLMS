# Vedic Learning Management System

## Overview

The Vedic Learning Management System is a full-stack application for managing and delivering Vedic educational content. It supports multilingual content (Telugu, Hindi/Devanagari, English/IAST) with advanced audio-text synchronization. Key functionalities include text segmentation, audio mapping, and visual status indicators. The system aims to provide a comprehensive platform for Vedic education, with a focus on modern, elegant design.

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