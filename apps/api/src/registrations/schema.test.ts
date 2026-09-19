import { describe, expect, it, vi } from 'vitest'

import { CreateRegistrationSchema, FindRegistrationsSchema } from './schema'

// Explicit factory (rather than the real module) so importing `./schema` doesn't pull in
// `@narada/db` at import time and trigger real env-var validation — never loads.
vi.mock('@narada/db', () => ({
  registrationStatus: { enumValues: ['pending', 'approved', 'rejected'] },
  proficiencyLevel: {
    enumValues: ['absent', 'notStarted', 'practicing', 'level0', 'level1', 'level2', 'level3', 'level4'],
  },
}))

const validBody = {
  firstName: 'Anjali',
  lastName: 'Rao',
  phone: '+15551234567',
}

describe('CreateRegistrationSchema', () => {
  it('accepts the minimal required fields', () => {
    const result = CreateRegistrationSchema.safeParse(validBody)
    expect(result.success).toBe(true)
  })

  it('accepts a fully populated body', () => {
    const result = CreateRegistrationSchema.safeParse({
      ...validBody,
      yearOfBirth: 2005,
      email: 'anjali@example.com',
      city: 'Hyderabad',
      state: 'TG',
      country: 'IN',
      learningGoal: 'Learn to chant confidently',
      currentProficiency: 'notStarted',
      spokenLanguages: ['Telugu', 'English'],
      readLanguages: ['English'],
      parentNames: ['Parent One', 'Parent Two'],
      dressCodeAgreed: true,
      noMeatAgreed: true,
      noAlcoholAgreed: true,
      noSmokingAgreed: true,
      comments: 'Looking forward to it',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a missing firstName', () => {
    const { firstName: _firstName, ...rest } = validBody
    expect(CreateRegistrationSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects a non-E.164 phone', () => {
    expect(CreateRegistrationSchema.safeParse({ ...validBody, phone: '5551234567' }).success).toBe(false)
  })

  it('rejects an invalid email', () => {
    expect(CreateRegistrationSchema.safeParse({ ...validBody, email: 'not-an-email' }).success).toBe(false)
  })

  it('rejects a yearOfBirth outside a plausible range', () => {
    expect(CreateRegistrationSchema.safeParse({ ...validBody, yearOfBirth: 1800 }).success).toBe(false)
    expect(
      CreateRegistrationSchema.safeParse({ ...validBody, yearOfBirth: new Date().getFullYear() + 1 }).success,
    ).toBe(false)
  })

  it('strips a status or id in the body rather than accepting it', () => {
    const result = CreateRegistrationSchema.safeParse({
      ...validBody,
      id: crypto.randomUUID(),
      status: 'approved',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('status')
      expect(result.data).not.toHaveProperty('id')
    }
  })

  it('strips countryTimeZone rather than accepting it — it is server-derived, never applicant-supplied', () => {
    const result = CreateRegistrationSchema.safeParse({
      ...validBody,
      countryTimeZone: 'Asia/Kolkata',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('countryTimeZone')
    }
  })
})

describe('FindRegistrationsSchema', () => {
  it('defaults limit and accepts an omitted status/cursor', () => {
    const result = FindRegistrationsSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(20)
    }
  })

  it('rejects an invalid status', () => {
    expect(FindRegistrationsSchema.safeParse({ status: 'archived' }).success).toBe(false)
  })

  it('rejects a limit above 100', () => {
    expect(FindRegistrationsSchema.safeParse({ limit: 101 }).success).toBe(false)
  })
})
