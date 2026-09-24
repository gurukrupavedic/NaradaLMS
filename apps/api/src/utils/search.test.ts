import { describe, expect, it } from 'vitest'

import { escapeLike } from './search'

describe('escapeLike', () => {
  it('leaves ordinary text alone', () => {
    expect(escapeLike('Track 1')).toBe('Track 1')
  })

  it('escapes LIKE wildcards and the escape character itself', () => {
    expect(escapeLike('100%_done\\')).toBe('100\\%\\_done\\\\')
  })
})
