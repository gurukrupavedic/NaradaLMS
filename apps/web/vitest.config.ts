import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Mirrors the `@/*` -> `./*` path mapping in tsconfig.json. Without it, any test that imports
// runtime (non-type-only) code through the `@/` alias fails to resolve — type-only imports got
// erased before they ever hit the resolver, which is why this went unnoticed.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
})
