# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# ---- Install dependencies ----
FROM base AS deps
WORKDIR /repo

# Copy manifests for all workspace members to get a correct lockfile install.
# Source is excluded here so dependency layers are cached independently of code changes.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/api/package.json     apps/api/package.json
COPY apps/web/package.json     apps/web/package.json
COPY packages/auth/package.json    packages/auth/package.json
COPY packages/db/package.json      packages/db/package.json
COPY packages/env/package.json     packages/env/package.json
COPY packages/storage/package.json packages/storage/package.json
COPY tools/package.json            tools/package.json

RUN pnpm install --frozen-lockfile

# ---- Runtime image ----
# Extends deps so node_modules are already in place.
FROM deps AS runner

COPY apps/api  apps/api
COPY packages  packages

WORKDIR /repo/apps/api
EXPOSE 3000

# Workspace packages export raw TypeScript (no precompile), so we use tsx at runtime.
CMD ["pnpm", "exec", "tsx", "src/index.ts"]
