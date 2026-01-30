#!/bin/sh

# Docker Entrypoint for Student Portal
# Injects runtime environment variables into the Next.js static build
# Enables "Build Once, Deploy Everywhere" pattern

set -e

echo "🚀 Narada LMS Student Portal - Runtime Configuration Injection"
echo "Organization: ${ORGANIZATION_ID:-slmts}"
echo "API URL: ${API_URL:-http://localhost:4000}"

# Create runtime config injection script
cat \u003c\u003cEOF \u003e /app/public/env-config.js
window.__ENV__ = {
  ORGANIZATION_ID: '${ORGANIZATION_ID:-slmts}',
  API_URL: '${API_URL:-http://localhost:4000}',
  ENABLE_DEBUG: ${ENABLE_DEBUG:-false},
  ORG_NAME: '${ORG_NAME:-}',
  ORG_LOGO_URL: '${ORG_LOGO_URL:-}'
};
EOF

echo "✅ Runtime configuration injected successfully"
echo "📂 Config file created at: /app/public/env-config.js"

# Start Next.js production server
echo "🌐 Starting Next.js server..."
exec node server.js
