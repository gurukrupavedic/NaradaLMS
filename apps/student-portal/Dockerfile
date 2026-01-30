# Multi-stage Dockerfile for Student Portal
# Enables "Build Once, Deploy Everywhere" with runtime environment injection

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy workspace configuration
COPY package.json package-lock.json ./
COPY packages/ui/package.json ./packages/ui/
COPY packages/types/package.json ./packages/types/
COPY packages/database/package.json ./packages/database/
COPY apps/student-portal/package.json ./apps/student-portal/

# Install dependencies
RUN npm ci --legacy-peer-deps

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/student-portal/node_modules ./apps/student-portal/node_modules

# Copy workspace packages
COPY packages ./packages
COPY apps/student-portal ./apps/student-portal
COPY turbo.json .

# Build the application
WORKDIR /app/apps/student-portal
RUN npm run build

# Stage 3: Runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/apps/student-portal/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/student-portal/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/student-portal/.next/static ./.next/static

# Copy entrypoint script
COPY --chmod=755 apps/student-portal/entrypoint.sh ./entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./entrypoint.sh"]
