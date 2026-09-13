import '@narada/env/load'
import { getSchoolDb, publicDb, shutdownPools } from '@narada/db'

import { sweepExpiredStagedUploads } from '../src/chapters/service'

/**
 * Expires every `pending` `stagedUpload` row past its `expiresAt` and best-effort deletes its R2
 * object, across every school — a client that abandons an audio upload (closed tab, crash) never
 * calls the confirm endpoint, so nothing else ever revisits that row (see
 * `chapters/service.ts::sweepExpiredStagedUploads`'s own doc comment). No scheduler exists in this
 * repo yet; run manually or wire up to one externally (Railway cron, a GH Actions `schedule:`
 * workflow):
 *   pnpm --filter @narada/api exec tsx scripts/sweep-staged-uploads.ts
 */
async function main() {
  const orgs = await publicDb.query.organization.findMany({ columns: { id: true, slug: true } })

  let total = 0
  for (const org of orgs) {
    const count = await sweepExpiredStagedUploads({ db: getSchoolDb(org.id) })
    if (count > 0) console.log(`${org.slug}: swept ${count} expired staged upload(s)`)
    total += count
  }

  console.log(`done — ${total} expired staged upload(s) swept across ${orgs.length} school(s)`)
  await shutdownPools()
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
