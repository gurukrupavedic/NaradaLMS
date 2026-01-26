# Cloud-Native Implementation Roadmap

> **Goal**: A surgical guide to migrating NaradaLMS from a local monolith to a GCP Cloud-Native architecture in one clean motion.

---

## 🚦 Phase 1: Foundation (GCP Environment)

Before writing code, we must set up the "Construction Site" in Google Cloud.

### 1. Project Setup
- Create three projects: `narada-dev`, `narada-test`, `narada-prod`.
- Enable APIs: Cloud Run, Cloud SQL, Cloud Storage, Artifact Registry, Secret Manager.

### 2. Workload Identity Federation (Keyless Auth)
- Set up a pool and provider in GCP to allow GitHub to authenticate without a `.json` key.
- Grant the GitHub Service Account the `roles/run.admin` and `roles/storage.admin` permissions.

---

## 🛠️ Phase 2: The "Stateless" Refactor (CRITICAL)

The app must be modified to run in an environment where the local disk is wiped every restart.

### 1. Google Cloud Storage (GCS) Integration
- **Target File**: `server/routes/media.routes.ts`
- **Change**: Replace `multer.diskStorage` with `multer.memoryStorage`.
- **Logic**: Use the `@google-cloud/storage` library to upload buffers directly to a bucket.
- **DB Update**: Save the full `https://storage.googleapis.com/...` URL in the `audio_files` table instead of just the filename.

### 2. Static Asset Strategy
- **Target File**: `server/index.ts`
- **Change**: Remove `app.use('/uploads', express.static('uploads'))`.
- **Verification**: Ensure the frontend `AudioPlayer` components are receiving the full GCP URL from the API.

---

## 🗄️ Phase 3: Database & Sessions

### 1. Cloud SQL Migration
- Create a Cloud SQL (PostgreSQL) instance.
- **Migration**: Run `drizzle-kit push` (or `drizzle-kit migrate`) against the Cloud SQL IP/Connection string.
- Update `DATABASE_URL` in the environment secrets.

### 2. Session Management
- **Target**: `server/index.ts`
- Ensure `connect-pg-simple` is correctly configured to use the Cloud SQL database for sessions.
- In Cloud Run, enable **Session Affinity** (sticky sessions) if using high-frequency polling, though standard stateless JWT/Session cookies are preferred.

---

## 🐳 Phase 4: Containerization & CI/CD

### 1. Dockerization
Create a production-grade `Dockerfile` using a multi-stage build:
1. **Stage 1 (Build)**: Install devDependencies, build React (`vite build`), build Server (`esbuild`).
2. **Stage 2 (Runtime)**: Minimal Node.js image, copy `dist/` and `node_modules/` (production only).

### 2. GitHub Actions Workflow
Create `.github/workflows/deploy.yml`:
- **Trigger**: On push to `main` (Prod) or `develop` (Dev).
- **Steps**:
  1. Authenticate with GCP via WIF.
  2. Build & Push Docker image to Artifact Registry.
  3. Deploy to Cloud Run with environment variables injected.

---

## 🧪 Phase 5: Verification & Launch

### 1. Smoke Testing
- Verify `/api/auth/me` returns the current user.
- Test a media upload: Upload an audio file and verify it is visible in the GCS console and playable in the app.

### 2. DNS & SSL
- Map your domain (e.g., `app.naradalms.com`) to the Cloud Run service.
- Google Cloud Run provides managed SSL (HTTPS) automatically.

---

## ⏱️ Timeline & Effort

| Phase | Duration | Difficulty |
|:---|:---|:---|
| **P1: Foundation** | 0.5 Days | Low |
| **P2: Refactoring** | 1.5 Days | Moderate |
| **P3: Database** | 0.5 Days | Moderate |
| **P4: CI/CD** | 1.0 Day | Moderate |
| **P5: Launch** | 0.5 Days | Low |

**Total Estimate**: ~4-5 Days of focused effort to reach a fully production-ready, cloud-native state.

---

> [!TIP]
> **Why do this now?**
> Doing this refactor as the "very first deployment" ensures we never build features that depend on local disk. It sets a clean standard for every developer who joins NaradaLMS from here on out.
