import JSZip from 'jszip'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@narada/storage', () => ({ getObject: vi.fn(), putObject: vi.fn() }))

import { getObject } from '@narada/storage'
import type { Job } from 'bullmq'

import { destroyTestWorld } from '../testing/cleanup'
import {
  createChapter,
  createDocChapter,
  createDocChapterUpload,
  createSegment,
  createTestSchool,
  createTrack,
  defaultCourseId,
  type TestWorld,
} from '../testing/fixtures'
import type { ParsedHeading } from './parse'
import { docChapterQueue, enqueueParseDocSet, type ParseDocSetJobData, type ParseDocSetJobResult } from './queue'
import { getJobStatus, listDocChapters, upsertParsedHeading } from './service'
import { processParseDocSet } from './worker'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
  vi.mocked(getObject).mockReset()
})

function heading(overrides?: Partial<ParsedHeading>): ParsedHeading {
  return {
    title: 'Chapter One',
    track: 'TRACK 1',
    verses: [
      { sa: 'ॐ शुक्लांबरधरं', te: 'ఓం శుక్లాంబరధరం', en: 'om shuklambaradharam', flaggedForReview: false },
      { sa: 'सह नौ भुनक्तु', te: null, en: null, flaggedForReview: true },
    ],
    ...overrides,
  }
}

describe('upsertParsedHeading (service)', () => {
  it('creates a fresh doc chapter with its segments and per-script text', async () => {
    world = await createTestSchool()
    const courseId = await defaultCourseId(world)

    const upserted = await upsertParsedHeading(
      { db: world.schoolDb, schoolId: world.orgId },
      { courseId, sourceUploadId: (await createDocChapterUpload(world)).id, heading: heading() },
    )

    expect(upserted).toBe(true)
    const items = await listDocChapters({ db: world.schoolDb, schoolId: world.orgId }, courseId)
    expect(items).toEqual([
      { id: expect.any(String), title: 'Chapter One', track: 'TRACK 1', verseCount: 2, assignedCount: 0 },
    ])
  })

  it('replaces an existing doc chapter\'s segments when none are assigned yet', async () => {
    world = await createTestSchool()
    const docChapterRow = await createDocChapter(world, { title: 'Chapter One' })
    const courseId = await defaultCourseId(world)
    await createSegment(world, docChapterRow, { order: 1 })

    const upserted = await upsertParsedHeading(
      { db: world.schoolDb, schoolId: world.orgId },
      { courseId, sourceUploadId: (await createDocChapterUpload(world)).id, heading: heading() },
    )

    expect(upserted).toBe(true)
    const items = await listDocChapters({ db: world.schoolDb, schoolId: world.orgId }, courseId)
    // The stale, unassigned segment created above is gone — replaced wholesale by the 2 fresh ones.
    expect(items).toEqual([
      { id: docChapterRow.id, title: 'Chapter One', track: 'TRACK 1', verseCount: 2, assignedCount: 0 },
    ])
  })

  it('leaves an in-progress doc chapter untouched when any segment is already assigned', async () => {
    world = await createTestSchool()
    const docChapterRow = await createDocChapter(world, { title: 'Chapter One' })
    const courseId = await defaultCourseId(world)
    const trackRow = await createTrack(world)
    const chapterRow = await createChapter(world, trackRow)
    await createSegment(world, docChapterRow, { order: 1, chapter: chapterRow })

    const upserted = await upsertParsedHeading(
      { db: world.schoolDb, schoolId: world.orgId },
      { courseId, sourceUploadId: (await createDocChapterUpload(world)).id, heading: heading() },
    )

    expect(upserted).toBe(false)
    const items = await listDocChapters({ db: world.schoolDb, schoolId: world.orgId }, courseId)
    expect(items).toEqual([
      { id: docChapterRow.id, title: 'Chapter One', track: 'TRACK 1', verseCount: 1, assignedCount: 1 },
    ])
  })
})

describe('listDocChapters (service)', () => {
  it('filters by title/track substring, case-insensitively', async () => {
    world = await createTestSchool()
    await createDocChapter(world, { title: 'Vishnu Sahasranama', track: 'TRACK 1' })
    await createDocChapter(world, { title: 'Lalita Sahasranama', track: 'TRACK 2' })
    const courseId = await defaultCourseId(world)

    const items = await listDocChapters({ db: world.schoolDb, schoolId: world.orgId }, courseId, 'vishnu')

    expect(items.map(i => i.title)).toEqual(['Vishnu Sahasranama'])
  })
})

describe('enqueueParseDocSet / getJobStatus', () => {
  afterEach(async () => {
    // Keep the shared local/CI Redis clean between runs — jobs aren't tied to a test school, so
    // nothing else cleans them up.
    const jobs = await docChapterQueue.getJobs(['waiting', 'active', 'completed', 'failed'])
    await Promise.all(jobs.map(job => job.remove()))
  })

  it('collapses a second enqueue for the same, still-waiting course into the same job', async () => {
    const courseId = crypto.randomUUID()
    const data: ParseDocSetJobData = { schoolId: 'school-1', courseId }

    const first = await enqueueParseDocSet(data)
    const second = await enqueueParseDocSet(data)

    expect(second.id).toBe(first.id)
  })

  it('reports a freshly enqueued job as queued', async () => {
    world = await createTestSchool()
    const courseId = await defaultCourseId(world)
    const job = await enqueueParseDocSet({ schoolId: world.orgId, courseId })

    await expect(
      getJobStatus({ db: world.schoolDb, schoolId: world.orgId }, courseId, job.id!),
    ).resolves.toMatchObject({ status: 'queued', progress: 0, result: null })
  })

  it('404s a job belonging to a different course', async () => {
    world = await createTestSchool()
    const courseId = await defaultCourseId(world)
    const job = await enqueueParseDocSet({ schoolId: world.orgId, courseId: crypto.randomUUID() })

    await expect(
      getJobStatus({ db: world.schoolDb, schoolId: world.orgId }, courseId, job.id!),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('404s an unknown job id', async () => {
    world = await createTestSchool()
    const courseId = await defaultCourseId(world)

    await expect(
      getJobStatus({ db: world.schoolDb, schoolId: world.orgId }, courseId, 'does-not-exist'),
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('processParseDocSet (worker)', () => {
  it('fetches the 3 source documents from R2, parses, and upserts each heading', async () => {
    world = await createTestSchool()
    const courseId = await defaultCourseId(world)
    const upload = await createDocChapterUpload(world)

    const sa = await buildTestDocx([
      paragraph('Heading1', 'TRACK 1'),
      paragraph('Heading2', 'Chapter One'),
      paragraph(null, 'ॐ शुक्लांबरधरं विष्णुं शशिवर्णं ||1'),
    ])
    const te = await buildTestDocx([
      paragraph('Heading1', 'TRACK 1'),
      paragraph('Heading2', 'Chapter One'),
      paragraph(null, 'ఓం శుక్లాంబరధరం విష్ణుం శశివర్ణం ||1'),
    ])
    const en = await buildTestDocx([
      paragraph('Heading1', 'TRACK 1'),
      paragraph('Heading2', 'Chapter One'),
      paragraph(null, 'om shuklambaradharam vishnum shashivarnam ||1'),
    ])

    vi.mocked(getObject).mockImplementation(async (key: string) => {
      if (key === upload.saObjectKey) return sa
      if (key === upload.teObjectKey) return te
      if (key === upload.enObjectKey) return en
      throw new Error(`unexpected object key: ${key}`)
    })

    const updateProgress = vi.fn()
    const job = {
      data: { schoolId: world.orgId, courseId },
      updateProgress,
    } as unknown as Job<ParseDocSetJobData, ParseDocSetJobResult>

    const result = await processParseDocSet(job)

    expect(result).toEqual({ headingsUpserted: 1, headingsSkipped: 0 })
    expect(updateProgress).toHaveBeenCalledWith(100)

    const items = await listDocChapters({ db: world.schoolDb, schoolId: world.orgId }, courseId)
    expect(items).toEqual([
      { id: expect.any(String), title: 'Chapter One', track: 'TRACK 1', verseCount: 1, assignedCount: 0 },
    ])
  })

  it('processes the course\'s latest upload even though the job payload names no specific upload', async () => {
    world = await createTestSchool()
    const courseId = await defaultCourseId(world)
    // The scenario `queue.ts::enqueueParseDocSet`'s doc comment describes: an earlier upload
    // exists (imagine its job is still sitting "waiting" when this one lands) — the worker must
    // still process the LATEST upload, never the earlier one, regardless of which job triggered it.
    await createDocChapterUpload(world)
    const latestUpload = await createDocChapterUpload(world)

    const sa = await buildTestDocx([
      paragraph('Heading1', 'TRACK 1'),
      paragraph('Heading2', 'Chapter One'),
      paragraph(null, 'ॐ शुक्लांबरधरं ||1'),
    ])
    const te = await buildTestDocx([
      paragraph('Heading1', 'TRACK 1'),
      paragraph('Heading2', 'Chapter One'),
      paragraph(null, 'ఓం శుక్లాంబరధరం ||1'),
    ])
    const en = await buildTestDocx([
      paragraph('Heading1', 'TRACK 1'),
      paragraph('Heading2', 'Chapter One'),
      paragraph(null, 'om shuklambaradharam ||1'),
    ])

    vi.mocked(getObject).mockImplementation(async (key: string) => {
      if (key === latestUpload.saObjectKey) return sa
      if (key === latestUpload.teObjectKey) return te
      if (key === latestUpload.enObjectKey) return en
      throw new Error(`fetched an object key from the earlier, non-latest upload: ${key}`)
    })

    const job = {
      data: { schoolId: world.orgId, courseId },
      updateProgress: vi.fn(),
    } as unknown as Job<ParseDocSetJobData, ParseDocSetJobResult>

    await expect(processParseDocSet(job)).resolves.toEqual({ headingsUpserted: 1, headingsSkipped: 0 })
  })
})

function paragraph(styleId: string | null, text: string): string {
  const style = styleId ? `<w:pPr><w:pStyle w:val="${styleId}"/></w:pPr>` : ''
  return `<w:p>${style}<w:r><w:t>${text}</w:t></w:r></w:p>`
}

async function buildTestDocx(paragraphsXml: string[]): Promise<Buffer> {
  const zip = new JSZip()
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
      `<w:body>${paragraphsXml.join('')}</w:body></w:document>`,
  )
  return zip.generateAsync({ type: 'nodebuffer' })
}
