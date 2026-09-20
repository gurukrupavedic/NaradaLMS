import { describe, expect, it } from 'vitest'

import { resolveSchoolSlug, schoolFromHostname } from './school-host'

describe('schoolFromHostname', () => {
  it.each([
    ['slmts.naradas.app', 'slmts'],
    ['rr.naradas.app', 'rr'],
    ['my-school-2.naradas.app', 'my-school-2'],
    ['SLMTS.Naradas.App', 'slmts'],
  ])('%s is the %s school', (hostname, school) => {
    expect(schoolFromHostname(hostname)).toBe(school)
  })

  it.each([
    'naradas.app',
    'www.naradas.app',
    'a.b.naradas.app',
    '.naradas.app',
    'bad_label.naradas.app',
    'localhost',
    'slmts.localhost',
    'narada-lms-git-main.vercel.app',
    'abc.ngrok-free.app',
    // A different domain that merely ends the same way must not match.
    'slmts.notnaradas.app',
    'slmts.naradas.app.evil.com',
  ])('is no school for %s', hostname => {
    expect(schoolFromHostname(hostname)).toBeNull()
  })
})

describe('resolveSchoolSlug', () => {
  it('prefers the address over the fallback', () => {
    expect(resolveSchoolSlug('rr.naradas.app', 'slmts')).toBe('rr')
  })

  it('falls back when the address names no school', () => {
    expect(resolveSchoolSlug('naradas.app', 'slmts')).toBe('slmts')
    expect(resolveSchoolSlug('localhost', 'slmts')).toBe('slmts')
  })

  it('is null when nothing names a school', () => {
    expect(resolveSchoolSlug('localhost', undefined)).toBeNull()
    expect(resolveSchoolSlug('localhost', '')).toBeNull()
  })
})
