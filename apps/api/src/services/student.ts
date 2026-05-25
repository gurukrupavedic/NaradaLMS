import { and, asc, eq } from 'drizzle-orm'

import { batch, enrollment, evaluation, segment, type Database } from '@narada/db'

type DbEvaluation = typeof evaluation.$inferSelect

export type StudentChapter = {
  id: string
  trackId: string
  code: string
  title: string
  status: 'draft' | 'published'
  order: number
  script: 'te' | 'sa' | 'en' | null
  textUrl: string | null
  segments: Array<{ id: string; chapterId: string; start: number; end: number }>
  audioAssets: Array<{
    id: string
    chapterId: string
    label: string | null
    url: string
    duration: number
    audioMappings: Array<{
      segmentId: string
      audioAssetId: string
      audioStart: number
      audioEnd: number
    }>
  }>
  currentLevel: DbEvaluation['level'] | null
}

export default class StudentService {
  public static async getChapter(
    db: Database,
    userId: string,
    chapterId: string,
  ): Promise<StudentChapter | undefined> {
    const chapterRow = await db.query.chapter.findFirst({
      where: (t, { and, eq }) => and(eq(t.id, chapterId), eq(t.status, 'published')),
      with: {
        segments: { orderBy: asc(segment.start) },
        audioAssets: { with: { audioMappings: true } },
      },
    })

    if (!chapterRow) {
      return undefined
    }

    const access = await db
      .select({ userId: enrollment.userId })
      .from(enrollment)
      .innerJoin(batch, eq(enrollment.batchId, batch.id))
      .where(
        and(
          eq(enrollment.userId, userId),
          eq(enrollment.status, 'active'),
          eq(batch.trackId, chapterRow.trackId),
        ),
      )
      .limit(1)

    if (access.length === 0) {
      return undefined
    }

    const latestEval = await db.query.evaluation.findFirst({
      where: (t, { and, eq }) => and(eq(t.studentId, userId), eq(t.chapterId, chapterId)),
      orderBy: (t, { desc }) => desc(t.evaluatedAt),
    })

    return {
      id: chapterRow.id,
      trackId: chapterRow.trackId,
      code: chapterRow.code,
      title: chapterRow.title,
      status: chapterRow.status,
      order: chapterRow.order,
      script: chapterRow.script,
      textUrl: chapterRow.textUrl,
      segments: chapterRow.segments.map(s => ({
        id: s.id,
        chapterId: s.chapterId,
        start: s.start,
        end: s.end,
      })),
      audioAssets: chapterRow.audioAssets.map(a => ({
        id: a.id,
        chapterId: a.chapterId,
        label: a.label,
        url: a.url,
        duration: a.duration,
        audioMappings: a.audioMappings.map(m => ({
          segmentId: m.segmentId,
          audioAssetId: m.audioAssetId,
          audioStart: m.audioStart,
          audioEnd: m.audioEnd,
        })),
      })),
      currentLevel: latestEval?.level ?? null,
    }
  }
}
