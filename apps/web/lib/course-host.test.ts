import { describe, expect, it } from 'vitest'

import { cookieDomainFor, courseOrigin, courseSlugFromHost } from './course-host'

const BASE = 'slmts.naradas.app'

describe('courseSlugFromHost', () => {
  it('reads the course from the label in front of the base domain', () => {
    expect(courseSlugFromHost('vedam.slmts.naradas.app', BASE)).toBe('vedam')
    expect(courseSlugFromHost('smartam.slmts.naradas.app', BASE)).toBe('smartam')
  })

  it('ignores a port and letter case — hostnames are case-insensitive', () => {
    expect(courseSlugFromHost('Vedam.SLMTS.naradas.app:3001', BASE)).toBe('vedam')
    expect(courseSlugFromHost('vedam.slmts.naradas.app', 'SLMTS.Naradas.App')).toBe('vedam')
  })

  it('accepts a base domain written with a leading dot', () => {
    expect(courseSlugFromHost('vedam.slmts.naradas.app', '.slmts.naradas.app')).toBe('vedam')
  })

  it('accepts hyphenated and numeric labels', () => {
    expect(courseSlugFromHost('smartam-2.slmts.naradas.app', BASE)).toBe('smartam-2')
    expect(courseSlugFromHost('2.slmts.naradas.app', BASE)).toBe('2')
  })

  it('is no course for the bare base domain', () => {
    expect(courseSlugFromHost('slmts.naradas.app', BASE)).toBeUndefined()
  })

  it('is no course when more than one label sits in front of the base domain', () => {
    expect(courseSlugFromHost('a.vedam.slmts.naradas.app', BASE)).toBeUndefined()
  })

  it.each([
    'vedam.slmts.naradas.app.evil.com',
    'evilslmts.naradas.app',
    'slmts.naradas.app.evil.com',
    'vedam.other.naradas.app',
    'localhost',
    'vedam.localhost',
    'web-abc-gurukrupa-vedic.vercel.app',
  ])('is no course for a host outside the base domain (%s)', host => {
    expect(courseSlugFromHost(host, BASE)).toBeUndefined()
  })

  it.each(['-vedam', 'vedam-', 've dam', 've_dam', 've.dam', ''])(
    'rejects a label that is not a valid DNS label (%j)',
    label => {
      expect(courseSlugFromHost(`${label}.${BASE}`, BASE)).toBeUndefined()
    },
  )

  it('is no course at all when no base domain is configured', () => {
    expect(courseSlugFromHost('vedam.slmts.naradas.app', undefined)).toBeUndefined()
    expect(courseSlugFromHost('vedam.slmts.naradas.app', '')).toBeUndefined()
    expect(courseSlugFromHost('vedam.localhost', undefined)).toBeUndefined()
  })
})

describe('cookieDomainFor', () => {
  it('shares a cookie across every course address on the domain', () => {
    expect(cookieDomainFor('vedam.slmts.naradas.app', BASE)).toBe('.slmts.naradas.app')
    expect(cookieDomainFor('slmts.naradas.app', BASE)).toBe('.slmts.naradas.app')
    expect(cookieDomainFor('smartam.slmts.naradas.app:8443', BASE)).toBe('.slmts.naradas.app')
  })

  it('leaves a cookie host-only anywhere else, where the browser would reject a foreign Domain', () => {
    expect(cookieDomainFor('localhost', BASE)).toBeUndefined()
    expect(cookieDomainFor('web-abc.vercel.app', BASE)).toBeUndefined()
    expect(cookieDomainFor('evilslmts.naradas.app', BASE)).toBeUndefined()
  })

  it('is host-only when no base domain is configured', () => {
    expect(cookieDomainFor('vedam.slmts.naradas.app', undefined)).toBeUndefined()
  })
})

describe('courseOrigin', () => {
  const https = { protocol: 'https:', hostname: 'vedam.slmts.naradas.app', port: '' }

  it('points at another course on the same domain, keeping protocol and port', () => {
    expect(courseOrigin(https, 'smartam', BASE)).toBe('https://smartam.slmts.naradas.app')
    expect(courseOrigin({ ...https, port: '8443' }, 'smartam', BASE)).toBe(
      'https://smartam.slmts.naradas.app:8443',
    )
  })

  it('works from the bare base domain too', () => {
    expect(courseOrigin({ ...https, hostname: 'slmts.naradas.app' }, 'vedam', BASE)).toBe(
      'https://vedam.slmts.naradas.app',
    )
  })

  it('has nowhere to point when this address is outside the course domain', () => {
    expect(
      courseOrigin({ protocol: 'http:', hostname: 'localhost', port: '3001' }, 'vedam', BASE),
    ).toBeUndefined()
    expect(courseOrigin(https, 'smartam', undefined)).toBeUndefined()
  })
})
