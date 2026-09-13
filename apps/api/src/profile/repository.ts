import type { PublicDb } from '@narada/db'

export async function findMembershipsForUser(db: PublicDb, userId: string) {
  return db.query.member.findMany({
    where: (t, { eq }) => eq(t.userId, userId),
    with: { organization: true },
  })
}
