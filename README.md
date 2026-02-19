# NaradaLMS

NaradaLMS is a modern, multilingual Learning Management System purpose-built for Vedic education. It specializes in handling multiple scripts (Telugu, Devanagari, IAST) and pedagogical text-audio synchronization.

## Architecture

The project is a **monorepo** with a shared API server and two Next.js portals:

- **Server** (Express API): Authentication, content, batches, media, admin. Runs on port 5000.
- **Student Portal** (`apps/student-portal`): Student learning experience. Next.js on port 3000.
- **Admin Portal** (`apps/admin-portal`): Admin, instructors, content studio. Next.js on port 3001.
- **Shared packages**: `packages/types`, `packages/ui` for types and shared UI.

Domain modules (Identity & Access, Content Publishing, Media Pipeline, Batch & Cohort, Learning Delivery, System Admin) live in the server; the portals consume the API.

## Quick Start

### Prerequisites
- Node.js (v18+)
- PostgreSQL (or use Docker: `docker-compose up -d postgres`)

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment:
   - Copy root `.env.example` to `.env` and fill in database and JWT_SECRET.
   - For each portal, copy `apps/<portal>/.env.example` to `apps/<portal>/.env.local`.
   See [Environment Variables](docs/essentials/environment-variables.md) for all variables.
4. Initialize the database:
   ```bash
   npm run db:push
   ```
5. Start all services (API + both portals):
   ```bash
   npm run dev:all
   ```
   Or start individually:
   - API: `npm run dev` (root)
   - Student portal: `cd apps/student-portal && npm run dev`
   - Admin portal: `cd apps/admin-portal && npm run dev`

### Production build
```bash
powershell -ExecutionPolicy Bypass -File scripts/build-all.ps1
```
Builds the server to `dist/` and both Next.js apps to their `.next/` directories.

## Tech Stack

### Frontend (portals)
- **Framework**: [Next.js 15](https://nextjs.org/) with [React 18](https://react.dev/).
- **Styling**: [Tailwind CSS](https://tailwindcss.com/).
- **UI**: [shadcn/ui](https://ui.shadcn.com/) (Radix UI), shared `@narada/ui` package.
- **State & Data**: [TanStack Query](https://tanstack.com/query), [TipTap](https://tiptap.dev/) for rich text.

### Backend
- **Runtime**: Node.js with TypeScript.
- **Web framework**: [Express](https://expressjs.com/).
- **Auth**: [Passport.js](https://www.passportjs.org/) (Local & Google OAuth), JWT in HttpOnly cookies.
- **Security**: [Helmet](https://helmetjs.github.io/), CORS, rate limiting, CSRF.
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Drizzle ORM](https://orm.drizzle.team/).
- **Validation**: [Zod](https://zod.dev/).

## Documentation

- [Environment Variables](docs/essentials/environment-variables.md): All required env vars for server and portals.
- [Product Guide](docs/essentials/product-guide.md): Product vision and features.
- [Project Structure](docs/essentials/project-structure.md): Codebase organization (see repo layout for current structure).
- [Domain Requirements](docs/essentials/domain-requirements.md): Workflows and use cases.
- [Hardening](docs/hardening/README.md): Pre-deploy hardening phases and verification.

## License
MIT
