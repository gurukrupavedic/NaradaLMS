import { and, eq, inArray, max, min, sql } from 'drizzle-orm'
import { chapter, type SchoolDb } from '@narada/db'

import type { ContentReadView } from '../utils/accessPolicy'

/**
 * The chapter row plus its content, nested exactly as `chapters/service.ts::findById` needs to
 * reshape it — draft-chapter gating needs no extra work here: scripts/audio only exist as children
 * of a chapter row, so a `where` clause that already excludes a draft chapter for `learnerPreview`
 * means its content is never fetched at all, not merely hidden.
 */
export async function findById(db: SchoolDb, id: string, view: ContentReadView) {
  return db.query.chapter.findFirst({
    where: (t, { and, eq }) =>
      view.kind === 'authoring' ? eq(t.id, id) : and(eq(t.id, id), eq(t.status, 'published')),
    with: {
      scripts: {
        orderBy: (s, { asc }) => asc(s.order),
        with: { scriptSegments: { with: { segment: true } } },
      },
      audioAssets: {
        orderBy: (a, { asc }) => asc(a.order),
        with: { audioMappings: { orderBy: (m, { asc }) => asc(m.audioStart) } },
      },
    },
  })
}

/** The course a chapter belongs to (through its track), or `undefined` if there is no such chapter — for the content gate. */
export async function findCourseId(db: SchoolDb, chapterId: string): Promise<string | undefined> {
  const row = await db.query.chapter.findFirst({
    where: (t, { eq }) => eq(t.id, chapterId),
    columns: {},
    with: { track: { columns: { courseId: true } } },
  })

  return row?.track.courseId
}

// ── Chapter catalog management (title/order/status/archive) ────────────────

/** One past the highest `order` among this track's active (non-archived) chapters — where a newly created or restored chapter goes. */
export async function nextChapterOrder(db: SchoolDb, trackId: string): Promise<number> {
  const rows = await db
    .select({ max: max(chapter.order) })
    .from(chapter)
    .where(and(eq(chapter.trackId, trackId), eq(chapter.archived, false)))
  return (rows[0]?.max ?? -1) + 1
}

/**
 * One below the lowest `order` in the track, across every row (active or already archived) — so
 * archiving permanently drops a chapter out of the active ordering range and can never collide
 * with a future active chapter's `order`. See `chapters/service.ts::updateChapter`'s doc comment.
 */
export async function nextArchivedOrder(db: SchoolDb, trackId: string): Promise<number> {
  const rows = await db.select({ min: min(chapter.order) }).from(chapter).where(eq(chapter.trackId, trackId))
  return (rows[0]?.min ?? 0) - 1
}

export async function insertChapter(
  db: SchoolDb,
  data: { trackId: string; code: string; title: string; order: number },
) {
  const rows = await db
    .insert(chapter)
    .values({ ...data, status: 'draft', script: null, archived: false })
    .returning()
  return rows[0]
}

export async function updateChapterRow(
  db: SchoolDb,
  id: string,
  data: Partial<{ code: string; title: string; script: 'te' | 'sa' | 'en' | null; status: 'draft' | 'published'; archived: boolean; order: number }>,
) {
  const rows = await db.update(chapter).set(data).where(eq(chapter.id, id)).returning()
  return rows[0]
}

export async function findChapterRowById(db: SchoolDb, id: string) {
  return db.query.chapter.findFirst({ where: (t, { eq }) => eq(t.id, id) })
}

/** `chapterId -> trackId` for whichever of `chapterIds` exist (absent ids simply aren't in the map). */
export async function findTrackIdsByChapterId(db: SchoolDb, chapterIds: string[]): Promise<Map<string, string>> {
  if (chapterIds.length === 0) {
    return new Map()
  }

  const rows = await db
    .select({ id: chapter.id, trackId: chapter.trackId })
    .from(chapter)
    .where(inArray(chapter.id, chapterIds))
  return new Map(rows.map(row => [row.id, row.trackId]))
}

export async function findActiveChapterIds(db: SchoolDb, trackId: string): Promise<string[]> {
  const rows = await db
    .select({ id: chapter.id })
    .from(chapter)
    .where(and(eq(chapter.trackId, trackId), eq(chapter.archived, false)))
  return rows.map(r => r.id)
}

/**
 * Reassigns every id in `orderedIds` to its index as the new `order`, in one transaction, via a
 * temp-offset two-phase update — a single UPDATE across multiple rows isn't reliably safe against
 * a plain (non-deferrable) unique index in Postgres (a mid-statement transient collision is a real
 * gotcha, not hypothetical), and converting `chapter_trackId_order_uidx` to a deferrable
 * constraint would drift from what Drizzle's schema builder models. `1_000_000 + index` is a temp
 * range no realistic track's active chapters, and no archived chapter's negative `order`
 * (`nextArchivedOrder` above), could ever reach.
 */
export async function reorderChapters(db: SchoolDb, orderedIds: string[]): Promise<void> {
  if (orderedIds.length === 0) {
    return
  }

  // Each phase is one UPDATE, safe against the unique index because its targets are disjoint from
  // every order the rows hold going into it: phase 1 moves into the temp range, phase 2 out of it.
  for (const offset of [1_000_000, 0]) {
    const cases = sql.join(
      orderedIds.map((id, index) => sql`when ${id}::uuid then ${offset + index}::int`),
      sql` `,
    )
    await db
      .update(chapter)
      .set({ order: sql`case ${chapter.id} ${cases} end` })
      .where(inArray(chapter.id, orderedIds))
  }
}
