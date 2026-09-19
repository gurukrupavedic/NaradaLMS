import { describe, expect, it } from 'vitest'

import { advancedOptions } from './cookies'

describe('advancedOptions', () => {
  it('shares the session cookie across subdomains when a cookie domain is configured', () => {
    expect(advancedOptions('.slmts.naradas.app')).toEqual({
      crossSubDomainCookies: { enabled: true, domain: '.slmts.naradas.app' },
    })
  })

  it('leaves the cookie host-only when none is configured', () => {
    expect(advancedOptions(undefined)).toBeUndefined()
  })
})
