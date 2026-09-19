import { describe, expect, it } from 'vitest'

import { isValidCourseSlug, RESERVED_COURSE_SLUGS } from './courseSlug'

describe('isValidCourseSlug', () => {
  it.each(['vedam', 'smartam', 'smartam-2', 'a', '2026', 'ved-am'])('accepts %s', slug => {
    expect(isValidCourseSlug(slug)).toBe(true)
  })

  it.each(['', 'Vedam', 'VEDAM', 've dam', 've_dam', 've.dam', '-vedam', 'vedam-', 've--dam', 'vedam/x', 'védam'])(
    'rejects %j — not a lower-case URL segment',
    slug => {
      expect(isValidCourseSlug(slug)).toBe(false)
    },
  )

  it.each(RESERVED_COURSE_SLUGS)('rejects the reserved word %s', slug => {
    expect(isValidCourseSlug(slug)).toBe(false)
  })

  it('reserves every route the web app serves at the top level', () => {
    for (const route of ['login', 'link-device', 'register', 'coming-soon']) {
      expect(RESERVED_COURSE_SLUGS).toContain(route)
    }
  })
})
