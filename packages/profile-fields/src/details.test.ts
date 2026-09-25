import { describe, expect, it } from 'vitest'

import { assertValidDefinitions, mergeDetails, normalizeDetails, visibleFields } from './details'
import { counterFieldFor, counterFieldsFor, profileFieldsFor } from './schools'
import type { FieldDefinition } from './types'

const ALL = { enforceRequiredFor: 'all' } as const

const slmts = profileFieldsFor('slmts')

describe('visibleFields', () => {
  it('hides the spouse gothram until married is ticked', () => {
    expect(visibleFields(slmts, {}).map(f => f.key)).toEqual([
      'gothram',
      'married',
      'gothramMother',
    ])
    expect(visibleFields(slmts, { married: false }).map(f => f.key)).not.toContain('gothramSpouse')
    expect(visibleFields(slmts, { married: true }).map(f => f.key)).toEqual([
      'gothram',
      'married',
      'gothramSpouse',
      'gothramMother',
    ])
  })

  it('treats an unanswered boolean as false for an `equals: false` condition', () => {
    const fields: FieldDefinition[] = [
      { key: 'vegetarian', label: 'Vegetarian', type: 'boolean' },
      { key: 'diet', label: 'Diet', type: 'text', showIf: { field: 'vegetarian', equals: false } },
    ]
    expect(visibleFields(fields, {}).map(f => f.key)).toEqual(['vegetarian', 'diet'])
    expect(visibleFields(fields, { vegetarian: true }).map(f => f.key)).toEqual(['vegetarian'])
  })

  it('does not chain a condition through a hidden field', () => {
    const fields: FieldDefinition[] = [
      { key: 'a', label: 'A', type: 'boolean' },
      { key: 'b', label: 'B', type: 'boolean', showIf: { field: 'a', equals: true } },
      { key: 'c', label: 'C', type: 'text', showIf: { field: 'b', equals: true } },
    ]
    // `b` is hidden, so its stale `true` must not reveal `c`.
    expect(visibleFields(fields, { a: false, b: true }).map(f => f.key)).toEqual(['a'])
    expect(visibleFields(fields, { a: true, b: true }).map(f => f.key)).toEqual(['a', 'b', 'c'])
  })
})

describe('normalizeDetails', () => {
  it('accepts a complete registration and trims text', () => {
    const result = normalizeDetails(
      slmts,
      {
        gothram: '  Bharadwaja ',
        married: true,
        gothramSpouse: 'Kashyapa',
        gothramMother: 'Vasishta',
      },
      ALL,
    )
    expect(result.errors).toEqual({})
    expect(result.values).toEqual({
      gothram: 'Bharadwaja',
      married: true,
      gothramSpouse: 'Kashyapa',
      gothramMother: 'Vasishta',
    })
  })

  it('requires a visible required field, and stores an unanswered boolean as false', () => {
    const result = normalizeDetails(slmts, { gothram: 'Bharadwaja' }, ALL)
    expect(result.errors).toEqual({ gothramMother: 'is required' })
    expect(result.values).toEqual({ gothram: 'Bharadwaja', married: false })
  })

  it('requires the spouse gothram only when married', () => {
    const unmarried = { gothram: 'A', married: false, gothramMother: 'B' }
    expect(normalizeDetails(slmts, unmarried, ALL).errors).toEqual({})
    expect(normalizeDetails(slmts, { ...unmarried, married: true }, ALL).errors).toEqual({
      gothramSpouse: 'is required',
    })
  })

  it('drops a hidden field rather than storing or rejecting it', () => {
    const result = normalizeDetails(
      slmts,
      { gothram: 'A', married: false, gothramSpouse: 'stale', gothramMother: 'B' },
      ALL,
    )
    expect(result.errors).toEqual({})
    expect(result.values).toEqual({ gothram: 'A', married: false, gothramMother: 'B' })
  })

  it('treats a blank required text as missing', () => {
    expect(normalizeDetails(profileFieldsFor('rr'), { gothram: '   ' }, ALL).errors).toEqual({
      gothram: 'is required',
    })
  })

  it('rejects a key the school does not define', () => {
    const result = normalizeDetails(
      profileFieldsFor('rr'),
      { gothram: 'A', gothramMother: 'B' },
      ALL,
    )
    expect(result.errors).toEqual({ gothramMother: 'is not a field for this school' })
  })

  it('rejects wrongly typed values', () => {
    expect(
      normalizeDetails(slmts, { gothram: 5, married: 'yes', gothramMother: 'B' }, ALL).errors,
    ).toEqual({
      gothram: 'must be text',
      married: 'must be true or false',
    })
  })

  it('rejects text over the length limit', () => {
    expect(
      normalizeDetails(profileFieldsFor('rr'), { gothram: 'x'.repeat(201) }, ALL).errors,
    ).toEqual({
      gothram: 'must be at most 200 characters',
    })
  })

  it('holds only the listed keys to `required` on a later edit', () => {
    // A profile that predates the field: editing something else must not demand it...
    expect(
      normalizeDetails(slmts, { gothram: 'A' }, { enforceRequiredFor: ['gothram'] }).errors,
    ).toEqual({})
    // ...but blanking a required field being written is still refused.
    expect(
      normalizeDetails(slmts, { gothram: '' }, { enforceRequiredFor: ['gothram'] }).errors,
    ).toEqual({
      gothram: 'is required',
    })
  })

  it('validates number and select fields', () => {
    const fields: FieldDefinition[] = [
      { key: 'age', label: 'Age', type: 'number', min: 1, max: 120 },
      {
        key: 'house',
        label: 'House',
        type: 'select',
        required: true,
        options: [{ value: 'a', label: 'A' }],
      },
    ]
    expect(normalizeDetails(fields, { age: 0, house: 'b' }, ALL).errors).toEqual({
      age: 'must be at least 1',
      house: 'is not one of the options',
    })
    expect(normalizeDetails(fields, { age: 30, house: 'a' }, ALL)).toEqual({
      values: { age: 30, house: 'a' },
      errors: {},
    })
    expect(normalizeDetails(fields, { age: '30', house: 'a' }, ALL).errors).toEqual({
      age: 'must be a number',
    })
  })
})

describe('normalizeDetails: blank means no value for every type', () => {
  const fields: FieldDefinition[] = [{ key: 'age', label: 'Age', type: 'number' }]

  it('lets a client clear a number by sending a blank string', () => {
    expect(normalizeDetails(fields, { age: '' }, ALL)).toEqual({ values: {}, errors: {} })
  })
})

describe('mergeDetails', () => {
  const stored = { gothram: 'Bharadwaja', married: false, gothramMother: 'Vasishta' }

  it('lays the patch over what is stored', () => {
    expect(mergeDetails(slmts, stored, { gothramMother: 'Kashyapa' })).toEqual({
      values: { gothram: 'Bharadwaja', married: false, gothramMother: 'Kashyapa' },
      errors: {},
    })
  })

  it('requires a field the patch reveals, even though the patch does not name it', () => {
    expect(mergeDetails(slmts, stored, { married: true }).errors).toEqual({
      gothramSpouse: 'is required',
    })
  })

  it('drops a field the patch hides', () => {
    const married = { ...stored, married: true, gothramSpouse: 'Kashyapa' }
    expect(mergeDetails(slmts, married, { married: false }).values).toEqual(stored)
  })

  it('does not demand fields a profile predates, unless the patch names them', () => {
    expect(mergeDetails(slmts, {}, { gothramMother: 'B' })).toEqual({
      values: { married: false, gothramMother: 'B' },
      errors: {},
    })
    expect(mergeDetails(slmts, { gothram: 'A' }, { gothram: '' }).errors).toEqual({
      gothram: 'is required',
    })
  })

  it('does not require a field that was already visible and unanswered', () => {
    // Married was already ticked (with the spouse's gothram never filled in); an unrelated edit
    // must not start demanding it.
    const legacy = { gothram: 'A', married: true, gothramMother: 'B' }
    expect(mergeDetails(slmts, legacy, { gothramMother: 'C' }).errors).toEqual({})
  })

  it('carries a stored key no field defines any more', () => {
    expect(mergeDetails(slmts, { ...stored, retired: 'kept' }, { gothram: 'A' }).values).toEqual({
      retired: 'kept',
      gothram: 'A',
      married: false,
      gothramMother: 'Vasishta',
    })
  })

  it('rejects a key no field defines, and a change to a non-editable field', () => {
    expect(mergeDetails(slmts, stored, { nope: 'x' }).errors).toEqual({
      nope: 'is not a field for this school',
    })

    const locked: FieldDefinition[] = [{ key: 'id', label: 'Id', type: 'text', editable: false }]
    expect(mergeDetails(locked, { id: 'a' }, { id: 'b' }).errors).toEqual({
      id: 'cannot be changed',
    })
  })
})

describe('profileFieldsFor', () => {
  it('gives RR a single gothram and SLMTS three', () => {
    expect(profileFieldsFor('rr').map(f => f.key)).toEqual(['gothram'])
    expect(slmts.filter(f => f.key.startsWith('gothram')).map(f => f.key)).toEqual([
      'gothram',
      'gothramSpouse',
      'gothramMother',
    ])
  })

  it('collects nothing extra for an unknown school, including inherited object keys', () => {
    expect(profileFieldsFor('nope')).toEqual([])
    expect(profileFieldsFor('constructor')).toEqual([])
  })
})

describe('assertValidDefinitions', () => {
  it('rejects a duplicate key', () => {
    expect(() =>
      assertValidDefinitions([
        { key: 'a', label: 'A', type: 'text' },
        { key: 'a', label: 'A again', type: 'text' },
      ]),
    ).toThrow(/duplicate/)
  })

  it('rejects a condition on a field defined later or not at all', () => {
    expect(() =>
      assertValidDefinitions([
        { key: 'b', label: 'B', type: 'text', showIf: { field: 'a', equals: true } },
        { key: 'a', label: 'A', type: 'boolean' },
      ]),
    ).toThrow(/must be defined before/)
  })
})

describe('counters', () => {
  it("gives SLMTS's Vedam course a japam counter, and RR's course none", () => {
    expect(counterFieldsFor('slmts', 'ved')).toEqual([{ key: 'japam', label: 'Japam' }])
    expect(counterFieldsFor('rr', 'pur')).toEqual([])
  })

  it('is declared per course: another course in the same school keeps none', () => {
    expect(counterFieldsFor('slmts', 'some-other-course')).toEqual([])
  })

  it('finds one counter by key', () => {
    expect(counterFieldFor('slmts', 'ved', 'japam')).toEqual({ key: 'japam', label: 'Japam' })
    expect(counterFieldFor('slmts', 'ved', 'nope')).toBeUndefined()
    expect(counterFieldFor('rr', 'pur', 'japam')).toBeUndefined()
  })

  it('gives an unknown school or course nothing, including inherited object keys', () => {
    expect(counterFieldsFor('nope', 'ved')).toEqual([])
    expect(counterFieldsFor('constructor', 'ved')).toEqual([])
    expect(counterFieldsFor('slmts', 'constructor')).toEqual([])
  })
})
