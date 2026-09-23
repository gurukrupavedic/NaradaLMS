import path from 'node:path'

import { defineConfig } from 'vitest/config'

// Pure-logic tests only (no DOM, no Next runtime): the modules under lib/ that are deliberately
// dependency-free so they can be tested here — see lib/course-host.ts. The `@` alias mirrors
// tsconfig.json's own `@/*: ["./*"]` so a tested module's `@/...` imports resolve the same way
// they do for `tsc`/Next, without pulling in a bundler-specific config-loading plugin.
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname) } },
  test: { include: ['lib/**/*.test.ts'] },
})
