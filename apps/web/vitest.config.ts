import { defineConfig } from 'vitest/config'

// Pure-logic tests only (no DOM, no Next runtime): the modules under lib/ that are deliberately
// dependency-free so they can be tested here — see lib/course-host.ts.
export default defineConfig({
  test: { include: ['lib/**/*.test.ts'] },
})
