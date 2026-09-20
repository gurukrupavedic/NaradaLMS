import { describe, expect, it } from 'vitest'

import { isPasswordCorrect, isUnlocked, previewToken } from './preview-unlock'

describe('previewToken', () => {
  it('is deterministic for a password', async () => {
    expect(await previewToken('open sesame')).toBe(await previewToken('open sesame'))
  })

  it('differs between passwords, so rotating the password invalidates old cookies', async () => {
    expect(await previewToken('open sesame')).not.toBe(await previewToken('open sesame!'))
  })

  it('is 64 lowercase hex characters and does not contain the password', async () => {
    const token = await previewToken('open sesame')
    expect(token).toMatch(/^[0-9a-f]{64}$/)
    expect(token).not.toContain('open sesame')
  })
})

describe('isPasswordCorrect', () => {
  it('accepts the password', async () => {
    expect(await isPasswordCorrect('open sesame', 'open sesame')).toBe(true)
  })

  it.each(['', 'open sesam', 'open sesame ', 'OPEN SESAME', 'x'.repeat(10_000)])(
    'rejects %j',
    async submitted => {
      expect(await isPasswordCorrect(submitted, 'open sesame')).toBe(false)
    },
  )

  it('never accepts anything when no password is configured', async () => {
    expect(await isPasswordCorrect('', '')).toBe(false)
    expect(await isPasswordCorrect('anything', '')).toBe(false)
  })
})

describe('isUnlocked', () => {
  it('is true for the cookie the password produces', async () => {
    expect(await isUnlocked(await previewToken('open sesame'), 'open sesame')).toBe(true)
  })

  it('is false once the password has been rotated', async () => {
    expect(await isUnlocked(await previewToken('old password'), 'new password')).toBe(false)
  })

  it.each([undefined, '', 'not-a-token', 'a'.repeat(64)])('is false for cookie %j', async cookie => {
    expect(await isUnlocked(cookie, 'open sesame')).toBe(false)
  })

  it('is false when no password is configured, whatever the cookie', async () => {
    expect(await isUnlocked(await previewToken('open sesame'), undefined)).toBe(false)
    expect(await isUnlocked(await previewToken('open sesame'), '')).toBe(false)
  })
})
