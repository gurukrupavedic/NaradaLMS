import { describe, expect, it } from 'vitest'

import { UpdateSchoolSchema } from './schema'

describe('UpdateSchoolSchema', () => {
  it('accepts a name-only update', () => {
    expect(UpdateSchoolSchema.safeParse({ name: 'New Name' }).success).toBe(true)
  })

  it('accepts a slug-only update', () => {
    expect(UpdateSchoolSchema.safeParse({ slug: 'new-slug' }).success).toBe(true)
  })

  it('rejects an empty body', () => {
    expect(UpdateSchoolSchema.safeParse({}).success).toBe(false)
  })

  it('rejects an empty-string name', () => {
    expect(UpdateSchoolSchema.safeParse({ name: '' }).success).toBe(false)
  })

  it('rejects a slug with uppercase letters', () => {
    expect(UpdateSchoolSchema.safeParse({ slug: 'New-Slug' }).success).toBe(false)
  })

  it('rejects a slug with an underscore or space', () => {
    expect(UpdateSchoolSchema.safeParse({ slug: 'new_slug' }).success).toBe(false)
    expect(UpdateSchoolSchema.safeParse({ slug: 'new slug' }).success).toBe(false)
  })

  it('accepts a lowercase alphanumeric-and-hyphen slug', () => {
    expect(UpdateSchoolSchema.safeParse({ slug: 'gurukrupa-vedic-2' }).success).toBe(true)
  })

  it('rejects unknown-only fields', () => {
    expect(UpdateSchoolSchema.safeParse({ logo: 'https://example.com/logo.png' }).success).toBe(false)
  })
})
