# Environment Variables

All environment variables required by NaradaLMS.

## Server (Express API)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | `development` | `development`, `production`, or `test` |
| `PORT` | No | `5000` | Port the API server listens on |
| `DATABASE_URL` | Yes* | — | PostgreSQL connection string |
| `PGHOST` | Yes* | `localhost` | PostgreSQL host |
| `PGPORT` | No | `5432` | PostgreSQL port |
| `PGUSER` | Yes* | — | PostgreSQL username |
| `PGPASSWORD` | Yes* | — | PostgreSQL password |
| `PGDATABASE` | Yes* | — | PostgreSQL database name |
| `JWT_SECRET` | Yes | — | Secret for signing JWT tokens |
| `JWT_EXPIRY` | No | `7d` | JWT token expiration |
| `CORS_ORIGINS` | No | `http://localhost:3000,http://localhost:3001` | Comma-separated allowed origins |
| `FRONTEND_URL` | No | `http://localhost:3000` | URL of the student portal |
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | — | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | No | — | Google OAuth callback URL |

*Either `DATABASE_URL` or individual `PG*` variables must be set.

## Student Portal (Next.js)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | — | Full URL to the API (e.g., `http://localhost:5000/api`) |

## Admin Portal (Next.js)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | — | Full URL to the API (e.g., `http://localhost:5000/api`) |
| `NEXT_PUBLIC_UPLOADS_URL` | No | — | URL for uploaded files (if different from API) |
| `API_SERVER_URL` | No | `http://localhost:5000` | Backend URL for Next.js rewrites (uploads, API proxy) |
