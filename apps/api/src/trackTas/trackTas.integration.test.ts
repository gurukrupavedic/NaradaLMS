import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'

import { enrollment, profile } from '@narada/db'

import type { AccessPolicy } from '../utils/accessPolicy'
import { destroyTestWorld } from '../testing/cleanup'
import {
  createBatch,
  createChapter,
  createEvaluation,
  createProfile,
  createTestSchool,
  createTrack,
  defaultCourseId,
  enroll,
  type ProfileRow,
  type TestWorld,
} from '../testing/fixtures'
import { add, findAll, findCandidates, remove } from './service'

// What's under test is the eligibility rule and the list's behaviour against real Postgres, not
// authorization (covered by the `requireSchoolAdmin` tests in accessPolicy).
const admin = { requireCanManageTrackTas: () => undefined } as unknown as AccessPolicy

let world: TestWorld | undefined

afterEach(async () => {
  if (world) {
    await destroyTestWorld(world)
    world = undefined
  }
})

async function setup() {
  const w = await createTestSchool()
  world = w
  const track = await createTrack(w)
  const chapters = [
    await createChapter(w, track, { status: 'published' }),
    await createChapter(w, track, { status: 'published' }),
  ]
  const batch = await createBatch(w, track)
  const evaluator = await createProfile(w, { name: 'Evaluator' })
  const courseId = await defaultCourseId(w)
  const context = { db: w.schoolDb, access: admin }

  async function makeTa(name: string, levels: ('level2' | 'level3' | 'level4' | null)[]): Promise<ProfileRow> {
    const ta = await createProfile(w, { name })
    await enroll(w, ta, batch, 'ta')
    for (const [i, level] of levels.entries()) {
      if (level) await createEvaluation(w, { student: ta, chapter: chapters[i]!, evaluator, level })
    }
    return ta
  }

  return { w, track, chapters, batch, evaluator, courseId, context, makeTa }
}

describe('findCandidates', () => {
  it('offers only active TAs with L3+ on every gradable chapter, and not ones already listed', async () => {
    const { track, courseId, context, makeTa, w, batch } = await setup()
    const full = await makeTa('Full', ['level3', 'level4'])
    const listed = await makeTa('Listed', ['level3', 'level3'])
    await makeTa('Partial', ['level3', 'level2'])
    await makeTa('Missing', ['level3', null])
    const student = await createProfile(w, { name: 'Student' })
    await enroll(w, student, batch, 'student')
    await add(context, { trackId: track.id, profileId: listed.id }, courseId)

    const candidates = await findCandidates(context, track.id, courseId)

    expect(candidates.map(c => c.profileId)).toEqual([full.id])
  })

  it("uses a chapter's latest evaluation, so a regression drops the TA", async () => {
    const { track, chapters, courseId, context, makeTa, w, evaluator } = await setup()
    const ta = await makeTa('Slipped', ['level3', 'level3'])
    await createEvaluation(w, { student: ta, chapter: chapters[0]!, evaluator, level: 'level1' })

    expect(await findCandidates(context, track.id, courseId)).toEqual([])
  })

  it('ignores draft chapters', async () => {
    const { w, track, courseId, context, makeTa } = await setup()
    await createChapter(w, track, { status: 'draft' })
    const ta = await makeTa('Full', ['level3', 'level3'])

    expect((await findCandidates(context, track.id, courseId)).map(c => c.profileId)).toEqual([ta.id])
  })
})

describe('add / findAll / remove', () => {
  it('lists an eligible TA under their track and removes them again', async () => {
    const { w, track, courseId, context, makeTa } = await setup()
    const ta = await makeTa('Eligible', ['level3', 'level3'])
    await w.schoolDb
      .update(profile)
      .set({ phone: '+15551234567', country: 'US', countryTimeZone: 'America/New_York' })
      .where(eq(profile.id, ta.id))

    await add(context, { trackId: track.id, profileId: ta.id }, courseId)
    expect(await findAll({ db: context.db }, courseId)).toEqual([
      {
        trackId: track.id,
        profileId: ta.id,
        name: 'Eligible',
        phone: '+15551234567',
        country: 'US',
        countryTimeZone: 'America/New_York',
      },
    ])

    await remove(context, track.id, ta.id, courseId)
    expect(await findAll({ db: context.db }, courseId)).toEqual([])
  })

  it('rejects a TA without L3 across the track (422) and a duplicate (409)', async () => {
    const { track, courseId, context, makeTa } = await setup()
    const weak = await makeTa('Weak', ['level3', 'level2'])
    const ta = await makeTa('Eligible', ['level3', 'level3'])

    await expect(add(context, { trackId: track.id, profileId: weak.id }, courseId)).rejects.toMatchObject({
      statusCode: 422,
    })
    await add(context, { trackId: track.id, profileId: ta.id }, courseId)
    await expect(add(context, { trackId: track.id, profileId: ta.id }, courseId)).rejects.toMatchObject({
      statusCode: 409,
    })
  })

  it('rejects a profile who is not an active TA', async () => {
    const { w, track, chapters, evaluator, courseId, context, batch } = await setup()
    const student = await createProfile(w, { name: 'Student' })
    await enroll(w, student, batch, 'student')
    for (const chapter of chapters) {
      await createEvaluation(w, { student, chapter, evaluator, level: 'level3' })
    }

    await expect(add(context, { trackId: track.id, profileId: student.id }, courseId)).rejects.toMatchObject({
      statusCode: 422,
    })
  })

  it('drops a listed TA from the list once they are no longer an active TA', async () => {
    const { w, track, courseId, context, makeTa } = await setup()
    const ta = await makeTa('Stepping down', ['level3', 'level3'])
    await add(context, { trackId: track.id, profileId: ta.id }, courseId)

    await w.schoolDb.update(enrollment).set({ status: 'inactive' }).where(eq(enrollment.profileId, ta.id))

    expect(await findAll({ db: context.db }, courseId)).toEqual([])
  })

  it('404s removing a TA who is not listed', async () => {
    const { track, courseId, context, makeTa } = await setup()
    const ta = await makeTa('Never listed', ['level3', 'level3'])

    await expect(remove(context, track.id, ta.id, courseId)).rejects.toMatchObject({ statusCode: 404 })
  })
})
