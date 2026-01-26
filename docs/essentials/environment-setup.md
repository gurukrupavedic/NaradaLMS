# Environment Setup & Database Initialization

This guide provides a comprehensive walkthrough for setting up a new NaradaLMS instance or configuring a fresh local development environment.

---

## 🏗️ Core Setup Sequence

Follow these steps in order to ensure all dependencies and configurations are correctly applied.

### 1. Prerequisites

- **Node.js**: v18.0.0 or higher.
- **PostgreSQL**: A local instance or a remote provider like [Neon](https://neon.tech/).
- **Git**: For repository management.

### 2. Initial Configuration

1. **Clone the Repository**:

   ```bash
   git clone <repository-url>
   cd NaradaLMS
   ```

2. **Install Dependencies**:

   ```bash
   npm install
   ```

3. **Environment Variables**:
   Copy `.env.example` to `.env` and fill in the required values.

   ```bash
   cp .env.example .env
   ```

### 3. Database Initialization

NaradaLMS uses **Drizzle ORM** with a declarative "push" strategy for development.

Run the following command to synchronize your database schema with the code:

```bash
npm run db:push
```

> [!IMPORTANT]
> **Why `db:push`?**
> We use `drizzle-kit push` instead of traditional SQL migrations during active development. This makes the database match `shared/schema.ts` immediately without the overhead of tracking migration files.

---

## 🌱 Data Seeding Strategy

Seeding is divided into mandatory curriculum data and optional testing data.

### Phase A: Vedic Curriculum (Mandatory)

Populates the primary structure (Tracks and Chapters). This script has been streamlined to ensure the latest pedagogical structure is applied.

```bash
npm run db:seed
```

- **Script**: `server/seed-vedic-curriculum.ts`
- **Source**: `server/seeds/curriculum.json`

### Phase B: First Admin User (Required)

There are two ways to establish the first administrator:

1. **Recommended (Auto-Promotion)**:
   Add `ADMIN_EMAIL=your.email@example.com` to your `.env` file. The first time you register via the UI using this email, you will be automatically granted the `admin` role and `active` status.
2. **Manual Utility**:
   If you have already registered, you can promote yourself via the CLI:

   ```bash
   npx tsx scripts/utils/update-user-role.ts
   ```

### Phase C: Sample Testing Data (Optional)

Populates mock users, students, and batches for UI/UX testing.

- **Users**: `npx tsx scripts/seed/create-sample-users.ts`
- **Batches**: `npx tsx scripts/seed/create-sample-batches.ts`
- **Students**: `npx tsx scripts/seed/create-30-students.ts`

---

## 🛠️ Maintenance & Reset

### Full Database Reset

If your database becomes inconsistent during development, you can perform a "factory reset":

```bash
npm run db:reset
```

*Platform Note: This command runs `scripts/test/db-reset.ps1` on Windows and `scripts/db/reset-db.ts` on other platforms.*

**Reset Sequence**:

1. Drops the `public` schema.
2. Recreates the `public` schema.
3. Grants necessary permissions.
4. Executes `drizzle-kit push --force`.

---

## 🔗 Key Environment Variables

| Variable | Required | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | Yes | PostgreSQL connection string. |
| `SESSION_SECRET` | Yes | Random string for signing session cookies. |
| `ADMIN_EMAIL` | No | Email address that gets auto-promoted to Admin on registration. |
| `GOOGLE_CLIENT_ID` | Opt | Required for Google OAuth 2.0. |
| `GOOGLE_CLIENT_SECRET` | Opt | Required for Google OAuth 2.0. |

---

## 💡 Troubleshooting

- **`psql` not found**: Ensure PostgreSQL bin folder is in your system PATH.
- **Connection Refused**: Check if your local Postgres service is running or if your firewall blocks port 5432.
- **Schema Mismatch**: Run `npm run db:push` again if you pull new changes that include schema modifications.
