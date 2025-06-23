# Vedic Learning Management System

## Overview

The Vedic Learning Management System is a comprehensive full-stack application designed for managing and delivering Vedic educational content. The system supports multilingual content (Telugu, Hindi/Devanagari, English/IAST) with advanced audio-text synchronization features for educational content mapping.

## System Architecture

### Full-Stack Architecture
- **Frontend**: React with TypeScript, using Vite for development and builds
- **Backend**: Express.js server with RESTful API endpoints
- **Database**: PostgreSQL with Drizzle ORM for schema management
- **UI Framework**: shadcn/ui components with Tailwind CSS for styling
- **Authentication**: Replit Auth integration for user management

### Application Structure
```
├── client/          # React frontend application
├── server/          # Express.js backend
├── shared/          # Shared types, utilities, and schemas
├── docs/           # Comprehensive documentation
└── migrations/     # Database schema migrations
```

## Key Components

### Content Management System
- **Track Management**: Hierarchical learning tracks with sequential ordering
- **Chapter Management**: Rich text content in multiple languages (Telugu, Hindi, English)
- **Audio File Management**: Upload and manage audio recordings with metadata
- **Text Segmentation**: Break content into meaningful segments for mapping
- **Audio-Text Mapping**: Synchronize audio timestamps with text segments

### User Interface Architecture
- **Content Management Interface**: Full CRUD operations for educational content
- **Text Segmentation Studio**: Visual interface for creating text segments
- **Progressive Audio Mapping**: Innovative "click-when-heard" mapping workflow
- **Multi-language Support**: Seamless switching between Telugu, Hindi, and English content

### Database Schema
- **Users**: Multi-role support with invitation system
- **Tracks**: Top-level learning curriculum organization
- **Chapters**: Individual learning units with multilingual content
- **Audio Files**: Media files with metadata and duration tracking
- **Text Segments**: Granular text portions with language-specific references
- **Audio Mappings**: Timestamp associations between audio and text segments

## Data Flow

### Content Creation Workflow
1. **Track Creation**: Administrative users create learning tracks
2. **Chapter Development**: Content managers add chapters with rich text content
3. **Audio Integration**: Upload audio files and associate with chapters
4. **Text Segmentation**: Break chapter content into logical segments
5. **Audio Mapping**: Map audio timestamps to corresponding text segments

### Learning Interface (Planned)
1. **Content Discovery**: Students browse available tracks and chapters
2. **Interactive Learning**: Synchronized audio-text playback
3. **Progress Tracking**: Monitor learning completion and proficiency

## External Dependencies

### Frontend Dependencies
- **React Ecosystem**: React 18, React Router (wouter), TanStack Query
- **UI Components**: Radix UI primitives, shadcn/ui component library
- **Rich Text Editing**: TipTap editor with multiple extensions
- **Form Management**: React Hook Form with Zod validation

### Backend Dependencies
- **Server Framework**: Express.js with TypeScript support
- **Database**: PostgreSQL with Neon serverless connection pooling
- **ORM**: Drizzle with schema migrations and type safety
- **File Upload**: Multer for audio file handling
- **Audio Processing**: music-metadata for audio file analysis

### Development Tools
- **Build System**: Vite with hot module replacement
- **Type Safety**: TypeScript with strict configuration
- **Styling**: Tailwind CSS with custom Vedic theme colors
- **Development**: tsx for server-side TypeScript execution

## Deployment Strategy

### Development Environment
- **Runtime**: Node.js 20 with npm package management
- **Database**: PostgreSQL 16 with automatic provisioning
- **Development Server**: Concurrent frontend (port 5000) and backend serving

### Production Deployment
- **Build Process**: Vite frontend build + esbuild backend compilation
- **Deployment Target**: Autoscale deployment on Replit infrastructure
- **Static Assets**: Express static file serving for uploaded audio content
- **Database**: Neon PostgreSQL with connection pooling and error handling

### Environment Configuration
- **SESSION_SECRET**: Required for user session management
- **DATABASE_URL**: PostgreSQL connection string with WebSocket support
- **REPLIT_DOMAINS**: Required for authentication integration

## Changelog

Changelog:
- June 23, 2025. Initial setup
- June 23, 2025. ROLLBACK POINT: Before segment creation fix - Application working except segment creation fails with "Cannot convert undefined or null to object" error in createSegmentMutation
- June 23, 2025. FIXED: AnnotationLayer data contract mismatch - Updated handleCreateSegment to accept both new format (script/startPosition/endPosition) and legacy format (textReferences) for backward compatibility
- June 23, 2025. COMPLETED: Segment creation fix - Updated all UI display logic to use new script-specific format instead of textReferences. Segment creation now fully functional.
- June 23, 2025. COMPLETED: Segmentation tab improvements - Added script-specific segment counts, chapter-wide mapping counts, and link status icons for segment cards. Fixed Link2Off import error.
- June 23, 2025. ROLLBACK POINT: Infinite render loop issue - Application experiencing maximum update depth exceeded error in ChapterEditor.tsx. LinkStatusIcon implementation complete but causing stability issues.
- June 23, 2025. FIXED: Infinite render loop resolved - Fixed useEffect dependency causing continuous re-renders. Implemented shared LinkStatusIcon component and mapping utilities for consistent status visualization across all tabs.

## User Preferences

Preferred communication style: Simple, everyday language.