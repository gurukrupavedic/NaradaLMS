# Stage 1: Structural Split into 3 Containers

**Version**: 1.0  
**Date**: 2026-01-31  
**Status**: Ready for Planning

---

## Overview

**Goal**: Migrate from modular monolith to 3-container monorepo with ZERO logic/UI changes  
**Duration**: 4-5 days hands-on (with 20% buffer for portal extraction complexity)  
**Branch**: `stage-1-replatform`

**Core Principle**: This is PURE refactoring. We're reorganizing folders, not changing functionality. Every feature that works before Stage 1 must work identically after Stage 1.

**Why This Stage**: With JWT auth and clean API routes from Stage 0, we can now safely split the codebase into independent containers without fighting authentication or configuration issues.

---

## Prerequisites

**Before Starting Stage 1**:

- [ ] **Stage 0 MUST be complete** and merged to `main`
- [ ] All Stage 0 validation criteria passed
- [ ] JWT authentication working flawlessly
- [ ] API endpoints documented and consolidated
- [ ] Environment variables standardized
- [ ] Create new baseline tag: `git tag baseline-post-stage-0`
- [ ] Backup database: `pg_dump naradalms > backup_stage1_$(date +%Y%m%d).sql`

---

## Branching Strategy

### Branch Structure

```
main (protected, contains baseline-post-stage-0 tag)
  └── stage-1-replatform
        ├── phase-1-0-monorepo-setup
        ├── phase-1-1-student-portal
        ├── phase-1-2-ops-portal  
        ├── phase-1-3-api-extraction
        └── phase-1-4-documentation
```

### Workflow

```bash
# Create Stage 1 branch from main
git checkout main
git checkout -b stage-1-replatform

# For each phase:
git checkout stage-1-replatform
git checkout -b phase-1-X-name
# ... work on phase ...
git checkout stage-1-replatform
git merge phase-1-X-name
git tag phase-1-X-complete
# Get user approval before next phase
```

### Merge Strategy

- ❌ DO NOT merge `stage-1-replatform` to `main` until ALL 4 phases complete
- ✅ DO merge each phase branch into `stage-1-replatform` after validation
- ✅ DO create PR from `stage-1-replatform` to `main` after Stage 1 complete
- ✅ Team reviews PR before final merge

---

## Phase Overview

| Phase | Goal | Effort | Risk |
|-------|------|--------|------|
| **0** | Monorepo Setup (no runtime changes) | 1 hour | Low |
| **1** | Extract Student Portal (dual boot) | 4-5 hours | High |
| **2** | Extract Ops Portal (dual boot) | 3-4 hours | High |
| **3** | Extract API Server (remove legacy) | 1.5 hours | Medium |
| **4** | Documentation & Knowledge Bridge | 2-3 hours | Low |

---

## Target Architecture

After Stage 1, you'll have:

```
Turborepo Monorepo
├── apps/
│   ├── student-portal/     # Next.js 15 (port 3000)
│   ├── ops-portal/         # Next.js 15 (port 3001)
│   └── api/                # Express.js (port 5000)
├── packages/
│   ├── database/           # @narada/database (Drizzle schema)
│   ├── types/              # @narada/types (TypeScript types)
│   └── ui/                 # @narada/ui (Shared components + Tiptap)
└── apps/temp-legacy/       # Old monolith (removed in Phase 3)
```

**Runtime**:

- `npm run dev` starts all 3 apps concurrently
- Student Portal: <http://localhost:3000>
- Ops Portal: <http://localhost:3001>
- API: <http://localhost:5000>

---

## Phase 0: Monorepo Setup (No Runtime Change)

**Branch**: `phase-1-0-monorepo-setup`

### Objectives

1. Install Turborepo
2. Create folder structure
3. Initialize shared packages (database, types, ui)
4. Configure package workspaces
5. **Validate**: App still runs identically from current structure

### Implementation Steps

**Step 1: Install Turborepo**

```bash
npm install turbo --save-dev
```

**Step 2: Create Turbo Configuration**

Create `turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    },
    "check": {
      "outputs": []
    }
  }
}
```

**Step 3: Create Folder Structure**

```bash
mkdir -p apps/student-portal
mkdir -p apps/ops-portal
mkdir -p apps/api
mkdir -p packages/database/src
mkdir -p packages/types/src
mkdir -p packages/ui/src
```

**Step 4: Update Root package.json**

Add workspaces:

```json
{
  "name": "narada-lms",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "check": "turbo run check"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

**Step 5: Initialize packages/database**

Create `packages/database/package.json`:

```json
{
  "name": "@narada/database",
  "version": "0.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema.ts",
    "./client": "./src/client.ts"
  },
  "dependencies": {
    "drizzle-orm": "^0.39.1",
    "@neondatabase/serverless": "^0.10.4",
    "drizzle-zod": "^0.7.0",
    "zod": "^3.24.2",
    "pg": "^8.16.3"
  }
}
```

**Copy files**:

```bash
cp shared/schema.ts packages/database/src/schema.ts
cp server/db.ts packages/database/src/client.ts
cp drizzle.config.ts packages/database/drizzle.config.ts
```

Create `packages/database/src/index.ts`:

```typescript
export * from './schema';
export * from './client';
```

**Step 6: Initialize packages/types**

Create `packages/types/package.json`:

```json
{
  "name": "@narada/types",
  "version": "0.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "zod": "^3.24.2"
  }
}
```

**Copy files**:

```bash
cp shared/types.ts packages/types/src/index.ts
cp shared/constants.ts packages/types/src/constants.ts
```

**Step 7: Initialize packages/ui (Stub for now)**

Create `packages/ui/package.json`:

```json
{
  "name": "@narada/ui",
  "version": "0.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./components/*": "./src/components/*.tsx",
    "./hooks/*": "./src/hooks/*.ts",
    "./pages/*": "./src/pages/*.tsx",
    "./styles": "./src/styles/globals.css",
    "./tiptap-editor": "./src/tiptap-editor/index.ts"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@radix-ui/react-accordion": "^1.2.2",
    "@radix-ui/react-alert-dialog": "^1.1.4",
    "@radix-ui/react-avatar": "^1.1.2",
    "@radix-ui/react-checkbox": "^1.1.4",
    "@radix-ui/react-dialog": "^1.1.4",
    "@radix-ui/react-dropdown-menu": "^2.1.4",
    "@radix-ui/react-label": "^2.1.1",
    "@radix-ui/react-popover": "^1.1.4",
    "@radix-ui/react-select": "^2.1.4",
    "@radix-ui/react-separator": "^1.1.1",
    "@radix-ui/react-slider": "^1.2.1",
    "@radix-ui/react-slot": "^1.1.1",
    "@radix-ui/react-switch": "^1.1.2",
    "@radix-ui/react-tabs": "^1.1.2",
    "@radix-ui/react-toast": "^1.2.4",
    "@radix-ui/react-tooltip": "^1.1.6"
  },
  "peerDependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
```

Create stub `packages/ui/src/index.ts`:

```typescript
// Will be populated in Phase 1
export {};
```

**Step 8: Install Dependencies**

```bash
npm install
```

**Step 9: Validate Monolith Still Works**

```bash
# Old dev command should still work
npm run dev
```

**Expected**: App starts on localhost:5000, login works, all features functional.

### Validation Criteria

- [ ] Turborepo installed
- [ ] `turbo.json` configured
- [ ] Folder structure created (`apps/*`, `packages/*`)
- [ ] `@narada/database` package created and exports schema
- [ ] `@narada/types` package created
- [ ] `@narada/ui` package created (stub)
- [ ] Workspaces configured in root `package.json`
- [ ] `npm install` succeeds
- [ ] `npm run dev` starts monolith on port 5000
- [ ] Can login and navigate app
- [ ] No runtime errors in console

### Rollback Plan

```bash
git reset --hard phase-1-0-pre-monorepo-setup
rm -rf apps/ packages/
npm install
```

### Estimated Effort

- 30-45 minutes

---

## Phase 1: Extract Student Portal (Dual Boot)

**Branch**: `phase-1-1-student-portal`

### Objectives

1. Create NEW student portal that runs ALONGSIDE the old monolith
2. Both work simultaneously (dual boot)
3. Student portal uses shared packages (`@narada/ui`, `@narada/database`)
4. **NO changes to old monolith** - it continues running

### Current State Analysis

**Student Routes** (from `AppShell.tsx`):

```
/app                         → LearningDashboardPage
/app/learning                → LearningDashboardPage  
/app/learning/chapter/:id    → LearnChapterPage
```

**Student Dependencies**:

- `AuthPage` (shared with admin)
- `AppLayout` + `AppSidebar` (shows student nav)
- `useAuth` hook
- UI components (Button, Card, Input, Tiptap editor, etc.)
- API client (`/api/auth/*`, `/api/learning/*`)

### Shared Components Rubric

This is the **complete inventory** of every component, hook, page, and util in the current monolith and where it goes in the refactored structure.

#### 📋 Component Classification

| Symbol | Meaning |
|--------|---------|
| 🔵 | Student Portal uses this |
| 🟢 | Ops Portal uses this |
| 🟡 | Both portals use this (move to `@narada/ui`) |
| 🔴 | Legacy/Deprecated (remove) |

---

#### UI Primitives (41 components)

Current Location: `client/src/components/ui/`  
Future Location: `packages/ui/src/components/`  
Status: **All 41 → Move to packages/ui**

| Component | Current Path | Future Path | Usage |
|-----------|--------------|-------------|-------|
| `accordion.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `alert.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `alert-dialog.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `avatar.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `badge.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `breadcrumb.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `button.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `calendar.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `card.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `checkbox.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `collapsible.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `command.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `context-menu.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `dialog.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `dropdown-menu.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `form.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `hover-card.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `input.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `label.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `menubar.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `navigation-menu.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `popover.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `progress.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `radio-group.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `scroll-area.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `select.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `separator.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `sheet.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `skeleton.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `slider.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `switch.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `table.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `tabs.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `textarea.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `toast.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `toaster.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `toggle.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `toggle-group.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `tooltip.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `sonner.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |
| `sonner-toaster.tsx` | `client/src/components/ui/` | `packages/ui/src/components/` | 🟡 Both |

---

#### Tiptap Editor (132 files) - CRITICAL DEPENDENCY

Current Location: `client/src/components/ui/tiptap-editor/`  
Future Location: `packages/ui/src/tiptap-editor/`  
Status: **Entire folder → Move to packages/ui** (No breaking changes, import paths will update)

| Component Type | Count | Current Path | Future Path | Usage |
|----------------|-------|--------------|-------------|-------|
| Core editor files | 12 | `client/src/components/ui/tiptap-editor/` | `packages/ui/src/tiptap-editor/` | 🟡 Both |
| Extensions | 25 | `client/src/components/ui/tiptap-editor/extensions/` | `packages/ui/src/tiptap-editor/extensions/` | 🟡 Both |
| Components | 95 | `client/src/components/ui/tiptap-editor/components/` | `packages/ui/src/tiptap-editor/components/` | 🟡 Both |

**Why Both?**

- **Student Portal**: Read-only Tiptap for viewing chapter content
- **Ops Portal**: Full Tiptap editor for content authoring

**Import Change**:

```typescript
// Before
import { TiptapEditor } from '@/components/ui/tiptap-editor'

// After
import { TiptapEditor } from '@narada/ui/tiptap-editor'
```

---

#### Shared Pages

| Page | Current Path | Future Path | Usage | Notes |
|------|--------------|-------------|-------|-------|
| `AuthPage.tsx` | `client/src/features/shared/pages/` | `packages/ui/src/pages/` | 🟡 Both | Login/Register for both portals |

---

#### Shared Layouts

| Layout | Current Path | Future Path | Usage | Notes |
|--------|--------------|-------------|-------|-------|
| `AppLayout.tsx` | `client/src/components/layout/` | `packages/ui/src/layouts/` | 🟡 Both | Main application shell |
| `AppSidebar.tsx` | `client/src/components/layout/` | `packages/ui/src/layouts/` | 🟡 Both | Navigation sidebar (role-aware) |

---

#### Feature-Specific Components (Audio/Text)

| Component | Current Path | Future Path | Usage | Notes |
|-----------|--------------|-------------|-------|-------|
| `SelectableTextPanel.tsx` | `client/src/features/learning/components/` | `packages/ui/src/components/` | 🟡 Both | Used for text-audio sync |
| `AudioPlayerControls.tsx` | `client/src/features/learning/components/` | `packages/ui/src/components/` | 🟡 Both | Audio playback UI |
| `SegmentHighlighter.tsx` | `client/src/features/learning/components/` | `packages/ui/src/components/` | 🟡 Both | Highlights active segment |

---

#### Hooks

| Hook | Current Path | Future Path | Usage | Notes |
|------|--------------|-------------|-------|-------|
| `useAuth.ts` | `client/src/features/shared/hooks/` | `packages/ui/src/hooks/` | 🟡 Both | JWT auth hook |
| `use-toast.ts` | `client/src/features/shared/hooks/` | `packages/ui/src/hooks/` | 🟡 Both | Toast notifications |
| `useMediaControls.ts` | `client/src/features/learning/hooks/` | `packages/ui/src/hooks/` | 🟡 Both | Audio controls |
| `useSegmentSync.ts` | `client/src/features/learning/hooks/` | `packages/ui/src/hooks/` | 🟡 Both | Text-audio sync |

---

#### Portal-Specific Pages

**Student Portal Pages** (`apps/student-portal/app/`)

| Page | Current Path | Future Path | Usage |
|------|--------------|-------------|-------|
| `LearningDashboardPage.tsx` | `client/src/features/learning/pages/` | `apps/student-portal/app/dashboard/page.tsx` | 🔵 Student Only |
| `LearnChapterPage.tsx` | `client/src/features/learning/pages/` | `apps/student-portal/app/learn/[chapterId]/page.tsx` | 🔵 Student Only |

**Ops Portal Pages** (`apps/ops-portal/app/`)

| Page | Current Path | Future Path | Usage |
|------|--------------|-------------|-------|
| `UserManagementPage.tsx` | `client/src/features/admin/pages/` | `apps/ops-portal/app/users/page.tsx` | 🟢 Ops Only |
| `BatchManagementPage.tsx` | `client/src/features/admin/pages/` | `apps/ops-portal/app/batches/page.tsx` | 🟢 Ops Only |
| `TrackManagementPage.tsx` | `client/src/features/curriculum/pages/` | `apps/ops-portal/app/curriculum/tracks/page.tsx` | 🟢 Ops Only |
| `ChapterEditorPage.tsx` | `client/src/features/curriculum/pages/` | `apps/ops-portal/app/curriculum/chapters/[id]/page.tsx` | 🟢 Ops Only |
| `SegmentationPage.tsx` | `client/src/features/content-manager/pages/` | `apps/ops-portal/app/content/segmentation/page.tsx` | 🟢 Ops Only |
| `AuditLogsPage.tsx` | `client/src/features/admin/pages/` | `apps/ops-portal/app/admin/audit/page.tsx` | 🟢 Ops Only |

---

#### Utilities & Helpers

| Util | Current Path | Future Path | Usage | Notes |
|------|--------------|-------------|-------|-------|
| `cn.ts` (classnames util) | `client/src/lib/utils.ts` | `packages/ui/src/lib/utils.ts` | 🟡 Both | Tailwind merge helper |
| `formatters.ts` | `client/src/lib/formatters.ts` | `packages/types/src/formatters.ts` | 🟡 Both | Date/time formatting |

---

#### Styles

| File | Current Path | Future Path | Usage | Notes |
|------|--------------|-------------|-------|-------|
| `index.css` | `client/src/` | `packages/ui/src/styles/globals.css` | 🟡 Both | Gayatri Design System tokens |

---

### Summary

**Total Components Analyzed**: ~200 files

**Distribution**:

- ✅ **~145 files → packages/ui** (shared by both portals)
  - 41 UI primitives
  - 132 Tiptap files
  - 2 shared pages
  - 2 shared layouts
  - 3 feature components
  - 4 hooks
  - 1 util file
  - 1 CSS file

- ✅ **~10 files → apps/student-portal** (student-only pages)
- ✅ **~45 files → apps/ops-portal** (ops-only pages/features)

---

### Portal-Specific Components

**Portal-Specific Components**:

**Student Only**:

- `LearningDashboardPage`
- `LearnChapterPage`

**Ops Only**:

- `UserManagementPage`
- `BatchManagementPage`
- `TrackManagementPage`
- `ChapterEditorPage`
- `SegmentationPage`
- `AuditLogsPage`
- All admin/instructor/content-manager features

**Import Strategy After Migration**:

```typescript
// Shared components (in both portals)
import { Button, Card, Input } from '@narada/ui';
import { TiptapEditor } from '@narada/ui/tiptap-editor';
import { AuthPage } from '@narada/ui/pages';
import { AppLayout } from '@narada/ui/layouts';
import { useAuth } from '@narada/ui/hooks';

// Portal-specific components (only in that portal's codebase)
// Student Portal
import DashboardPage from '@/app/dashboard/page';

// Ops Portal
import UsersPage from '@/app/users/page';
```

### File Mapping

#### Step 1: Populate packages/ui

**Move Shared UI Components**:

```bash
# UI primitives (41 components)
cp -r client/src/components/ui/* packages/ui/src/components/

# Tiptap Editor (CRITICAL - 132 files)
cp -r client/src/components/ui/tiptap-editor packages/ui/src/tiptap-editor

# Shared pages
cp client/src/features/shared/pages/AuthPage.tsx packages/ui/src/pages/

# Shared layouts
cp client/src/components/layout/app-layout.tsx packages/ui/src/layouts/AppLayout.tsx
cp client/src/components/layout/app-sidebar.tsx packages/ui/src/layouts/AppSidebar.tsx

# Shared hooks
cp client/src/features/shared/hooks/useAuth.ts packages/ui/src/hooks/useAuth.ts
cp client/src/features/shared/hooks/use-toast.ts packages/ui/src/hooks/use-toast.ts

# Styles
cp client/src/index.css packages/ui/src/styles/globals.css
```

Update `packages/ui/src/index.ts`:

```typescript
//  Components
export * from './components/button';
export * from './components/card';
export * from './components/input';
export * from './components/label';
export * from './components/select';
export * from './components/separator';
export * from './components/sheet';
export * from './components/switch';
export * from './components/tabs';
export * from './components/toast';
export * from './components/toaster';
export * from './components/tooltip';
export * from './components/accordion';
export * from './components/alert';
export * from './components/alert-dialog';
export * from './components/avatar';
export * from './components/badge';
export * from './components/breadcrumb';
export * from './components/calendar';
export * from './components/checkbox';
export * from './components/collapsible';
export * from './components/command';
export * from './components/context-menu';
export * from './components/dialog';
export * from './components/dropdown-menu';
export * from './components/form';
export * from './components/hover-card';
export * from './components/menubar';
export * from './components/navigation-menu';
export * from './components/popover';
export * from './components/progress';
export * from './components/radio-group';
export * from './components/scroll-area';
export * from './components/skeleton';
export * from './components/slider';
export * from './components/table';
export * from './components/textarea';
export * from './components/toggle';
export * from './components/toggle-group';

// Tiptap Editor
export * from './tiptap-editor';

// Pages
export { AuthPage } from './pages/AuthPage';

// Layouts
export { AppLayout } from './layouts/AppLayout';
export { AppSidebar } from './layouts/AppSidebar';

// Hooks
export { useAuth } from './hooks/useAuth';
export { useToast, toast } from './hooks/use-toast';
```

#### Step 2: Create apps/student-portal

**Tech Stack**: Next.js 15 (App Router)

**Initialize**:

```bash
cd apps
npx create-next-app@latest student-portal \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"
```

**Configuration**:

Create `apps/student-portal/next.config.ts`:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@narada/ui', '@narada/types'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.API_URL || 'http://localhost:5000/api/:path*'
      },
      {
        source: '/uploads/:path*',
        destination: process.env.API_URL || 'http://localhost:5000/uploads/:path*'
      }
    ];
  },
};

export default nextConfig;
```

Create `apps/student-portal/tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // Copy theme from client/src/index.css
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

Create `apps/student-portal/package.json`:

```json
{
  "name": "@narada/student-portal",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start --port 3000",
    "lint": "next lint"
  },
  "dependencies": {
    "@narada/ui": "workspace:*",
    "@narada/types": "workspace:*",
    "next": "^15.1.6",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@tanstack/react-query": "^5.67.0",
    "wouter": "^3.5.3"
  },
  "devDependencies": {
    "@types/node": "^22",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5",
    "tailwindcss": "^3.4.1",
    "tailwindcss-animate": "^1.0.7"
  }
}
```

#### Step 3: Create Student Portal Pages

**Root Layout** (`apps/student-portal/app/layout.tsx`):

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@narada/ui/styles'; // Import shared styles
import './globals.css'; // Local overrides if needed

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Narada LMS - Student Portal',
  description: 'Learn with Narada',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

**Auth Page** (`apps/student-portal/app/page.tsx`):

```typescript
import { AuthPage } from '@narada/ui';

export default function HomePage() {
  return <AuthPage />;
}
```

**Dashboard Page** (`apps/student-portal/app/dashboard/page.tsx`):

```typescript
'use client';

import { useAuth } from '@narada/ui';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppLayout } from '@narada/ui';

interface Chapter {
  id: number;
  title: string;
  status: string;
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);

  useEffect(() => {
    if (!isLoading && !user) {
      redirect('/');
    }
  }, [user, isLoading]);

  useEffect(() => {
    if (user) {
      fetchChapters();
    }
  }, [user]);

  async function fetchChapters() {
    const token = localStorage.getItem('jwt_token');
    const response = await fetch('/api/learning/chapters', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    setChapters(data);
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <AppLayout role="student">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">My Chapters</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chapters.map(chapter => (
            <div key={chapter.id} className="border p-4 rounded">
              <h3>{chapter.title}</h3>
              <p>Status: {chapter.status}</p>
              <a href={`/learn/${chapter.id}`}>Start Learning</a>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
```

**Learn Chapter Page** (`apps/student-portal/app/learn/[chapterId]/page.tsx`):

```typescript
'use client';

import { useAuth } from '@narada/ui';
import { useParams, redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppLayout } from '@narada/ui';
import { TiptapEditor } from '@narada/ui/tiptap-editor';
import { AudioPlayerControls } from '@narada/ui';

export default function LearnChapterPage() {
  const { user, isLoading } = useAuth();
  const { chapterId } = useParams();
  const [chapter, setChapter] = useState<any>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      redirect('/');
    }
  }, [user, isLoading]);

  useEffect(() => {
    if (user && chapterId) {
      fetchChapter();
    }
  }, [user, chapterId]);

  async function fetchChapter() {
    const token = localStorage.getItem('jwt_token');
    const response = await fetch(`/api/learning/chapters/${chapterId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    setChapter(data);
  }

  if (isLoading || !chapter) {
    return <div>Loading...</div>;
  }

  return (
    <AppLayout role="student">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">{chapter.title}</h1>
        
        {/* Tiptap in read-only mode */}
        <TiptapEditor
          content={chapter.content?.en || ''}
          disabled={true}
          output="html"
        />

        {/* Audio player */}
        <AudioPlayerControls chapter={chapter} />
      </div>
    </AppLayout>
  );
}
```

#### Step 4: Configure Environment Variables

Create `apps/student-portal/.env.local`:

```env
API_URL=http://localhost:5000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

#### Step 5: Update Root Scripts

Update root `package.json` scripts:

```json
{
  "scripts": {
    "dev": "turbo run dev",
    "dev:legacy": "cd apps/temp-legacy && npm run dev",
    "dev:student": "cd apps/student-portal && npm run dev",
    "build": "turbo run build"
  }
}
```

### API Endpoints Needed by Student Portal

```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/register
GET    /api/auth/me
GET    /api/auth/google
GET    /api/learning/chapters
GET    /api/learning/chapters/:id
POST   /api/learning/progress
GET    /uploads/:filename  (proxied)
```

### Validation Criteria

- [ ] Student portal runs on `localhost:3000`
- [ ] Old monolith still runs on `localhost:5000`
- [ ] Can login via student portal using email/password
- [ ] Can login via student portal using Google OAuth
- [ ] AuthPage looks IDENTICAL to current
- [ ] Dashboard shows same chapters as old app
- [ ] Clicking a chapter opens LearnChapter page
- [ ] Tiptap editor displays chapter content (read-only)
- [ ] Audio playback works
- [ ] Can logout and login again
- [ ] No console errors in browser
- [ ] `.env.local` configured correctly

### Gaps & Mitigations

**Gap 1.1: CORS Issues**

- **Risk**: API on port 5000 might reject requests from port 3000
- **Mitigation**: Add CORS middleware in API server:

  ```typescript
  import cors from 'cors';
  app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  }));
  ```

**Gap 1.2: Upload Proxy**

- **Risk**: Student portal can't access `/uploads` on API server
- **Mitigation**: Already handled via Next.js rewrites in config

**Gap 1.3: JWT Storage**

- **Risk**: Student portal and old app have separate localStorage
- **Mitigation**: This is expected - they're independent apps

### Rollback Plan

```bash
git checkout HEAD~1 -- apps/student-portal
git checkout HEAD~1 -- packages/ui
rm -rf apps/student-portal
npm install
```

### Estimated Effort

- Implementation: 3-4 hours
- Testing: 1 hour
- **Total**: 4-5 hours

---

## Phase 2: Extract Ops Portal

**Branch**: `phase-1-2-ops-portal`

### Objectives

1. Create Ops (Operations) Portal for admin/instructor/content-manager roles
2. Runs on port 3001 alongside student portal (3000) and API (5000)
3. Uses same shared packages (`@narada/ui`, `@narada/database`)
4. **Old monolith still untouched**

### Current State Analysis

**Admin Routes**:

```
/app/admin/users            → UserManagementPage
/app/admin/logs             → AuditLogsPage
/app/admin/batches          → BatchManagementPage
/app/admin/batches/:id      → BatchDetailsPage
```

**Instructor Routes**:

```
/app/instructor/students        → MyStudentsPage
/app/instructor/students/:id    → StudentDetailsPage
/app/instructor/batches         → MyBatchesListPage
```

**Content Management Routes** (Admin/Instructor):

```
/app/content                                         → TracksAndChaptersPage
/app/content/tracks/:trackId/chapters/:chapterId     → ChapterContentPage
```

### File Mapping

#### Step 1: Create apps/ops-portal

**Initialize**:

```bash
cd apps
npx create-next-app@latest ops-portal \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"
```

**Configuration** (`apps/ops-portal/next.config.ts`):

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@narada/ui', '@narada/types'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.API_URL || 'http://localhost:5000/api/:path*'
      },
      {
        source: '/uploads/:path*',
        destination: process.env.API_URL || 'http://localhost:5000/uploads/:path*'
      }
    ];
  },
};

export default nextConfig;
```

Create `apps/ops-portal/package.json`:

```json
{
  "name": "@narada/ops-portal",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "start": "next start --port 3001",
    "lint": "next lint"
  },
  "dependencies": {
    "@narada/ui": "workspace:*",
    "@narada/types": "workspace:*",
    "next": "^15.1.6",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@tanstack/react-query": "^5.67.0"
  },
  "devDependencies": {
    "@types/node": "^22",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5",
    "tailwindcss": "^3.4.1",
    "tailwindcss-animate": "^1.0.7"
  }
}
```

#### Step 2: Create Ops Portal Pages

**Auth Page** (`apps/ops-portal/app/page.tsx`):

```typescript
import { AuthPage } from '@narada/ui';

export default function HomePage() {
  return <AuthPage />;
}
```

**Admin Dashboard** (`apps/ops-portal/app/admin/users/page.tsx`):

```typescript
'use client';

import { useAuth } from '@narada/ui';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppLayout } from '@narada/ui';
import { Button, Card } from '@narada/ui';

export default function UserManagementPage() {
  const { user, isLoading } = useAuth();
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!isLoading && !user) {
      redirect('/');
    }
  }, [user, isLoading]);

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

  async function fetchUsers() {
    const token = localStorage.getItem('jwt_token');
    const response = await fetch('/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    setUsers(data);
  }

  async function approveUser(userId: string) {
    const token = localStorage.getItem('jwt_token');
    await fetch(`/api/admin/users/${userId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ roles: ['student'] }),
    });
    fetchUsers();
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <AppLayout role="admin">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">User Management</h1>
        <div className="space-y-2">
          {users.map(u => (
            <Card key={u.id} className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p>{u.firstName} {u.lastName}</p>
                  <p className="text-sm text-gray-500">{u.email}</p>
                  <p className="text-xs">Status: {u.status}</p>
                </div>
                {u.status === 'pending_approval' && (
                  <Button onClick={() => approveUser(u.id)}>
                    Approve
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
```

**Content Editor** (`apps/ops-portal/app/content/tracks/[trackId]/chapters/[chapterId]/page.tsx`):

```typescript
'use client';

import { useAuth } from '@narada/ui';
import { useParams, redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppLayout } from '@narada/ui';
import { TiptapEditor } from '@narada/ui/tiptap-editor';
import { Button } from '@narada/ui';

export default function ChapterContentPage() {
  const { user, isLoading } = useAuth();
  const { trackId, chapterId } = useParams();
  const [chapter, setChapter] = useState<any>(null);
  const [content, setContent] = useState('');

  useEffect(() => {
    if (!isLoading && !user) {
      redirect('/');
    }
  }, [user, isLoading]);

  useEffect(() => {
    if (user && chapterId) {
      fetchChapter();
    }
  }, [user, chapterId]);

  async function fetchChapter() {
    const token = localStorage.getItem('jwt_token');
    const response = await fetch(`/api/content/chapters/${chapterId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    setChapter(data);
    setContent(data.content?.en || '');
  }

  async function saveChapter() {
    const token = localStorage.getItem('jwt_token');
    await fetch(`/api/content/chapters/${chapterId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: { en: content },
      }),
    });
    alert('Chapter saved!');
  }

  if (isLoading || !chapter) {
    return <div>Loading...</div>;
  }

  return (
    <AppLayout role="content_manager">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">{chapter.title}</h1>
          <Button onClick={saveChapter}>Save Chapter</Button>
        </div>
        
        {/* Tiptap in EDIT mode */}
        <TiptapEditor
          content={content}
          disabled={false}
          output="json"
          onChange={setContent}
        />
      </div>
    </AppLayout>
  );
}
```

#### Step 3: Configure Environment Variables

Create `apps/ops-portal/.env.local`:

```env
API_URL=http://localhost:5000
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

### API Endpoints Needed by Ops Portal

```
All from student portal PLUS:

GET    /api/admin/users
POST   /api/admin/users/:id/approve
PUT    /api/admin/users/:id
DELETE /api/admin/users/:id

GET    /api/admin/logs

GET    /api/batches
POST   /api/batches
PUT    /api/batches/:id
DELETE /api/batches/:id

GET    /api/content/tracks
POST   /api/content/tracks
GET    /api/content/chapters
POST   /api/content/chapters
PUT    /api/content/chapters/:id/publish

POST   /api/media/upload
DELETE /api/media/:id
```

### Validation Criteria

- [ ] Ops portal runs on `localhost:3001`
- [ ] Student portal still runs on `localhost:3000`
- [ ] Old monolith still runs on `localhost:5000`
- [ ] Can login as admin user via ops portal
- [ ] User management page shows all users
- [ ] Can approve pending users
- [ ] Batch management works
- [ ] Content editing (tracks/chapters) works
- [ ] Tiptap editor loads and functions in EDIT mode
- [ ] Can save chapter content
- [ ] File upload works (if implemented)
- [ ] No console errors

### Gaps & Mitigations

**Gap 2.1: File Upload Handling**

- **Risk**: Ops portal (different origin) uploads files
- **Mitigation**: Already works via `/api/media/upload` endpoint

**Gap 2.2: Real-time Collaboration (WebSocket)**

- **Risk**: WebSocket connection from ops portal to API server
- **Mitigation**: Ensure WebSocket endpoint is CORS-enabled and JWT-authenticated

### Rollback Plan

```bash
git checkout HEAD~1 -- apps/ops-portal
rm -rf apps/ops-portal
npm install
```

### Estimated Effort

- Implementation: 2-3 hours
- Testing: 1 hour
- **Total**: 3-4 hours

---

## Phase 3: Extract API Server & Remove Legacy

**Branch**: `phase-1-3-api-extraction`

### Objectives

1. Move Express server into its own app (`apps/api`)
2. Remove Vite frontend serving from API
3. **Delete old monolith** (`client/`, `server/`, `shared/`)
4. Validate all 3 containers work independently

### Current State

The API is currently part of `server/index.ts` which also serves the Vite frontend.

### File Mapping

#### Step 1: Create apps/api

**Initialize folder**:

```bash
mkdir -p apps/api/src
```

**Move server files**:

```bash
# Move all server code
cp -r server/* apps/api/src/

# Remove Vite-specific code manually from index.ts
```

**Create `apps/api/package.json`**:

```json
{
  "name": "@narada/api",
  "version": "0.0.1",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "esbuild src/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@narada/database": "workspace:*",
    "@narada/types": "workspace:*",
    "express": "^4.22.1",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "passport-google-oauth20": "^2.0.0",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    "multer": "^1.4.5-lts.1",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/passport": "^1.0.16",
    "@types/passport-local": "^1.0.38",
    "@types/passport-google-oauth20": "^2.0.16",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/bcrypt": "^5.0.2",
    "@types/multer": "^1.4.12",
    "@types/cors": "^2.8.17",
    "@types/ws": "^8.5.13",
    "tsx": "^4.19.2",
    "esbuild": "^0.24.2"
  }
}
```

#### Step 2: Modify apps/api/src/index.ts

**Remove Vite serving**:

```typescript
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import passport from 'passport';
import './auth/passport-config'; // Passport strategies
import { identityRouter } from './routes/identity.routes';
import { adminRouter } from './routes/admin.routes';
import { contentRouter } from './routes/content.routes';
import { mediaRouter } from './routes/media.routes';
import { batchRouter } from './routes/batch.routes';
import { studentRouter } from './routes/student.routes';
import { learningRouter } from './routes/learning.routes';

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000', // Student portal
    'http://localhost:3001', // Ops portal
  ],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// API routes (NO frontend serving)
app.use('/api/auth', identityRouter);
app.use('/api/admin', adminRouter);
app.use('/api/content', contentRouter);
app.use('/api/media', mediaRouter);
app.use('/api/batches', batchRouter);
app.use('/api/students', studentRouter);
app.use('/api/learning', learningRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const port = parseInt(process.env.PORT || '5000', 10);
app.listen(port, '0.0.0.0', () => {
  console.log(`✓ API server running on port ${port}`);
});
```

#### Step 3: Update Database Imports in API

Replace all instances in `apps/api/src/`:

```typescript
// OLD
import { users, tracks } from '../../../shared/schema';

// NEW
import { users, tracks } from '@narada/database/schema';
```

**Files to update**:

- `apps/api/src/routes/*.routes.ts`
- `apps/api/src/modules/*.ts`

#### Step 4: Create Environment Variables

Create `apps/api/.env`:

```env
# Copy from root .env
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_EXPIRY=7d
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FRONTEND_URL=http://localhost:3000
PORT=5000
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=50
```

#### Step 5: Update Root Scripts

Update root `package.json`:

```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "dev:api": "cd apps/api && npm run dev",
    "dev:student": "cd apps/student-portal && npm run dev",
    "dev:ops": "cd apps/ops-portal && npm run dev"
  }
}
```

#### Step 6: Remove Legacy Files

**AFTER Phase 3 validation passes**:

```bash
# Tag before deletion
git tag phase-1-3-pre-cleanup

# Remove old monolith
rm -rf client/
rm -rf server/
rm -rf shared/

# Clean root package.json (remove old dependencies)
```

### Validation Criteria

- [ ] API runs standalone on `localhost:5000`
- [ ] Student portal (3000) connects to API (5000)
- [ ] Ops portal (3001) connects to API (5000)
- [ ] Can login from student portal
- [ ] Can login from ops portal
- [ ] Student can view chapters
- [ ] Admin can manage users
- [ ] Content editing works
- [ ] File uploads work
- [ ] Audio playback works
- [ ] WebSocket collaboration works (if applicable)
- [ ] Old `client/`, `server/`, `shared/` folders deleted
- [ ] All 3 apps run via `npm run dev`

### Gaps & Mitigations

**Gap 3.1: CORS Configuration**

- **Mitigation**: Already added in Step 2 (origin whitelist)

**Gap 3.2: Upload Directory**

- **Mitigation**: API continues serving `/uploads`, portals proxy to it

**Gap 3.3: Session Persistence**

- **Mitigation**: JWT tokens stored in localStorage, no session persistence needed

### Rollback Plan

```bash
git checkout HEAD~1 -- client/ server/ shared/
git checkout HEAD~1 -- apps/api
rm -rf apps/api
npm install
```

### Estimated Effort

- Implementation: 1 hour
- Testing: 30 minutes
- **Total**: 1.5 hours

---

## Phase 4: Documentation & Knowledge Bridge

**Branch**: `phase-1-4-documentation`

### Objectives

1. Document final API endpoints comprehensively
2. Create Docker setup guide (for future use)
3. Document shared components architecture
4. Create Stage 2 preparation notes
5. Create Stage 3 preparation notes

### Implementation Steps

#### Step 1: Comprehensive API Documentation

**Already created in Stage 0** (`docs/implementation/api-endpoints.md`)

**Action**: Validate accuracy, add any missing endpoints from Ops Portal.

#### Step 2: Docker Setup Guide

Create `docs/implementation/docker-setup.md`:

```markdown
# Docker Setup Guide

**When to Use**: After Stage 1 complete or before production deployment

## Overview

This guide documents how to dockerize the 3-container setup:
- Student Portal (Next.js)
- Ops Portal (Next.js)
- API (Express)

## Dockerfiles

### API Dockerfile

`apps/api/Dockerfile`:
```dockerfile
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
RUN npm install

# Copy source
COPY apps/api ./apps/api
COPY packages/ ./packages/
COPY turbo.json ./

# Build
RUN npm run build --filter=@narada/api

# Production
FROM node:20-alpine
WORKDIR /app
COPY --from=base /app/apps/api/dist ./dist
COPY --from=base /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

### Student Portal Dockerfile

`apps/student-portal/Dockerfile`:

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY apps/student-portal/package.json ./apps/student-portal/
COPY packages/ui/package.json ./packages/ui/
COPY packages/types/package.json ./packages/types/
RUN npm install

# Copy source
COPY apps/student-portal ./apps/student-portal
COPY packages/ ./packages/
COPY turbo.json ./

# Build
RUN npm run build --filter=@narada/student-portal

# Production
FROM node:20-alpine
WORKDIR /app
COPY --from=base /app/apps/student-portal/.next ./.next
COPY --from=base /app/node_modules ./node_modules
CMD ["npm", "start"]
```

### Ops Portal Dockerfile

Similar to Student Portal, adjust paths.

## docker-compose.yml

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: naradalms
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: naradalms
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    environment:
      DATABASE_URL: postgresql://naradalms:${DB_PASSWORD}@db:5432/naradalms
      JWT_SECRET: ${JWT_SECRET}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
    ports:
      - "5000:5000"
    depends_on:
      - db

  student-portal:
    build:
      context: .
      dockerfile: apps/student-portal/Dockerfile
    environment:
      API_URL: http://api:5000
      NEXT_PUBLIC_SITE_URL: http://localhost:3000
    ports:
      - "3000:3000"
    depends_on:
      - api

  ops-portal:
    build:
      context: .
      dockerfile: apps/ops-portal/Dockerfile
    environment:
      API_URL: http://api:5000
      NEXT_PUBLIC_SITE_URL: http://localhost:3001
    ports:
      - "3001:3001"
    depends_on:
      - api

volumes:
  postgres_data:
```

## Usage

```bash
# Build and start
docker-compose up --build

# Stop
docker-compose down

# View logs
docker-compose logs -f api
```

## Production Considerations

1. **Environment Variables**: Use secrets management (not .env files)
2. **Nginx Reverse Proxy**: Route all traffic through nginx
3. **SSL Certificates**: Set up HTTPS
4. **Database Backups**: Automated pg_dump
5. **Monitoring**: Add health checks and logging

```

#### Step 3: Shared Components Architecture

Create `docs/implementation/shared-components.md`:

```markdown
# Shared Components Architecture

## Overview

`@narada/ui` is the shared component library used by both Student Portal and Ops Portal.

## Component Categories

### UI Primitives (41 components)
Located: `packages/ui/src/components/*.tsx`

All Radix UI-based components:
- button, card, input, label, select, separator, sheet, switch, tabs, toast, tooltip
- accordion, alert, alert-dialog, avatar, badge, breadcrumb, calendar, checkbox
- collapsible, command, context-menu, dialog, dropdown-menu, form, hover-card
- menubar, navigation-menu, popover, progress, radio-group, scroll-area
- skeleton, slider, table, textarea, toggle, toggle-group

### Tiptap Editor (132 files)
Located: `packages/ui/src/tiptap-editor/*`

**Critical Component**: Used by BOTH portals
- **Student Portal**: Read-only chapter view (`disabled={true}`)
- **Ops Portal**: Full editing (`disabled={false}`)

**Usage**:
```typescript
// Student (read-only)
<TiptapEditor content={html} disabled={true} output="html" />

// Ops (edit)
<TiptapEditor content={json} disabled={false} output="json" onChange={handleChange} />
```

### Pages

- **AuthPage**: Login/Register page (shared by both portals)

### Layouts

- **AppLayout**: Role-based layout wrapper
- **AppSidebar**: Navigation sidebar (adapts to user role)

### Hooks

- **useAuth**: JWT authentication state
- **use-toast**: Toast notifications

## Import Patterns

```typescript
// Component imports
import { Button, Card } from '@narada/ui';

// Tiptap
import { TiptapEditor } from '@narada/ui/tiptap-editor';

// Pages
import { AuthPage } from '@narada/ui';

// Layouts
import { AppLayout, AppSidebar } from '@narada/ui';

// Hooks
import { useAuth, useToast } from '@narada/ui';

// Styles
import '@narada/ui/styles';
```

## Adding New Shared Components

1. Create in `packages/ui/src/components/new-component.tsx`
2. Export in `packages/ui/src/index.ts`
3. Use in portals: `import { NewComponent } from '@narada/ui'`

```

#### Step 4: Stage 2 Preparation Notes

Create `docs/implementation/stage-2-prep.md`:

```markdown
# Stage 2: Chameleonization - Preparation Notes

## Overview
Stage 2 will enable theme-based multi-branding for student portals.

## Key Findings from Stage 1

### Assets Location
- **Decision**: Assets stored in portal-specific `public/` directories
- **Reason**: Prepares for org-specific branding
- **Stage 2 Impact**: Each tenant will have own assets

### Theme Configuration Needs

**What needs to be themeable**:
1. **Colors**: Primary, secondary, accent, background
2. **Logo**: Main logo, stacked logo, favicon
3. **Typography**: Font family, sizes
4. **Brand Name**: "Narada LMS" → Tenant-specific name

### Proposed Approach

**Option A: Subdomain-based**
- `student.tenant1.com` → Theme 1
- `student.tenant2.com` → Theme 2
- Lookup theme by hostname

**Option B: Config-based**
- Single student portal
- Theme loaded from database by orgID
- User's orgID determines theme

### Technical Implementation

**Theme Schema** (to be added in Stage 2):
```typescript
interface Theme {
  orgId: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  brandName: string;
  customCss?: string;
}
```

**CSS Variables Injection**:

```typescript
// runtime in student portal
const theme = await fetchTheme(orgId);
document.documentElement.style.setProperty('--primary', theme.primaryColor);
```

## Questions for Stage 2 Planning

1. Will each org have its own subdomain or single domain?
2. How will users sign up (which org)?
3. Can a user belong to multiple orgs?
4. Do we need a "default" theme?
5. Who manages themes (super-admin)?

```

#### Step 5: Stage 3 Preparation Notes

Create `docs/implementation/stage-3-prep.md`:

```markdown
# Stage 3: Multi-Tenancy - Preparation Notes

## Overview
Stage 3 will add OrgID-based data isolation.

## Database Changes Required

From `schema-baseline.md` analysis:

### Tables Requiring org_id

**High Priority**:
- `tracks` → org_id (curriculum per org)
- `chapters` → org_id (content per org)
- `batches` → org_id (cohorts per org)
- `enrollments` → org_id (per org)
- `studentProgress` → org_id (per org)

**Medium Priority**:
- `users` → Many-to-many with orgs (junction table needed)

**Low Priority**:
- `audioFiles` → Decision needed (shared or org-specific?)
- `textSegments` → Decision needed

### Migration Steps (Stage 3)

1. **Create organizations table**:
   ```sql
   CREATE TABLE organizations (
     id UUID PRIMARY KEY,
     name VARCHAR(255),
     slug VARCHAR(100) UNIQUE,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

1. **Add org_id to tables**:

   ```sql
   ALTER TABLE tracks ADD COLUMN org_id UUID;
   ALTER TABLE chapters ADD COLUMN org_id UUID;
   -- etc.
   ```

2. **Backfill with default org**:

   ```sql
   INSERT INTO organizations (id, name, slug) VALUES ('default-org-id', 'Narada LMS', 'narada');
   UPDATE tracks SET org_id = 'default-org-id';
   ```

3. **Make org_id NOT NULL** and add indexes

4. **Add RLS policies** (optional - or enforce in app layer)

### API Middleware Changes

**Add orgID filter middleware**:

```typescript
function orgIdFilter(req, res, next) {
  const { user } = req;
  const orgId = user.currentOrgId; // from JWT payload
   
  req.orgId = orgId;
  next();
}

// Apply to all protected routes
router.get('/tracks', jwtAuth, orgIdFilter, (req, res) => {
  const { orgId } = req;
  const tracks = await db.select().from(tracksTable).where(eq(tracksTable.orgId, orgId));
  res.json(tracks);
});
```

### JWT Payload Changes

**Current**:

```json
{
  "userId": "...",
  "email": "...",
  "roles": ["student"],
  "status": "active"
}
```

**After Stage 3**:

```json
{
  "userId": "...",
  "email": "...",
  "roles": ["student"],
  "status": "active",
  "currentOrgId": "org-uuid",
  "availableOrgs": ["org-uuid-1", "org-uuid-2"]
}
```

## Questions for Stage 3 Planning

1. Can a user belong to multiple orgs?
2. How does user switch between orgs?
3. Who creates new organizations (super-admin)?
4. Do orgs have hierarchies (parent-child)?
5. What data is shared across orgs (if any)?

```

### Validation Criteria

- [ ] `docker-setup.md` created
- [ ] `shared-components.md` created
- [ ] `stage-2-prep.md` created
- [ ] `stage-3-prep.md` created
- [ ] All documentation links work
- [ ] No broken references in docs

### Rollback Plan
Documentation only. No rollback needed.

### Estimated Effort
- 2-3 hours

---

## Stage 1 Completion Gate

**Before proceeding to Stage 2, validate ALL of the following**:

### Phase Completion
- [ ] Phase 0 (Monorepo Setup) complete and tagged
- [ ] Phase 1 (Student Portal) complete and tagged
- [ ] Phase 2 (Ops Portal) complete and tagged
- [ ] Phase 3 (API Extraction) complete and tagged
- [ ] Phase 4 (Documentation) complete and tagged

### Functional Validation

**Student Portal**:
- [ ] Runs on `localhost:3000`
- [ ] Login with email/password works
- [ ] Login with Google OAuth works
- [ ] Dashboard shows chapters
- [ ] Can view chapter content
- [ ] Tiptap displays content (read-only)
- [ ] Audio playback works
- [ ] Can logout

**Ops Portal**:
- [ ] Runs on `localhost:3001`
- [ ] Login as admin works
- [ ] User management works
- [ ] Batch management works
- [ ] Content editing works
- [ ] Tiptap editor works (edit mode)
- [ ] Can save chapters
- [ ] File upload works

**API Server**:
- [ ] Runs on `localhost:5000`
- [ ] Handles requests from both portals
- [ ] JWT authentication works
- [ ] All endpoints respond correctly
- [ ] CORS configured properly
- [ ] Serves uploaded files

### Code Quality
- [ ] No TypeScript errors in any app
- [ ] No ESLint errors
- [ ] All imports resolve correctly
- [ ] Turbo build succeeds
- [ ] All 3 apps start via `npm run dev`

### Documentation
- [ ] API endpoints documented
- [ ] Shared components documented
- [ ] Docker setup documented
- [ ] Stage 2 prep notes created
- [ ] Stage 3 prep notes created

### Git Hygiene
- [ ] All phase branches merged to `stage-1-replatform`
- [ ] All phases tagged (`phase-1-0-complete` through `phase-1-4-complete`)
- [ ] `stage-1-replatform` ready for final validation
- [ ] Old `client/`, `server/`, `shared/` folders deleted

### User Testing
- [ ] Student can complete full learning flow
- [ ] Admin can manage users end-to-end
- [ ] Instructor can view student progress
- [ ] Content manager can create and edit chapters
- [ ] No console errors in any portal
- [ ] No 5xx errors in API logs

### User Approval
- [ ] **EXPLICIT WRITTEN APPROVAL FROM USER REQUIRED**

---

## Merge to Main

**Only after ALL Stage 1 validation passes**:

```bash
# Tag Stage 1 completion
git checkout stage-1-replatform
git tag stage-1-complete

# Push everything
git push origin stage-1-replatform --tags

# Create PR to main
# Title: "Stage 1: Structural Split Complete"
# Description: Reference this document and validation checklist
```

**User Action**: Create GitHub PR for team review before merging to main.

---

## Next Steps

After Stage 1 merges to `main`:

1. **Pause and Reflect**: Document learnings, performance observations
2. **Update Decision Log**: Add any new decisions from execution
3. **Prepare for Stage 2**: Review `docs/implementation/stages/stage-2-chameleonization.md`
4. **Test Deployment** (optional): Deploy to staging environment if available
5. **Create Stage 2 Branch**: `git checkout main && git checkout -b stage-2-chameleon`

**Stage 2 will focus on**: Theme-based multi-branding for student portals, enabling each organization to have custom colors, logos, and branding.

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-31  
**Owner**: Narada LMS Team
