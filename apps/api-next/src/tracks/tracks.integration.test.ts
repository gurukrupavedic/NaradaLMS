import { afterEach, describe, expect, it } from 'vitest'

import { destroyTestWorld } from '../testing/cleanup'
import {
  createChapter,
  createProfile,
  createTestSchool,
  createTrack,
  createTrackCertification,
  type TestWorld,
} from '../testing/fixtures'
import { findAll, findById, findCertificationsForStudent } from './repository'

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

describe('findAll', () => {
  it('orders tracks by order, each with its chapters ordered by order', async () => {
    world = await createTestSchool()
    const trackB = await createTrack(world, { order: 2 })
    const trackA = await createTrack(world, { order: 1 })
    await createChapter(world, trackA, { order: 2, status: 'published' })
    await createChapter(world, trackA, { order: 1, status: 'published' })

    const tracks = await findAll(world.schoolDb, { kind: 'authoring' })

    expect(tracks.map(t => t.id)).toEqual([trackA.id, trackB.id])
    expect(tracks[0]?.chapters.map(c => c.order)).toEqual([1, 2])
  })

  it('learnerPreview hides draft chapters; authoring shows both', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    const published = await createChapter(world, trackRow, { status: 'published' })
    const draft = await createChapter(world, trackRow, { status: 'draft' })

    const learnerView = await findAll(world.schoolDb, { kind: 'learnerPreview' })
    expect(learnerView[0]?.chapters.map(c => c.id)).toEqual([published.id])

    const authoringView = await findAll(world.schoolDb, { kind: 'authoring' })
    expect(authoringView[0]?.chapters.map(c => c.id).sort()).toEqual(
      [published.id, draft.id].sort(),
    )
  })

  it('a track with no visible chapters still appears, with an empty chapters array', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    await createChapter(world, trackRow, { status: 'draft' })

    const learnerView = await findAll(world.schoolDb, { kind: 'learnerPreview' })

    expect(learnerView.map(t => t.id)).toContain(trackRow.id)
    expect(learnerView.find(t => t.id === trackRow.id)?.chapters).toEqual([])
  })
})

describe('findById', () => {
  it('returns the track with visibility-filtered chapters', async () => {
    world = await createTestSchool()
    const trackRow = await createTrack(world)
    await createChapter(world, trackRow, { status: 'draft' })

    const learnerView = await findById(world.schoolDb, trackRow.id, { kind: 'learnerPreview' })
    expect(learnerView?.chapters).toEqual([])

    const authoringView = await findById(world.schoolDb, trackRow.id, { kind: 'authoring' })
    expect(authoringView?.chapters).toHaveLength(1)
  })

  it('returns undefined for a nonexistent track', async () => {
    world = await createTestSchool()

    await expect(
      findById(world.schoolDb, crypto.randomUUID(), { kind: 'authoring' }),
    ).resolves.toBeUndefined()
  })
})

describe(
  'findCertificationsForStudent (real gap: certifications decoupled from chapter, ' +
    'packages/db/src/schema/school.ts::trackCertification)',
  () => {
    it("returns every certification across every track for this student, not scoped to one track", async () => {
      world = await createTestSchool()
      const trackA = await createTrack(world)
      const trackB = await createTrack(world)
      const student = await createProfile(world, { name: 'Student' })
      const evaluator = await createProfile(world, { name: 'Evaluator' })
      const certA = await createTrackCertification(world, { track: trackA, student, evaluator, level: 'level4' })
      const certB = await createTrackCertification(world, { track: trackB, student, evaluator, level: 'level1' })

      const certifications = await findCertificationsForStudent(world.schoolDb, student.id)

      expect(certifications.map(c => c.id).sort()).toEqual([certA.id, certB.id].sort())
    })

    it("never returns another student's certifications", async () => {
      world = await createTestSchool()
      const trackRow = await createTrack(world)
      const student = await createProfile(world)
      const otherStudent = await createProfile(world)
      const evaluator = await createProfile(world)
      await createTrackCertification(world, { track: trackRow, student: otherStudent, evaluator })

      const certifications = await findCertificationsForStudent(world.schoolDb, student.id)

      expect(certifications).toEqual([])
    })

    it('returns an empty array, not an error, when the student has no certifications at all', async () => {
      world = await createTestSchool()
      const student = await createProfile(world)

      await expect(findCertificationsForStudent(world.schoolDb, student.id)).resolves.toEqual([])
    })

    it('multiple certification rows for the same track/student are all returned — history, not a single current row', async () => {
      world = await createTestSchool()
      const trackRow = await createTrack(world)
      const student = await createProfile(world)
      const evaluator = await createProfile(world)
      await createTrackCertification(world, { track: trackRow, student, evaluator, level: 'practicing' })
      await createTrackCertification(world, { track: trackRow, student, evaluator, level: 'level4' })

      const certifications = await findCertificationsForStudent(world.schoolDb, student.id)

      expect(certifications).toHaveLength(2)
    })
  },
)
