import { describe, expect, it } from 'vitest'

import { isValidTestSchemaName } from '../schemaName'

describe('isValidTestSchemaName', () => {
  it('refuses "public"', () => {
    expect(isValidTestSchemaName('public')).toBe(false)
  })

  it('refuses a non-school-prefixed name', () => {
    expect(isValidTestSchemaName('information_schema')).toBe(false)
    expect(isValidTestSchemaName('pg_catalog')).toBe(false)
    expect(isValidTestSchemaName('random-schema-name')).toBe(false)
  })

  it('refuses an empty string', () => {
    expect(isValidTestSchemaName('')).toBe(false)
  })

  it('accepts a real school-* schema name', () => {
    expect(isValidTestSchemaName(`school-${crypto.randomUUID()}`)).toBe(true)
  })

  it('accepts "school-" with an arbitrary non-empty suffix (organizationIdFromSchoolSchema only checks the prefix)', () => {
    expect(isValidTestSchemaName('school-abc')).toBe(true)
  })
})
