import { describe, expect, it } from 'vitest'

import { sectionParagraphs } from './sections'
import type { DocxParagraph } from './docx'

function p(style: DocxParagraph['style'], text: string): DocxParagraph {
  return { style, text }
}

describe('sectionParagraphs', () => {
  it('groups body paragraphs under the most recent Heading2, tagged with the current track', () => {
    const sections = sectionParagraphs([
      p('Title', 'Foundational'),
      p('Heading1', 'TRACK 1'),
      p('Heading2', 'Chapter One'),
      p(null, 'verse a'),
      p(null, 'verse b'),
      p('Heading2', 'Chapter Two'),
      p(null, 'verse c'),
    ])
    expect(sections).toEqual([
      { track: 'TRACK 1', title: 'Chapter One', paragraphs: ['verse a', 'verse b'] },
      { track: 'TRACK 1', title: 'Chapter Two', paragraphs: ['verse c'] },
    ])
  })

  it('carries the track label forward across multiple chapters until the next Heading1', () => {
    const sections = sectionParagraphs([
      p('Heading1', 'TRACK 1'),
      p('Heading2', 'A'),
      p('Heading2', 'B'),
      p('Heading1', 'TRACK 2'),
      p('Heading2', 'C'),
    ])
    expect(sections.map(s => s.track)).toEqual(['TRACK 1', 'TRACK 1', 'TRACK 2'])
  })

  it('drops a body paragraph seen before any Heading2 has opened', () => {
    const sections = sectionParagraphs([
      p('Title', 'Foundational'),
      p(null, 'front matter, belongs to no chapter'),
      p('Heading1', 'TRACK 1'),
      p(null, 'still before any chapter'),
      p('Heading2', 'Chapter One'),
      p(null, 'real verse'),
    ])
    expect(sections).toEqual([{ track: 'TRACK 1', title: 'Chapter One', paragraphs: ['real verse'] }])
  })

  it('drops an empty body paragraph rather than keeping it as a blank line', () => {
    const sections = sectionParagraphs([p('Heading2', 'Chapter One'), p(null, ''), p(null, 'a real line')])
    expect(sections[0]?.paragraphs).toEqual(['a real line'])
  })

  it('returns no sections when there is no Heading2 at all', () => {
    expect(sectionParagraphs([p('Title', 'Foundational'), p(null, 'text')])).toEqual([])
  })
})
