# VedicLMS MVP Scope & Backlog

## MVP Features (v1.0 - Production Release)

### STUDENT PERSONA
| Key | Title | Description | Priority |
|-----|-------|-------------|----------|
| STUDENT-1 | Learning Board Dashboard | Landing page after login showing: My Batch card (name, current track, instructors), Current Chapters quick access (proficiency 0-1 highlighted), Curriculum overview (8 tracks with chapter list + proficiency badges) | P0 |
| STUDENT-2 | Study Chapter Interface | View chapter content with script switching (Telugu/Hindi/English), select audio file (multiple masters), toggle Learn Mode for interactive text segments | P0 |
| STUDENT-3 | Interactive Text Segments | Click text segments in Learn Mode to play mapped audio (start/end timestamps), respects segment boundaries, auto-switches audio file if mapping references different file | P0 |
| STUDENT-4 | Proficiency Tracking | View 0-4 proficiency level for all chapters across all tracks, visible everywhere (not batch-specific) | P0 |
| STUDENT-5 | Responsive Study Interface | Mobile: larger segments (48px), bottom-sheet audio controls, 36px fonts. Tablet: hybrid layout. Desktop: current layout. All devices equally polished | P0 |
| STUDENT-6 | Audio Controls | Play/pause/stop, seek timeline, volume adjustment, playback rate (1x, 1.25x, 1.5x, 2x), duration/current time display | P0 |

### INSTRUCTOR PERSONA
| Key | Title | Description | Priority |
|-----|-------|-------------|----------|
| INSTR-1 | My Batches List | View all batches assigned as instructor (primary or secondary), indicator showing primary vs secondary role, click to open batch details | P0 |
| INSTR-2 | Batch Detail View | See all students in batch, proficiency levels for every chapter (0-4 scale), set batch current track (only primary instructor or admin) | P0 |
| INSTR-3 | Student Progress Table | View and update student proficiency per chapter. Mobile: expandable cards. Desktop: dense DataTable with inline dropdown edits | P0 |
| INSTR-4 | Proficiency Editing | Only instructors can change student proficiency levels (0-4). No notes yet (future feature). Mobile: bottom sheet, Desktop: inline edit | P1 |
| INSTR-5 | Batch Context Access | From Learning Board, link to "Batches & Progress" tab, switch between batches easily | P1 |
| INSTR-6 | Responsive Instructor UI | Mobile: card-based list views, expandable student progress. Desktop: full tables. Tablet: hybrid. All equally polished | P0 |

### CONTENT MANAGER PERSONA
| Key | Title | Description | Priority |
|-----|-------|-------------|----------|
| CM-1 | Track Management | Create, view, reorder, delete (only if empty) tracks with name and description | P0 |
| CM-2 | Chapter Management | Create, view, reorder chapters under track. Delete chapter (only if draft). Publish/unpublish to control draft vs published status | P0 |
| CM-3 | Five-Step Publishing Flow | Content Tab: HTML/text editor, script selector (te/hi/en), auto-save. Media Tab: upload audio files with reciter info. Segmentation Tab: create/delete/reorder text segments per script. Mapping Tab: Progressive Mapper (click-when-heard), visual state colors (amber/orange/green). Preview Tab: student view with toggle Learn Mode | P0 |
| CM-4 | Progressive Mapping UX | Interactive mapping: click text segment → plays audio, segment highlights orange during recording, turns green when mapped. Timestamp display. State visibility throughout | P0 |
| CM-5 | Audio File Management | Upload multiple audio files (masters), set display names, optional reciter attribution, playback preview, delete | P1 |
| CM-6 | Text Segmentation | Drag-select or click-drag to create segments, reorder with drag handles, delete segments, recreate as needed. Per-script segmentation | P1 |
| CM-7 | Chapter Preview | Preview chapter exactly as students see it, including interactive segments and Learn Mode toggle, before publishing | P0 |
| CM-8 | Publish Protection | Published chapters cannot be deleted or unpublished (status cannot change back to draft) | P1 |
| CM-9 | Responsive Content Studio | Mobile: step wizard for 5-step flow. Desktop: tabbed interface. Tablet: split views where applicable | P0 |

### ADMIN PERSONA
| Key | Title | Description | Priority |
|-----|-------|-------------|----------|
| ADMIN-1 | User Approvals | View pending user registrations, approve or reject with role assignment (student/instructor/content_manager) | P0 |
| ADMIN-2 | User Management | View all users, edit roles, enable/disable user accounts | P1 |
| ADMIN-3 | Batch CRUD | Create, edit, close, deprecate batches. Edit: name, description, current track | P0 |
| ADMIN-4 | Batch Instructor Assignment | Assign/unassign primary and secondary instructors per batch | P1 |
| ADMIN-5 | Batch Student Assignment | Assign/unassign students to batches | P1 |
| ADMIN-6 | Deprecate Batches | Disable batches from interface, prevent changes, prevent new assignments. Only re-enable to allow editing | P1 |
| ADMIN-7 | Audit Logs (Basic) | View recent system activity, minimal filtering (date range, user), read-only display | P2 |
| ADMIN-8 | System Settings (Minimal) | Key-value store for system-wide settings. No specific settings required for MVP (placeholder for future) | P2 |
| ADMIN-9 | Responsive Admin UI | Mobile: card/form-based lists. Desktop: tables with filters. Forms full-width on mobile, inline on desktop | P0 |

### CROSS-CUTTING / INFRASTRUCTURE
| Key | Title | Description | Priority |
|-----|-------|-------------|----------|
| CROSS-1 | Role-Based Navigation | Navigation tabs appear/hide based on role: all see "Learning", instructors see "Batches & Progress", CMs see "Content Studio", admins see "Admin Center" | P0 |
| CROSS-2 | Responsive Navigation | Mobile: hamburger drawer, Tablet: collapsible sidebar, Desktop: persistent sidebar. Tab/button switching seamless | P0 |
| CROSS-3 | Responsive Breakpoints | 44px minimum touch targets, responsive fonts (mobile 36px Telugu/Devanagari → desktop 30px), tailwind sm/md/lg breakpoints | P0 |
| CROSS-4 | Authentication & Authorization | Login required, role-based route protection (requireAuth, requireRole middleware) | P0 |
| CROSS-5 | Multilingual Fonts | Telugu (JIMS), Devanagari (AdishilaSanVedic), IAST (AdishilaSan) fonts applied via CSS classes, served from /fonts/ | P0 |
| CROSS-6 | Design System Polish | Consistent use of shadcn/Radix components, custom edu-layer (Badge, Switch, SegmentedTextDisplay), Tailwind tokens for spacing/colors | P1 |
| CROSS-7 | Performance Optimization | TanStack Query for caching, prefetch adjacent chapters, lazy-load routes, bundle optimization | P1 |
| CROSS-8 | Error Handling | Graceful error states, toast notifications, error boundaries, 404/500 pages | P1 |
| CROSS-9 | Accessibility (A11y) | WCAG AA compliant: keyboard navigation, screen reader support, focus indicators, color contrast (44px touch targets) | P1 |

---

## BACKLOG Features (Post-MVP)

### STUDENT (Backlog)
| Key | Title | Description | Phase |
|-----|-------|-------------|-------|
| STUDENT-B1 | PDF Download (Chapter) | Download single chapter text content as PDF (script-selected), clean typography, multilingual fonts embedded | Phase 6 |
| STUDENT-B2 | PDF Download (Track) | Download entire track text content as PDF (all chapters), organized with chapters, script-selected | Phase 6 |
| STUDENT-B3 | PDF Download (Curriculum) | Download entire curriculum as PDF (all 8 tracks, all chapters), with cover page and index, script-selected | Phase 6 |
| STUDENT-B4 | Bookmarked Chapters | Explicit bookmark/favorite feature (beyond auto-highlight of 0-1 chapters), quick access list | Phase 7 |
| STUDENT-B5 | Learning Statistics | Dashboard stats: total chapters completed, average time per chapter, streak tracker | Phase 7 |
| STUDENT-B6 | Evaluation Annotations | View instructor annotations on segments (from evaluation mode), see where mistakes commonly occur | Phase 8 |
| STUDENT-B7 | Evaluation Notes | View instructor notes attached to student+chapter (assessment feedback) | Phase 8 |
| STUDENT-B8 | Search & Filter | Search chapters by keyword, filter by track, filter by proficiency level | Phase 7 |

### INSTRUCTOR (Backlog)
| Key | Title | Description | Phase |
|-----|-------|-------------|-------|
| INSTR-B1 | Batch Notes | Add/edit/delete notes at batch level after sessions (tied to timestamp+author), visible to all batch members | Phase 8 |
| INSTR-B2 | Evaluation Annotations | During assessment, click/drag-select text segments to mark student mistakes, saved as annotations for student to review | Phase 8 |
| INSTR-B3 | Evaluation Notes | Add notes when updating student proficiency (feedback, guidance, areas of improvement) | Phase 8 |
| INSTR-B4 | Session Recording | Record/reference teaching sessions, tied to batch context | Phase 9 |
| INSTR-B5 | Batch Progress Reports | Generate PDF reports of batch progress (all students, all chapters, with evaluation history) | Phase 9 |
| INSTR-B6 | Class Schedule | Calendar/scheduling for teaching sessions, student attendance tracking | Phase 9 |

### CONTENT MANAGER (Backlog)
| Key | Title | Description | Phase |
|-----|-------|-------------|-------|
| CM-B1 | Bulk Upload | Upload multiple chapters at once, batch operations | Phase 6 |
| CM-B2 | Content Versioning | Track changes to chapters, revert to previous versions | Phase 7 |
| CM-B3 | Segment Metadata | Add metadata to segments (pronunciation notes, key words) | Phase 7 |
| CM-B4 | Audio Waveform Editor | Visual waveform for mapping, drag to set start/end times, reduce reliance on click-when-heard | Phase 7 |
| CM-B5 | Bulk Assignment | Assign instructors/students to multiple batches at once | Phase 6 |

### ADMIN (Backlog)
| Key | Title | Description | Phase |
|-----|-------|-------------|-------|
| ADMIN-B1 | Advanced Audit Logs | Complex filtering, search, export, role-based log visibility | Phase 8 |
| ADMIN-B2 | System Health Dashboard | Server uptime, database performance, API response times, user metrics | Phase 8 |
| ADMIN-B3 | Configurable System Settings | Email notifications, upload size limits, password policies, rate limiting | Phase 7 |
| ADMIN-B4 | Bulk User Import | CSV import for users, batch role assignment | Phase 6 |
| ADMIN-B5 | Analytics & Reporting | User engagement metrics, learning metrics, instructor performance reports | Phase 9 |
| ADMIN-B6 | Data Backup & Export | System backup triggers, data export for compliance | Phase 9 |

### AI FEATURES (Backlog - Major Feature Area)
| Key | Title | Description | Phase |
|-----|-------|-------------|-------|
| AI-1 | AI Evaluation | Student initiates AI evaluation from chapter interface, system records recitation, LLM analyzes audio against chapter text, visual feedback on pronunciation errors | Phase 9 |
| AI-2 | Mistake Detection | Identify exact text segments where student made mistakes, visual highlighting, confidence scores | Phase 9 |
| AI-3 | Personalized Feedback | AI generates guidance on specific pronunciation errors, links to reference audio | Phase 10 |
| AI-4 | Multi-Attempt Tracking | Track student's AI evaluation attempts per chapter, show improvement over time | Phase 10 |

### PWA & OFFLINE (Backlog)
| Key | Title | Description | Phase |
|-----|-------|-------------|-------|
| PWA-1 | Progressive Web App | Add manifest.json, service worker, install prompt for mobile home screen | Phase 10 |
| PWA-B1 | Offline Asset Caching | Cache app shell, fonts, UI assets for offline access (not content) | Phase 10 |
| PWA-B2 | Offline Content Sync | Download chapters for offline study, sync progress when online | Phase 11 |

### UI/UX ENHANCEMENTS (Backlog)
| Key | Title | Description | Phase |
|-----|-------|-------------|-------|
| UX-B1 | Dark Mode | Optional dark theme toggle, system preference detection | Phase 7 |
| UX-B2 | Customizable UI Density | Airy vs compact layout options for different user preferences | Phase 8 |
| UX-B3 | Keyboard Shortcuts | Power-user shortcuts for navigation, playback control, segment creation | Phase 7 |
| UX-B4 | Gesture Support | Swipe for chapter navigation (mobile), pinch to zoom on text | Phase 8 |

---

## MVP Acceptance Criteria

✅ **Must Have (Go/No-Go):**
1. All P0 items complete and tested
2. Responsive design: mobile (375-414px), tablet (768-1024px), desktop (1440px) equally polished
3. All users can login/logout
4. Students can browse curriculum and study chapters with interactive segments
5. Instructors can view batches and update student proficiency
6. Content managers can create/publish chapters in 5-step flow
7. Admins can approve users and manage batches
8. No P0/P1 bugs in critical flows (auth, chapter access, proficiency update)
9. 44px touch targets on all interactive elements
10. WCAG AA a11y pass on critical flows

✅ **Nice to Have (Refinements):**
- P1 items (batch notes placeholder, advanced audit logs, etc.)
- Polish: animations, micro-interactions, error state refinements
- Performance: < 3s first contentful paint, smooth 60fps interactions

---

## Timeline Estimate

**MVP Implementation: ~10-12 weeks (incremental, phase-based)**

| Phase | Duration | Focus | Demo Output |
|-------|----------|-------|------------|
| Phase 1 | 2.5 wks | Student Learning Board + Study | Students can browse & study chapters |
| Phase 2 | 2 wks | Instructor Batches & Progress | Instructors can view/update progress |
| Phase 3 | 2.5 wks | Content Studio Responsive | CMs can publish on any device |
| Phase 4 | 1.5 wks | Admin Center Core | Admins can onboard & manage batches |
| Phase 5 | 1.5 wks | Design System + A11y + Bug Fixes | Production-ready, polished |
| **Total** | **~10 wks** | | **MVP v1.0** |

---

## Notes

- **Already Built (Preserve):** StudyChapter.tsx, EditChapter.tsx (5-step), ProgressiveMapper, SegmentedTextDisplay, AudioControls — these are MVP-ready.
- **New Components:** Learning Board dashboard, My Batches list, Student Progress table, Admin Center screens.
- **Design System:** Use shadcn/Radix + custom edu-layer, no new custom components unless essential.
- **Responsive:** Build both mobile & desktop layouts in parallel, test 50/50 priority.
- **Accessibility:** A11y built-in from day 1, not bolted on post-MVP.
