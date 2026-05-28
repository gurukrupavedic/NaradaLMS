import { and, asc, eq } from 'drizzle-orm'

import {
  audioAsset,
  audioMapping,
  batch,
  chapter,
  enrollment,
  evaluation,
  segment,
  type SchoolDatabase,
} from '@narada/db'
import { objectLifecycle } from './objectLifecycle'

type DbChapter = typeof chapter.$inferSelect
type DbAudioAsset = typeof audioAsset.$inferSelect
type DbAudioMapping = typeof audioMapping.$inferSelect
type DbEvaluation = typeof evaluation.$inferSelect

export type ChapterReadView =
  | { kind: 'authoring' }
  | { kind: 'learnerPreview' }
  | { kind: 'student'; studentId: string }

export type Chapter = Omit<DbChapter, 'textObjectKey'> & { textUrl: string | null }
export type Segment = typeof segment.$inferSelect
export type AudioMapping = DbAudioMapping
export type AudioAsset = Omit<DbAudioAsset, 'objectKey'> & {
  url: string
  audioMappings: AudioMapping[]
}

export type ChapterDetail = Chapter & {
  segments: Segment[]
  audioAssets: AudioAsset[]
}

export type StudentChapterDetail = ChapterDetail & {
  currentLevel: DbEvaluation['level'] | null
}

type ChapterContentRow = DbChapter & {
  segments: Segment[]
  audioAssets: Array<DbAudioAsset & { audioMappings: DbAudioMapping[] }>
}

function canReadDrafts(view: ChapterReadView): boolean {
  return view.kind === 'authoring'
}

async function studentCanReadTrack(
  db: SchoolDatabase,
  studentId: string,
  trackId: string,
): Promise<boolean> {
  const access = await db
    .select({ userId: enrollment.userId })
    .from(enrollment)
    .innerJoin(batch, eq(enrollment.batchId, batch.id))
    .where(
      and(
        eq(enrollment.userId, studentId),
        eq(enrollment.status, 'active'),
        eq(batch.trackId, trackId),
      ),
    )
    .limit(1)

  return access.length > 0
}

export async function chapterResponse(row: DbChapter): Promise<Chapter> {
  return {
    id: row.id,
    trackId: row.trackId,
    code: row.code,
    title: row.title,
    status: row.status,
    order: row.order,
    script: row.script,
    textUrl: row.textObjectKey ? await objectLifecycle.urlFor(row.textObjectKey) : null,
  }
}

async function audioAssetResponse(
  row: DbAudioAsset & { audioMappings: DbAudioMapping[] },
): Promise<AudioAsset> {
  return {
    id: row.id,
    chapterId: row.chapterId,
    label: row.label,
    url: await objectLifecycle.urlFor(row.objectKey),
    duration: row.duration,
    audioMappings: row.audioMappings,
  }
}

async function detailResponse(row: ChapterContentRow): Promise<ChapterDetail> {
  return {
    ...(await chapterResponse(row)),
    segments: row.segments,
    audioAssets: await Promise.all(row.audioAssets.map(audioAssetResponse)),
  }
}

export default class ChapterReader {
  public static async findById(
    db: SchoolDatabase,
    chapterId: string,
    view: ChapterReadView,
  ): Promise<ChapterDetail | StudentChapterDetail | undefined> {
    const row = await db.query.chapter.findFirst({
      where: (t, { and: a, eq: e }) =>
        canReadDrafts(view) ? e(t.id, chapterId) : a(e(t.id, chapterId), e(t.status, 'published')),
      with: {
        segments: { orderBy: asc(segment.start) },
        audioAssets: { with: { audioMappings: true } },
      },
    })

    if (!row) return undefined
    if (view.kind === 'student') {
      const { studentId } = view
      const canRead = await studentCanReadTrack(db, studentId, row.trackId)
      if (!canRead) return undefined

      const latestEval = await db.query.evaluation.findFirst({
        where: (t, { and: a, eq: e }) => a(e(t.studentId, studentId), e(t.chapterId, chapterId)),
        orderBy: (t, { desc }) => desc(t.evaluatedAt),
      })

      return {
        ...(await detailResponse(row)),
        currentLevel: latestEval?.level ?? null,
      }
    }

    return detailResponse(row)
  }

  public static async findSegmentsByChapter(
    db: SchoolDatabase,
    chapterId: string,
    view: ChapterReadView,
  ): Promise<Segment[] | undefined> {
    const row = await db.query.chapter.findFirst({
      where: (t, { and: a, eq: e }) =>
        canReadDrafts(view) ? e(t.id, chapterId) : a(e(t.id, chapterId), e(t.status, 'published')),
      with: {
        segments: { orderBy: asc(segment.start) },
      },
    })

    if (!row) return undefined
    if (view.kind === 'student') {
      const canRead = await studentCanReadTrack(db, view.studentId, row.trackId)
      if (!canRead) return undefined
    }

    return row.segments
  }
}
