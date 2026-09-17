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

    const results = await repository.searchBatches(world.schoolDb, 'ved-01')

    expect(results.map(r => r.id)).toEqual([match.id])
    expect(results[0]?.track.name).toBe(trackRow.name)
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
    const byTitle = await createChapter(world, trackRow, { title: 'Chapter One', code: 'ch-1' })
    const byCode = await createChapter(world, trackRow, {
      title: 'Something Else',
      code: 'unique-code-2',
    })
    const archived = await createChapter(world, trackRow, { title: 'Archived Chapter' })
    await world.schoolDb.update(chapter).set({ archived: true }).where(eq(chapter.id, archived.id))

    const byTitleResults = await repository.searchChapters(world.schoolDb, 'chapter one')
    expect(byTitleResults.map(r => r.id)).toEqual([byTitle.id])

    const byCodeResults = await repository.searchChapters(world.schoolDb, 'unique-code-2')
    expect(byCodeResults.map(r => r.id)).toEqual([byCode.id])

    const archivedResults = await repository.searchChapters(world.schoolDb, 'archived')
    expect(archivedResults.map(r => r.id)).not.toContain(archived.id)
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
    const chapterRow = await createChapter(world, track1, { title: 'Bhagavad Gita', code: 'ch-9' })
    const registrationRow = await createRegistration(world, {
      firstName: 'Ravi',
      lastName: 'Kumar',
    })

    // "1 track" is not a substring of "Track 1" — a plain `ilike('%1 track%')` would miss this
    // exactly the way the command palette's users hit in practice (see PR discussion).
    expect((await repository.searchTracks(world.schoolDb, '1 track')).map(r => r.id)).toEqual([
      track1.id,
    ])
    expect((await repository.searchBatches(world.schoolDb, '2026 ved br')).map(r => r.id)).toEqual([
      batchRow.id,
    ])
    expect(
      (await repository.searchChapters(world.schoolDb, 'gita bhagavad')).map(r => r.id),
    ).toEqual([chapterRow.id])
    expect(
      (await repository.searchRegistrations(world.schoolDb, 'kumar ravi')).map(r => r.id),
    ).toEqual([registrationRow.id])
  })
})

describe('search service', () => {
  it('fans out across every category and shapes each result for the command palette', async () => {
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

    const results = await search({ db: world.schoolDb, school, user }, { q: 'narada' })
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
})
