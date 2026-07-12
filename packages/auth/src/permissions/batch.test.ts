import { describe, expect, it } from 'vitest'

import { hasBatchPermission, type BatchPermissions, type BatchRole } from './batch'

const cases: Array<{
  role: BatchRole
  requested: BatchPermissions
  allowed: boolean
}> = [
  { role: 'instructor', requested: { evaluation: ['create', 'read'] }, allowed: true },
  { role: 'instructor', requested: { enrollment: ['remove'] }, allowed: true },
  { role: 'ta', requested: { exam: ['update'] }, allowed: true },
  { role: 'ta', requested: { enrollment: ['remove'] }, allowed: false },
  { role: 'student', requested: { evaluation: ['read'] }, allowed: true },
  { role: 'student', requested: { evaluation: ['create'] }, allowed: false },
  { role: 'student', requested: { exam: ['read'], enrollment: ['read'] }, allowed: true },
  { role: 'student', requested: { exam: ['read', 'update'] }, allowed: false },
]

describe('hasBatchPermission', () => {
  it.each(cases)('returns $allowed for $role requesting $requested', ({ role, requested, allowed }) => {
    expect(hasBatchPermission(role, requested)).toBe(allowed)
  })
})
