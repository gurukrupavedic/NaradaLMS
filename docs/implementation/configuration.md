# Narada LMS - Configuration Strategy

This document outlines the environment variable strategy and configuration management for Narada LMS.

## Overview

Narada LMS uses a centralized configuration pattern to:

1. Avoid hardcoded values (ports, URLs, secrets).
2. Validate critical settings at startup.
3. Provide defaults for development while enforcing strict checks in production.

## Environment Variables (.env)

| Variable | Description | Default | Required in Production |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Environment mode (`development`, `production`, `test`) | `development` | Yes |
| `PORT` | Server listener port | `5000` | No |
| `DATABASE_URL` | PostgreSQL connection string | - | Yes |
| `JWT_SECRET` | Secret for signing tokens | `change-me...` | Yes (Min 32 chars) |
| `JWT_EXPIRY` | Token lifespan | `7d` | No |
| `FRONTEND_URL` | Base URL of the client | `http://localhost:5000` | Yes |
| `UPLOAD_DIR` | Directory for file uploads | `uploads` | No |
| `MAX_FILE_SIZE` | Max upload size in bytes | `104857600` (100MB) | No |
| `GOOGLE_CLIENT_ID` | OAuth Client ID | - | No (Optional) |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret | - | No (Optional) |
| `ADMIN_EMAIL` | Designated admin account | - | No |

## Centralized Configurations

### Server Side (`server/config.ts`)

The server uses a `config` object exported from `server/config.ts`. This object performs:

- Type conversion (strings to numbers).
- Default value assignment.
- **Production Guardrails**: Throws FATAL errors if `JWT_SECRET` is insecure in production.

### Client Side (`client/src/lib/config.ts`)

The client uses `import.meta.env` to inject build-time variables.

- `apiUrl`: Defaults to `/api` for monolith/proxy setup.

## Best Practices

1. **Secrets**: Never commit `.env` files. Use `.env.example` as a template.
2. **Validation**: Add validation logic to `server/config.ts` for any new critical variables.
3. **Defaults**: Ensure the app can start with zero-config in a local development environment (using SQLite fallbacks or local Postgres defaults).
