# NaradaLMS

NaradaLMS is a modern, multilingual Learning Management System purpose-built for Vedic education. It specializes in handling multiple scripts (Telugu, Devanagari, IAST) and pedagogical text-audio synchronization.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- PostgreSQL

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment:
   ```bash
   cp .env.example .env
   # Update .env with your database credentials
   ```
4. Initialize the database:
   ```bash
   npm run db:push
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

## 🏗️ Architecture

The project follows a **Modular Monolith** architecture with 6 domain modules:
- **Identity & Access**: User management and RBAC.
- **Content Publishing**: Track/Chapter management and text segmentation.
- **Media Pipeline**: Audio management and timestamp mapping.
- **Batch & Cohort**: Coordination and logistical cohorts.
- **Learning Delivery**: Student-facing interactive learning.
- **System Admin**: Audit logging and system settings.

## 🛠️ Tech Stack

NaradaLMS uses a modern, high-performance tech stack focused on type safety, modularity, and smooth user experiences.

### Frontend
- **Framework**: [React 18](https://react.dev/) with [Vite](https://vitejs.dev/) for fast builds.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) for utility-first design.
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (built on [Radix UI](https://www.radix-ui.com/) primitives).
- **State & Data**: [TanStack Query v5](https://tanstack.com/query) for server state and caching.
- **Rich Text**: [TipTap](https://tiptap.dev/) (ProseMirror) with custom Vedic script extensions.
- **Routing**: [Wouter](https://github.com/molefrog/wouter) for lightweight, standard-compliant routing.
- **Animation**: [Framer Motion](https://www.framer.com/motion/) for micro-interactions and transitions.

### Backend
- **Runtime**: [Node.js](https://nodejs.org/) with [TypeScript](https://www.typescriptlang.org/).
- **Web Framework**: [Express](https://expressjs.com/).
- **Authentication**: [Passport.js](https://www.passportjs.org/) (Local Strategy & Google OAuth 2.0).
- **Security**: [Helmet](https://helmetjs.github.io/), BCrypt, and [express-rate-limit](https://www.npmjs.com/package/express-rate-limit).
- **Media**: Multer for file uploads and [music-metadata](https://www.npmjs.com/package/music-metadata) for audio processing.

### Database & Storage
- **Database**: [PostgreSQL](https://www.postgresql.org/) (powered by [Neon](https://neon.tech/) Serverless).
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) for lightweight, type-safe database access.
- **Validation**: [Zod](https://zod.dev/) for schema-driven validation and Type safety.

### Architecture & Standards
- **Pattern**: Domain-Driven Modular Monolith.
- **API**: [OpenAPI 3.0.3](https://swagger.io/specification/) documented.
- **Linting**: [ESLint](https://eslint.org/) with React-specific plugins.

## 📖 Documentation

Detailed documentation is available in the `docs/` directory:
- [Product Guide](docs/essentials/product-guide.md): Complete product vision and features.
- [Project Structure](docs/essentials/project-structure.md): Codebase organization and patterns.
- [Module Contracts](docs/architecture/module-contracts.md): Technical boundaries and service APIs.
- [Domain Requirements](docs/essentials/domain-requirements.md): Real-world workflows.

## ⚖️ License
MIT
