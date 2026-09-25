import { describe, expect, it } from 'vitest'

import { profileFieldsFor, type FieldDefinition } from '@narada/profile-fields'

import {
  detailsFromDraft,
  detailsPatch,
  displayDetail,
  draftFromDetails,
  draftValue,
  editDetailsError,
  registrationDetailsError,
} from './profile-details'

const slmts = profileFieldsFor('slmts')
const rr = profileFieldsFor('rr')

const stored = { gothram: 'Bharadwaja', married: false, gothramMother: 'Vasishta' }

describe('draftValue', () => {
  it('gives an untouched field its empty value by type', () => {
    expect(draftValue(slmts[0]!, {})).toBe('')
    expect(draftValue(slmts[1]!, {})).toBe(false)
    expect(draftValue(slmts[1]!, { married: true })).toBe(true)
  })
})

describe('draftFromDetails', () => {
  it('turns stored values into editable ones, numbers included', () => {
    const fields: FieldDefinition[] = [
      { key: 'age', label: 'Age', type: 'number' },
      { key: 'vow', label: 'Vow', type: 'boolean' },
    ]
    expect(draftFromDetails(fields, { age: 30, vow: true })).toEqual({ age: '30', vow: true })
    expect(draftFromDetails(slmts, stored)).toEqual({
      gothram: 'Bharadwaja',
      married: false,
      gothramMother: 'Vasishta',
    })
  })

  it('leaves out what was never stored', () => {
    expect(draftFromDetails(slmts, {})).toEqual({})
  })
})

describe('detailsFromDraft', () => {
  it('trims text, drops blanks, and records an unticked box as false', () => {
    expect(detailsFromDraft(slmts, { gothram: '  Bharadwaja ', gothramMother: '   ' })).toEqual({
      gothram: 'Bharadwaja',
      married: false,
    })
  })

  it('leaves out a field the answers hide, even one the person filled in earlier', () => {
    const draft = {
      gothram: 'A',
      married: false,
      gothramSpouse: 'typed then unticked',
      gothramMother: 'B',
    }
    expect(detailsFromDraft(slmts, draft)).toEqual({
      gothram: 'A',
      married: false,
      gothramMother: 'B',
    })
    expect(detailsFromDraft(slmts, { ...draft, married: true })).toMatchObject({
      gothramSpouse: 'typed then unticked',
    })
  })

  it('parses numbers, keeping an unparseable one as NaN so it can be reported', () => {
    const fields: FieldDefinition[] = [{ key: 'age', label: 'Age', type: 'number' }]
    expect(detailsFromDraft(fields, { age: ' 42 ' })).toEqual({ age: 42 })
    expect(detailsFromDraft(fields, { age: 'x' })).toEqual({ age: NaN })
  })
})

describe('detailsPatch', () => {
  it('is undefined when nothing changed', () => {
    expect(detailsPatch(slmts, draftFromDetails(slmts, stored), stored)).toBeUndefined()
  })

  it('carries only the keys that changed', () => {
    const draft = { ...draftFromDetails(slmts, stored), gothramMother: 'Kashyapa' }
    expect(detailsPatch(slmts, draft, stored)).toEqual({ gothramMother: 'Kashyapa' })
  })

  it('sends a cleared field as a blank string', () => {
    expect(detailsPatch(rr, { gothram: '' }, { gothram: 'A' })).toEqual({ gothram: '' })
  })

  it('treats an unanswered box and a stored false as the same thing', () => {
    expect(
      detailsPatch(
        slmts,
        { gothram: 'A', gothramMother: 'B' },
        { gothram: 'A', gothramMother: 'B' },
      ),
    ).toBeUndefined()
  })

  it('sends only the toggle when a conditional field is hidden again', () => {
    const married = { ...stored, married: true, gothramSpouse: 'Kashyapa' }
    const draft = { ...draftFromDetails(slmts, married), married: false }
    // The spouse's gothram is not in the patch: hiding it is the server's job, driven by `married`.
    expect(detailsPatch(slmts, draft, married)).toEqual({ married: false })
  })

  it('does not send a field the profile never had and the person left blank', () => {
    expect(detailsPatch(rr, {}, {})).toBeUndefined()
  })

  it('never includes a non-editable field', () => {
    const fields: FieldDefinition[] = [{ key: 'id', label: 'Id', type: 'text', editable: false }]
    expect(detailsPatch(fields, { id: 'new' }, { id: 'old' })).toBeUndefined()
  })
})

describe('registrationDetailsError', () => {
  it('names the first missing required field in the words a person reads', () => {
    expect(registrationDetailsError(rr, {})).toBe('Gothram is required.')
    expect(registrationDetailsError(slmts, { gothram: 'A' })).toBe("Mother's gothram is required.")
  })

  it('asks for the spouse only once married is ticked', () => {
    const answers = { gothram: 'A', gothramMother: 'B' }
    expect(registrationDetailsError(slmts, answers)).toBeNull()
    expect(registrationDetailsError(slmts, { ...answers, married: true })).toBe(
      "Wife's gothram is required.",
    )
  })

  it('reports a number that is not one', () => {
    const fields: FieldDefinition[] = [{ key: 'age', label: 'Age', type: 'number' }]
    expect(registrationDetailsError(fields, { age: 'x' })).toBe('Age must be a number.')
  })

  it('is fine for a school that collects nothing', () => {
    expect(registrationDetailsError([], {})).toBeNull()
  })
})

describe('editDetailsError', () => {
  it('requires the spouse gothram the moment married is ticked', () => {
    expect(editDetailsError(slmts, stored, { married: true })).toBe("Wife's gothram is required.")
    expect(editDetailsError(slmts, stored, { married: true, gothramSpouse: 'K' })).toBeNull()
  })

  it('does not demand a field a profile predates', () => {
    expect(editDetailsError(slmts, {}, { gothramMother: 'B' })).toBeNull()
  })

  it('refuses to blank a required field', () => {
    expect(editDetailsError(slmts, stored, { gothram: '' })).toBe('Gothram is required.')
  })
})

describe('displayDetail', () => {
  it('shows text as is and nothing for an unanswered one', () => {
    expect(displayDetail(rr[0]!, { gothram: 'Bharadwaja' })).toBe('Bharadwaja')
    expect(displayDetail(rr[0]!, {})).toBeNull()
  })

  it('shows a boolean as Yes or No, unanswered included', () => {
    expect(displayDetail(slmts[1]!, { married: true })).toBe('Yes')
    expect(displayDetail(slmts[1]!, {})).toBe('No')
  })

  it("shows a select's label rather than its value", () => {
    const fields: FieldDefinition[] = [
      { key: 'house', label: 'House', type: 'select', options: [{ value: 'a', label: 'Alpha' }] },
    ]
    expect(displayDetail(fields[0]!, { house: 'a' })).toBe('Alpha')
  })
})
