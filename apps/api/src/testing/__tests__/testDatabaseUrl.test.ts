import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { databaseNameOf, requireTestDatabaseUrl } from '../testDatabaseUrl'

describe('requireTestDatabaseUrl', () => {
  const originalValue = process.env.TEST_DATABASE_URL

  beforeEach(() => {
    delete process.env.TEST_DATABASE_URL
  })

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env.TEST_DATABASE_URL
    } else {
      process.env.TEST_DATABASE_URL = originalValue
    }
  })

  it('throws when unset', () => {
    delete process.env.TEST_DATABASE_URL
    expect(() => requireTestDatabaseUrl()).toThrow(/not set/i)
  })

  it('throws when empty', () => {
    process.env.TEST_DATABASE_URL = ''
    expect(() => requireTestDatabaseUrl()).toThrow(/not set/i)
  })

  it('throws when whitespace-only', () => {
    process.env.TEST_DATABASE_URL = '   '
    expect(() => requireTestDatabaseUrl()).toThrow(/not set/i)
  })

  it('throws when not a parseable URL', () => {
    process.env.TEST_DATABASE_URL = 'not a url'
    expect(() => requireTestDatabaseUrl()).toThrow(/not a valid URL/i)
  })

  it('throws when the database name does not end in _test', () => {
    process.env.TEST_DATABASE_URL = 'postgresql://narada:narada@localhost:5432/narada'
    expect(() => requireTestDatabaseUrl()).toThrow(/_test/)
  })

  it('throws when the database name has a _test-like substring but wrong suffix', () => {
    process.env.TEST_DATABASE_URL = 'postgresql://narada:narada@localhost:5432/narada_testing'
    expect(() => requireTestDatabaseUrl()).toThrow(/_test/)
  })

  it('returns the value for a valid ..._test URL', () => {
    process.env.TEST_DATABASE_URL = 'postgresql://narada:narada@localhost:5432/narada_test'
    expect(requireTestDatabaseUrl()).toBe('postgresql://narada:narada@localhost:5432/narada_test')
  })

  it('accepts a _test database name with a query string', () => {
    process.env.TEST_DATABASE_URL =
      'postgresql://narada:narada@localhost:5432/narada_test?sslmode=disable'
    expect(() => requireTestDatabaseUrl()).not.toThrow()
  })
})

describe('databaseNameOf', () => {
  it('strips the leading slash and any query string', () => {
    expect(databaseNameOf('postgresql://narada:narada@localhost:5432/narada_test')).toBe(
      'narada_test',
    )
    expect(
      databaseNameOf('postgresql://narada:narada@localhost:5432/narada_test?sslmode=disable'),
    ).toBe('narada_test')
  })
})
