import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'

import { chapter } from '@narada/db'

import { destroyTestWorld } from '../testing/cleanup'
import {
  createBatch,
  createChapter,
  createProfile,
  createRegistration,
  createTestSchool,
  createTrack,
  enroll,
  type TestWorld,
} from '../testing/fixtures'
import * as repository from './repository'
import { search } from './service'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

describe('search repository', () => {
  it('searchBatches matches by case-insensitive substring of code', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const match = await createBatch(world, trackRow, { code: 'VED-01-2026-BR-1' })
    await createBatch(world, trackRow, { code: 'SAN-02-2026-BR-1' })

    const results = await repository.searchBatches(world.schoolDb, 'ved-01', { kind: 'all' })

    expect(results.map(r => r.id)).toEqual([match.id])
    expect(results[0]?.track.name).toBe(trackRow.name)
  })

  it("searchBatches scoped to 'enrolled' only matches a batch the scope's profileId is in", async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const myBatch = await createBatch(world, trackRow, { code: 'VED-01-2026-BR-1' })
    const otherBatch = await createBatch(world, trackRow, { code: 'VED-02-2026-BR-1' })
    const me = await createProfile(world)
    await enroll(world, me, myBatch, 'student')

    const results = await repository.searchBatches(world.schoolDb, 'VED', {
      kind: 'enrolled',
      profileId: me.id,
    })

    expect(results.map(r => r.id)).toEqual([myBatch.id])
    expect(results.map(r => r.id)).not.toContain(otherBatch.id)
  })

  it('searchTracks matches by case-insensitive substring of name', async () => {
    world = await createTestSchool()
    const match = await createTrack(world, { name: 'Bhagavad Gita' })
    await createTrack(world, { name: 'Ramayana' })

    const results = await repository.searchTracks(world.schoolDb, 'gita')

    expect(results.map(r => r.id)).toEqual([match.id])
  })

  it('searchChapters matches by title or code, and never returns an archived chapter', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world, { name: 'Bhagavad Gita' })
    const byTitle = await createChapter(world, trackRow, {
      title: 'Chapter One',
      code: 'ch-1',
      status: 'published',
    })
    const byCode = await createChapter(world, trackRow, {
      title: 'Something Else',
      code: 'unique-code-2',
      status: 'published',
    })
    const archived = await createChapter(world, trackRow, {
      title: 'Archived Chapter',
      status: 'published',
    })
    await world.schoolDb.update(chapter).set({ archived: true }).where(eq(chapter.id, archived.id))

    const view = { kind: 'authoring' } as const
    const byTitleResults = await repository.searchChapters(world.schoolDb, 'chapter one', view)
    expect(byTitleResults.map(r => r.id)).toEqual([byTitle.id])

    const byCodeResults = await repository.searchChapters(world.schoolDb, 'unique-code-2', view)
    expect(byCodeResults.map(r => r.id)).toEqual([byCode.id])

    const archivedResults = await repository.searchChapters(world.schoolDb, 'archived', view)
    expect(archivedResults.map(r => r.id)).not.toContain(archived.id)
  })

  it('searchChapters in learnerPreview never returns a draft chapter, but authoring does', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const draft = await createChapter(world, trackRow, { title: 'Draft Chapter', status: 'draft' })
    const published = await createChapter(world, trackRow, {
      title: 'Published Chapter',
      status: 'published',
    })

    const learnerResults = await repository.searchChapters(world.schoolDb, 'chapter', {
      kind: 'learnerPreview',
    })
    expect(learnerResults.map(r => r.id)).toEqual([published.id])

    const authoringResults = await repository.searchChapters(world.schoolDb, 'chapter', {
      kind: 'authoring',
    })
    expect(authoringResults.map(r => r.id).sort()).toEqual([draft.id, published.id].sort())
  })

  it('searchRegistrations matches by first name, last name, or email', async () => {
    world = await createTestSchool()
    const match = await createRegistration(world, {
      firstName: 'Ravi',
      lastName: 'Kumar',
      email: 'ravi@example.com',
    })
    await createRegistration(world, { firstName: 'Someone', lastName: 'Else' })

    expect((await repository.searchRegistrations(world.schoolDb, 'ravi')).map(r => r.id)).toEqual([
      match.id,
    ])
    expect((await repository.searchRegistrations(world.schoolDb, 'kumar')).map(r => r.id)).toEqual([
      match.id,
    ])
    expect(
      (await repository.searchRegistrations(world.schoolDb, 'ravi@example')).map(r => r.id),
    ).toEqual([match.id])
  })

  it('matches every word of a multi-word query regardless of order (tokenMatch)', async () => {
    world = await createTestSchool()
    const track1 = await createTrack(world, { name: 'Track 1' })
    await createTrack(world, { name: 'Track 2' })
    const batchRow = await createBatch(world, track1, { code: 'VED-01-2026-BR-1' })
    const chapterRow = await createChapter(world, track1, {
      title: 'Bhagavad Gita',
      code: 'ch-9',
      status: 'published',
    })
    const registrationRow = await createRegistration(world, {
      firstName: 'Ravi',
      lastName: 'Kumar',
    })

    // "1 track" is not a substring of "Track 1" — a plain `ilike('%1 track%')` would miss this
    // exactly the way the command palette's users hit in practice (see PR discussion).
    expect((await repository.searchTracks(world.schoolDb, '1 track')).map(r => r.id)).toEqual([
      track1.id,
    ])
    expect(
      (await repository.searchBatches(world.schoolDb, '2026 ved br', { kind: 'all' })).map(
        r => r.id,
      ),
    ).toEqual([batchRow.id])
    expect(
      (await repository.searchChapters(world.schoolDb, 'gita bhagavad', { kind: 'authoring' })).map(
        r => r.id,
      ),
    ).toEqual([chapterRow.id])
    expect(
      (await repository.searchRegistrations(world.schoolDb, 'kumar ravi')).map(r => r.id),
    ).toEqual([registrationRow.id])
  })
})

describe('search service', () => {
  it('an admin scope fans out across every category and shapes each result for the command palette', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world, { name: 'Narada Track' })
    const batchRow = await createBatch(world, trackRow, { code: 'narada-batch' })
    const chapterRow = await createChapter(world, trackRow, {
      title: 'Narada Chapter',
      code: 'narada-chapter',
    })
    const profileRow = await createProfile(world, { name: 'Narada Student' })
    const registrationRow = await createRegistration(world, {
      firstName: 'Narada',
      lastName: 'Applicant',
    })
    const school = { id: world.orgId } as Parameters<typeof search>[0]['school']
    const user = { id: 'searcher', isSuperAdmin: false } as Parameters<typeof search>[0]['user']
    const adminScope = {
      batches: { kind: 'all' as const },
      content: { kind: 'authoring' as const },
      canReviewRegistrations: true,
    }

    const results = await search({ db: world.schoolDb, school, user }, { q: 'narada' }, adminScope)
    const byKind = Object.fromEntries(results.map(r => [r.kind, r]))

    expect(byKind.student).toMatchObject({ id: profileRow.id, code: null, title: 'Narada Student' })
    expect(byKind.batch).toMatchObject({
      id: batchRow.id,
      code: 'narada-batch',
      title: 'narada-batch',
      subtitle: 'Narada Track',
    })
    expect(byKind.track).toMatchObject({ id: trackRow.id, code: null, title: 'Narada Track' })
    expect(byKind.chapter).toMatchObject({
      id: chapterRow.id,
      code: 'narada-chapter',
      title: 'Narada Chapter',
      subtitle: 'Narada Track',
    })
    expect(byKind.registration).toMatchObject({
      id: registrationRow.id,
      code: null,
      title: 'Narada Applicant',
    })
  })

  it('a plain member scope only sees their own batchmates/batches, published chapters, and never registrations', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world, { name: 'Narada Track' })
    const myBatch = await createBatch(world, trackRow, { code: 'narada-my-batch' })
    const otherBatch = await createBatch(world, trackRow, { code: 'narada-other-batch' })
    const draftChapter = await createChapter(world, trackRow, {
      title: 'Narada Draft',
      status: 'draft',
    })
    const publishedChapter = await createChapter(world, trackRow, {
      title: 'Narada Published',
      status: 'published',
    })
    const me = await createProfile(world, { name: 'Narada Me' })
    const stranger = await createProfile(world, { name: 'Narada Stranger' })
    await enroll(world, me, myBatch, 'student')
    await enroll(world, stranger, otherBatch, 'student')
    await createRegistration(world, { firstName: 'Narada', lastName: 'Applicant' })

    const school = { id: world.orgId } as Parameters<typeof search>[0]['school']
    const user = { id: 'searcher', isSuperAdmin: false } as Parameters<typeof search>[0]['user']
    const memberScope = {
      batches: { kind: 'enrolled' as const, profileId: me.id },
      content: { kind: 'learnerPreview' as const },
      canReviewRegistrations: false,
    }

    const results = await search({ db: world.schoolDb, school, user }, { q: 'narada' }, memberScope)
    const byKind = new Map<string, typeof results>()
    for (const result of results) {
      byKind.set(result.kind, [...(byKind.get(result.kind) ?? []), result])
    }

    expect((byKind.get('student') ?? []).map(r => r.id)).toEqual([me.id])
    expect((byKind.get('student') ?? []).map(r => r.id)).not.toContain(stranger.id)
    expect((byKind.get('batch') ?? []).map(r => r.id)).toEqual([myBatch.id])
    expect((byKind.get('batch') ?? []).map(r => r.id)).not.toContain(otherBatch.id)
    expect((byKind.get('chapter') ?? []).map(r => r.id)).toEqual([publishedChapter.id])
    expect((byKind.get('chapter') ?? []).map(r => r.id)).not.toContain(draftChapter.id)
    expect(byKind.get('registration') ?? []).toHaveLength(0)
    // Tracks are unscoped by design — every member already sees every track name regardless of
    // enrollment (see `repository.ts::searchTracks`'s own doc comment).
    expect((byKind.get('track') ?? []).map(r => r.id)).toEqual([trackRow.id])
  })
})
