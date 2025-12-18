# architecture overview (front door)

**Purpose:** Quick orientation for contributors. Full module contracts live in [docs/architecture/module-contracts.md](module-contracts.md).

**Why modular monolith:** One deploy keeps ops simple; clear module boundaries mean safer changes now and easier service extraction later.

---

## Stack snapshot

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript, Vite, Wouter, TanStack Query, Tailwind + shadcn/ui, TipTap |
| Backend | Node + Express (TypeScript), Drizzle ORM, PostgreSQL (Neon), Multer, music-metadata |
| Shared | Zod, drizzle-zod |

Path aliases: `@/` → client/src, `@shared/` → shared.

---

## Repo layout (essentials)

```
client/         # React app (components, pages, hooks, lib)
server/         # Express app (routes, storage, modules)
shared/         # Shared schema/types/utils
uploads/        # Audio uploads (static)
docs/           # Documentation
```

Fonts live in client/public/fonts (JIMS, AdishilaSan variants for Telugu/Devanagari/IAST).

---

## Data shape (quick view)

- Users + sessions for auth/roles
- Tracks → chapters → text_segments (per script)
- Audio_files → media_segments → segment_mappings
- Batches + enrollments (one track per batch)
- Student_progress (chapter-level proficiency 0–4)

See module ownership, allowed reads, and events in [docs/architecture/module-contracts.md](module-contracts.md).

---

## API/routes (high level)

- Tracks/chapters/segments: `/api/tracks`, `/api/chapters/:trackId`, `/api/segments/:chapterId`
- Audio/mappings: `/api/audio-files/:chapterId`, `/api/mappings/chapter/:chapterId`, `/api/mappings/audio/:audioFileId`
- Batches/enrollments: `/api/batches`, `/api/batches/:id/enrollments`
- Progress: `/api/progress/student/:studentId/:chapterId`
- Admin: `/api/admin/users`, `/api/admin/settings`, `/api/admin/audit-logs`

Routes call module services; no direct DB access. Auth middleware + requireRole protect everything sensitive.

---

## Frontend routes (summary)

- `/` dashboard (approved users)
- `/manage/tracks/...` content management (admin/content manager)
- `/learn/tracks/...` student browse
- `/study/:chapterId` interactive learning
- `/admin/users`, `/admin/batches` admin tools
- `/instructor/batches` instructor tools

---

## Dev quickstart

```bash
npm run dev     # Vite + Express dev (port 5000)
npm run db:push # Apply schema changes
```

Environment: Neon PostgreSQL; Vite handles frontend HMR. Use TanStack Query for server state; keep local state with React hooks.
