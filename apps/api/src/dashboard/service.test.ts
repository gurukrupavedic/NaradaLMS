import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SchoolDbClient } from '@narada/db'

import { getDashboardData } from './service'
import * as batchesRepository from '../batches/repository'
import * as enrollmentRequestsRepository from '../enrollmentRequests/repository'
import * as evaluationsRepository from '../evaluations/repository'
import * as examsRepository from '../exams/repository'
import * as tracksRepository from '../tracks/repository'
import * as tracksService from '../tracks/service'

vi.mock('../batches/repository', () => ({
  findAllMembershipsWithDetail: vi.fn(),
  findAllForProfiles: vi.fn(),
}))
vi.mock('../enrollmentRequests/repository', () => ({
  findPendingBatchIdsForProfile: vi.fn(),
}))
vi.mock('../evaluations/repository', () => ({
  findAllForStudent: vi.fn(),
  findForChaptersAndStudents: vi.fn(),
}))
vi.mock('../exams/repository', () => ({
  findUpcomingForStudent: vi.fn(),
}))
vi.mock('../tracks/repository', () => ({
  findCertificationsForStudent: vi.fn(),
}))
vi.mock('../tracks/service', () => ({
  findAll: vi.fn(),
}))

const db = {} as SchoolDbClient
const context = { db }

function member(profileId: string, role: 'instructor' | 'ta' | 'student') {
  return { profileId, name: profileId, phone: null, city: null, role, joinedAt: null, status: 'active' as const }
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(tracksService.findAll).mockResolvedValue([])
  vi.mocked(evaluationsRepository.findAllForStudent).mockResolvedValue([])
  vi.mocked(examsRepository.findUpcomingForStudent).mockResolvedValue([])
  vi.mocked(evaluationsRepository.findForChaptersAndStudents).mockResolvedValue([])
  vi.mocked(batchesRepository.findAllForProfiles).mockResolvedValue(new Map())
  vi.mocked(tracksRepository.findCertificationsForStudent).mockResolvedValue([])
  vi.mocked(enrollmentRequestsRepository.findPendingBatchIdsForProfile).mockResolvedValue([])
})

describe('getDashboardData', () => {
  it("derives firstName from the profile's first name only", async () => {
    vi.mocked(batchesRepository.findAllMembershipsWithDetail).mockResolvedValue([])

    const data = await getDashboardData(context, 'me', 'Ada Lovelace')
    expect(data.firstName).toBe('Ada')
  })

  it("falls back to 'there' for a blank name", async () => {
    vi.mocked(batchesRepository.findAllMembershipsWithDetail).mockResolvedValue([])

    const data = await getDashboardData(context, 'me', '')
    expect(data.firstName).toBe('there')
  })

  it('only instructor/ta memberships count as teaching — a student membership is excluded', async () => {
    vi.mocked(batchesRepository.findAllMembershipsWithDetail).mockResolvedValue([
      {
        id: 'batch-student',
        trackId: 'track-1',
        code: 'B1',
        status: 'active',
        startDate: null,
        meetingUrl: null,
        enrollmentOpensAt: null,
        enrollmentClosesAt: null,
        enrollmentStatus: null,
        role: 'student',
        members: [member('me', 'student')],
        classSlots: [],
      },
    ])

    const data = await getDashboardData(context, 'me', 'Me')

    expect(data.teaching).toEqual([])
    expect(evaluationsRepository.findForChaptersAndStudents).toHaveBeenCalledWith(db, [], [])
  })

  it('buckets teaching evaluations per batch using that batch\'s own track chapters and roster — not the other taught batch\'s', async () => {
    vi.mocked(tracksService.findAll).mockResolvedValue([
      {
        id: 'track-1',
        name: 'Track 1',
        order: 1,
        chapters: [{ id: 'chapter-1', trackId: 'track-1', code: 'C1', title: 'C1', status: 'published', order: 1, script: null }],
      },
      {
        id: 'track-2',
        name: 'Track 2',
        order: 2,
        chapters: [{ id: 'chapter-2', trackId: 'track-2', code: 'C2', title: 'C2', status: 'published', order: 1, script: null }],
      },
    ])

    vi.mocked(batchesRepository.findAllMembershipsWithDetail).mockResolvedValue([
      {
        id: 'batch-A',
        trackId: 'track-1',
        code: 'A',
        status: 'active',
        startDate: null,
        meetingUrl: null,
        enrollmentOpensAt: null,
        enrollmentClosesAt: null,
        enrollmentStatus: null,
        role: 'instructor',
        members: [member('instructor-me', 'instructor'), member('student-1', 'student')],
        classSlots: [],
      },
      {
        id: 'batch-B',
        trackId: 'track-2',
        code: 'B',
        status: 'active',
        startDate: null,
        meetingUrl: null,
        enrollmentOpensAt: null,
        enrollmentClosesAt: null,
        enrollmentStatus: null,
        role: 'ta',
        members: [member('instructor-me', 'ta'), member('student-2', 'student')],
        classSlots: [],
      },
    ])

    const evalForStudent1 = {
      id: 'eval-1',
      studentId: 'student-1',
      chapterId: 'chapter-1',
      batchId: 'batch-A',
      level: 'level1' as const,
      notes: null,
      evaluatorId: 'instructor-me',
      evaluatedAt: new Date(),
    }
    const evalForStudent2 = {
      id: 'eval-2',
      studentId: 'student-2',
      chapterId: 'chapter-2',
      batchId: 'batch-B',
      level: 'level2' as const,
      notes: null,
      evaluatorId: 'instructor-me',
      evaluatedAt: new Date(),
    }
    vi.mocked(evaluationsRepository.findForChaptersAndStudents).mockResolvedValue([
      evalForStudent1,
      evalForStudent2,
    ])

    const data = await getDashboardData(context, 'instructor-me', 'Instructor Me')

    expect(evaluationsRepository.findForChaptersAndStudents).toHaveBeenCalledWith(
      db,
      expect.arrayContaining(['chapter-1', 'chapter-2']),
      expect.arrayContaining(['student-1', 'student-2']),
    )

    const batchA = data.teaching.find(t => t.batchId === 'batch-A')
    const batchB = data.teaching.find(t => t.batchId === 'batch-B')
    expect(batchA?.evaluations).toEqual([evalForStudent1])
    expect(batchB?.evaluations).toEqual([evalForStudent2])
  })

  it('pastBatchesByStudent covers every teaching student, defaulting to an empty array when none found', async () => {
    vi.mocked(batchesRepository.findAllMembershipsWithDetail).mockResolvedValue([
      {
        id: 'batch-A',
        trackId: 'track-1',
        code: 'A',
        status: 'active',
        startDate: null,
        meetingUrl: null,
        enrollmentOpensAt: null,
        enrollmentClosesAt: null,
        enrollmentStatus: null,
        role: 'instructor',
        members: [member('me', 'instructor'), member('student-1', 'student')],
        classSlots: [],
      },
    ])
    vi.mocked(batchesRepository.findAllForProfiles).mockResolvedValue(
      new Map([['student-1', [{ id: 'past-batch', trackId: 'track-1', code: 'P', status: 'completed', startDate: null, meetingUrl: null, enrollmentOpensAt: null, enrollmentClosesAt: null }]]]),
    )

    const data = await getDashboardData(context, 'me', 'Me')

    expect(data.pastBatchesByStudent).toEqual([
      { studentId: 'student-1', batches: [{ id: 'past-batch', trackId: 'track-1', code: 'P', status: 'completed', startDate: null, meetingUrl: null, enrollmentOpensAt: null, enrollmentClosesAt: null }] },
    ])
  })

  it('passes straight through: studentEvaluations, certifications, upcomingExams, tracks, memberships', async () => {
    const memberships = [
      {
        id: 'batch-A',
        trackId: 'track-1',
        code: 'A',
        status: 'active' as const,
        startDate: null,
        meetingUrl: null,
        enrollmentOpensAt: null,
        enrollmentClosesAt: null,
        enrollmentStatus: null,
        role: 'student' as const,
        members: [],
        classSlots: [],
      },
    ]
    const tracks = [{ id: 'track-1', name: 'Track 1', order: 1, chapters: [] }]
    const studentEvaluations = [
      {
        id: 'eval-1',
        studentId: 'me',
        chapterId: 'chapter-1',
        batchId: 'batch-A',
        level: 'level1' as const,
        notes: null,
        evaluatorId: 'someone',
        evaluatedAt: new Date(),
      },
    ]
    const upcomingExams = [
      {
        id: 'exam-1',
        chapterId: 'chapter-1',
        studentId: 'me',
        batchId: 'batch-A',
        scheduledAt: new Date(),
        status: 'scheduled' as const,
        evaluationId: null,
        performedAt: null,
        chapter: { id: 'chapter-1', code: 'C1', title: 'C1', trackId: 'track-1' },
        evaluation: null,
      },
    ]

    const certifications = [
      {
        id: 'cert-1',
        trackId: 'track-1',
        studentId: 'me',
        level: 'level4' as const,
        notes: null,
        evaluatorId: 'someone',
        evaluatedAt: new Date(),
      },
    ]

    vi.mocked(batchesRepository.findAllMembershipsWithDetail).mockResolvedValue(memberships)
    vi.mocked(tracksService.findAll).mockResolvedValue(tracks)
    vi.mocked(evaluationsRepository.findAllForStudent).mockResolvedValue(studentEvaluations)
    vi.mocked(tracksRepository.findCertificationsForStudent).mockResolvedValue(certifications)
    vi.mocked(examsRepository.findUpcomingForStudent).mockResolvedValue(upcomingExams)

    const data = await getDashboardData(context, 'me', 'Me')

    expect(data.memberships).toEqual(memberships)
    expect(data.tracks).toEqual(tracks)
    expect(data.studentEvaluations).toEqual(studentEvaluations)
    expect(data.certifications).toEqual(certifications)
    expect(data.upcomingExams).toEqual(upcomingExams)
    expect(tracksRepository.findCertificationsForStudent).toHaveBeenCalledWith(db, 'me')
  })
})
