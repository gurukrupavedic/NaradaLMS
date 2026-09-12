import { config } from 'dotenv'

// In production, variables are injected by the platform
// and therefore, no .env file is needed.
//
// `override: true` because dotenv's default is to leave an already-set process.env value alone —
// which in dev means a value stuck in the launching shell/IDE's environment silently wins over
// this file forever, no matter how many times it's edited, with no indication why. This file is
// the checked-in source of truth for dev; nothing legitimate should be shadowing it here.
if (process.env.NODE_ENV !== 'production') {
  config({ path: new URL('../.env', import.meta.url), quiet: true, override: true })
}
