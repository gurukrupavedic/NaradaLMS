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
- **Frontend**: React, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Drizzle ORM
- **API**: OpenAPI (Swagger) documented

## 📖 Documentation

Detailed documentation is available in the `docs/` directory:
- [Product Guide](docs/essentials/product-guide.md): Complete product vision and features.
- [Project Structure](docs/essentials/project-structure.md): Codebase organization and patterns.
- [Module Contracts](docs/architecture/module-contracts.md): Technical boundaries and service APIs.
- [Domain Requirements](docs/essentials/domain-requirements.md): Real-world workflows.

## ⚖️ License
MIT
