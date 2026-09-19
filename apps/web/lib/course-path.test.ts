import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// The database's own list of words a course may not be called. Read straight from the source file
// (it is dependency-free) so the two lists can't drift apart unnoticed.
import { RESERVED_COURSE_SLUGS } from '../../../packages/db/src/courseSlug'
import {
  coursePath,
  courseFromPathname,
  isCourseRegisterPath,
  RESERVED_TOP_LEVEL_SEGMENTS,
} from './course-path'

describe('courseFromPathname', () => {
  it('is the first path segment', () => {
    expect(courseFromPathname('/vedam')).toBe('vedam')
    expect(courseFromPathname('/vedam/dashboard')).toBe('vedam')
    expect(courseFromPathname('/smartam-2/admin/batches/VED-1')).toBe('smartam-2')
    expect(courseFromPathname('/vedam/')).toBe('vedam')
  })

  it.each(['/', '', '/login', '/register', '/link-device', '/coming-soon', '/login/anything'])(
    'is no course for the top-level page %j',
    pathname => {
      expect(courseFromPathname(pathname)).toBeNull()
    },
  )

  it.each([
    '/dashboard',
    '/admin/batches',
    '/exams',
    '/practice',
    '/students/x',
    '/chapters/1.1',
    '/settings',
  ])('is no course for an old, pre-course URL (%s)', pathname => {
    expect(courseFromPathname(pathname)).toBeNull()
  })

  it.each(['/Vedam', '/ve dam', '/-vedam', '/vedam-', '/_next/static/x.js', '/v1/courses'])(
    'is no course for something that is not a valid course segment (%s)',
    pathname => {
      expect(courseFromPathname(pathname)).toBeNull()
    },
  )
})

describe('coursePath', () => {
  it('puts the course in front of the route', () => {
    expect(coursePath('vedam', '/dashboard')).toBe('/vedam/dashboard')
    expect(coursePath('vedam', '/admin/registrations?view=batchRequests')).toBe(
      '/vedam/admin/registrations?view=batchRequests',
    )
  })

  it('is just the course for the root, and tolerates a missing leading slash', () => {
    expect(coursePath('vedam')).toBe('/vedam')
    expect(coursePath('vedam', '/')).toBe('/vedam')
    expect(coursePath('vedam', 'exams')).toBe('/vedam/exams')
  })

  it('round-trips with courseFromPathname', () => {
    expect(courseFromPathname(coursePath('smartam', '/practice'))).toBe('smartam')
  })
})

describe('isCourseRegisterPath', () => {
  it('is a course’s application form', () => {
    expect(isCourseRegisterPath('/vedam/register')).toBe(true)
    expect(isCourseRegisterPath('/vedam/register/')).toBe(true)
  })

  it.each([
    '/register',
    '/vedam',
    '/vedam/dashboard',
    '/vedam/register/x',
    '/login/register',
    '/admin/register',
  ])('is not %s', pathname => {
    expect(isCourseRegisterPath(pathname)).toBe(false)
  })
})

describe('the list of reserved top-level words', () => {
  it('is exactly the database’s list of words a course may not be called', () => {
    expect([...RESERVED_TOP_LEVEL_SEGMENTS].sort()).toEqual([...RESERVED_COURSE_SLUGS].sort())
  })

  it('covers every route the app serves at the top level, so none can be shadowed by a course', () => {
    const appDir = join(__dirname, '..', 'app')
    const topLevelRoutes = readdirSync(appDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      // `[course]` is the course segment itself; `(group)` folders and `_private` folders add no URL segment.
      .filter(
        entry =>
          !entry.name.startsWith('[') && !entry.name.startsWith('(') && !entry.name.startsWith('_'),
      )
      .map(entry => entry.name)

    for (const route of topLevelRoutes) {
      expect(RESERVED_TOP_LEVEL_SEGMENTS, `top-level route /${route} must be reserved`).toContain(
        route,
      )
    }
  })
})
