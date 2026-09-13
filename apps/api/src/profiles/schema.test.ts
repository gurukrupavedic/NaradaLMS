import { describe, expect, it, vi } from 'vitest'

// Explicit factory (rather than the real module) so importing `./schema` — which pulls in
// `../batches/schema` and, through it, `@narada/db` — doesn't trigger real env-var validation.
vi.mock('@narada/db', () => ({
  batchStatus: { enumValues: ['upcoming', 'active', 'completed'] },
  enrollmentRole: { enumValues: ['instructor', 'ta', 'student'] },
  enrollmentStatus: { enumValues: ['active', 'break', 'dropped', 'inactive'] },
  proficiencyLevel: {
    enumValues: ['absent', 'notStarted', 'practicing', 'level1', 'level2', 'level3', 'level4'],
  },
}))

import { ProfileBatchesQuerySchema, ProfileSchema } from './schema'

const validProfile = {
  id: '11111111-1111-4111-8111-111111111111',
  userId: 'user-1',
  name: 'Anjali Rao',
  phone: '+15551234567',
  city: 'Hyderabad',
  email: 'anjali@example.com',
  yearOfBirth: 2005,
  countryTimeZone: 'Asia/Kolkata',
  learningGoal: 'Fluency',
  currentProficiency: 'level1',
  spokenLanguages: ['Telugu'],
  readLanguages: [],
  parentNames: ['Parent One'],
  dressCodeAgreed: true,
  noMeatAgreed: false,
  noAlcoholAgreed: true,
  noSmokingAgreed: true,
  comments: null,
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
}

describe('ProfileSchema', () => {
  it('parses a profile carrying the fields copied from an approved registration', () => {
    const result = ProfileSchema.safeParse(validProfile)
    expect(result.success).toBe(true)
  })

  it('accepts null/empty registration-derived fields for a profile created without one', () => {
    const result = ProfileSchema.safeParse({
      ...validProfile,
      email: null,
      yearOfBirth: null,
      countryTimeZone: null,
      learningGoal: null,
      currentProficiency: null,
      spokenLanguages: [],
      readLanguages: [],
      parentNames: [],
      dressCodeAgreed: false,
      noMeatAgreed: false,
      noAlcoholAgreed: false,
      noSmokingAgreed: false,
      comments: null,
    })
    expect(result.success).toBe(true)
  })
})

describe('ProfileBatchesQuerySchema', () => {
  it('defaults withDetail to false when omitted', () => {
    const result = ProfileBatchesQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.withDetail).toBe(false)
    }
  })

  it('coerces the string query param "true" to boolean true', () => {
    const result = ProfileBatchesQuerySchema.safeParse({ withDetail: 'true' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.withDetail).toBe(true)
    }
  })

  it('coerces the string query param "false" to boolean — note: z.coerce.boolean() treats any non-empty string as true', () => {
    // Documents real `z.coerce.boolean()` behavior (`Boolean('false') === true`) rather than
    // asserting the intuitive-but-wrong result — a caller must omit the param, not send
    // `withDetail=false`, to get the bare-row response.
    const result = ProfileBatchesQuerySchema.safeParse({ withDetail: 'false' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.withDetail).toBe(true)
    }
  })

  it('still accepts the base FindBatchesSchema fields (status, limit)', () => {
    const result = ProfileBatchesQuerySchema.safeParse({ status: 'active', limit: '10' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('active')
      expect(result.data.limit).toBe(10)
    }
  })
})
