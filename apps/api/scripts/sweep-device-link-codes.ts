import '@narada/env/load'
import { shutdownPools } from '@narada/db'
import { sweepExpiredDeviceLinkCodes } from '@narada/auth'

/**
 * Expires every `pending`/`approved` `deviceLinkCode` row past its `expiresAt` — a code nobody
 * ever finished with (never approved, or approved but the new device never polled again) sits
 * there forever with nothing else to revisit it (see
 * `packages/auth/src/plugins/device-link.ts::sweepExpiredDeviceLinkCodes`'s own doc comment).
 * Lives in the shared public schema, so unlike `sweep-staged-uploads.ts` there's no per-school
 * loop. No scheduler exists in this repo yet; run manually or wire up to one externally (Railway
 * cron, a GH Actions `schedule:` workflow):
 *   pnpm --filter @narada/api exec tsx scripts/sweep-device-link-codes.ts
 */
async function main() {
  const count = await sweepExpiredDeviceLinkCodes()
  console.log(`done — ${count} expired device link code(s) swept`)
  await shutdownPools()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
