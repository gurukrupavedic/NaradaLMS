import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'

import { parseDocxParagraphs } from './docx'

/**
 * The smallest zip our own reader needs — just `word/document.xml`. Real `.docx` files carry a
 * `[Content_Types].xml` and various `_rels` too, but nothing in `parseDocxParagraphs` reads them.
 */
async function buildTestDocx(bodyXml: string): Promise<Buffer> {
  const zip = new JSZip()
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
      `<w:body>${bodyXml}</w:body></w:document>`,
  )
  return zip.generateAsync({ type: 'nodebuffer' })
}

function paragraph(styleId: string | null, text: string): string {
  const style = styleId ? `<w:pPr><w:pStyle w:val="${styleId}"/></w:pPr>` : ''
  return `<w:p>${style}<w:r><w:t>${text}</w:t></w:r></w:p>`
}

describe('parseDocxParagraphs', () => {
  it('reads paragraph text and recognized styles', async () => {
    const buf = await buildTestDocx(
      paragraph('Title', 'Foundational') + paragraph('Heading1', 'TRACK 1') + paragraph('Heading2', 'Chapter One') + paragraph(null, 'Some chant text'),
    )
    await expect(parseDocxParagraphs(buf)).resolves.toEqual([
      { style: 'Title', text: 'Foundational' },
      { style: 'Heading1', text: 'TRACK 1' },
      { style: 'Heading2', text: 'Chapter One' },
      { style: null, text: 'Some chant text' },
    ])
  })

  it('treats an unrecognized style id as no style at all', async () => {
    const buf = await buildTestDocx(paragraph('ListParagraph', 'a bullet, not a heading'))
    await expect(parseDocxParagraphs(buf)).resolves.toEqual([{ style: null, text: 'a bullet, not a heading' }])
  })

  it('joins text across multiple runs regardless of formatting between them', async () => {
    // Real documents split a paragraph's text across several <w:r> runs when the font changes
    // mid-paragraph (diacritics routinely land in their own run/font) — nothing about which run
    // carries which font should affect the joined text.
    const buf = await buildTestDocx(
      '<w:p><w:r><w:rPr><w:rFonts w:cs="FontA"/></w:rPr><w:t>hello </w:t></w:r>' +
        '<w:r><w:rPr><w:rFonts w:cs="FontB"/></w:rPr><w:t>world</w:t></w:r></w:p>',
    )
    await expect(parseDocxParagraphs(buf)).resolves.toEqual([{ style: null, text: 'hello world' }])
  })

  it('ignores bookmarks interspersed between runs', async () => {
    const buf = await buildTestDocx(
      '<w:p><w:bookmarkStart w:id="1" w:name="x"/><w:r><w:t>hello</w:t></w:r><w:bookmarkEnd w:id="1"/></w:p>',
    )
    await expect(parseDocxParagraphs(buf)).resolves.toEqual([{ style: null, text: 'hello' }])
  })

  it('excludes everything inside a table, never emitting those paragraphs at all', async () => {
    const buf = await buildTestDocx(
      paragraph('Heading2', 'Chapter One') +
        '<w:tbl><w:tr><w:tc>' +
        paragraph(null, 'appendix table content') +
        '</w:tc></w:tr></w:tbl>' +
        paragraph(null, 'real chant line'),
    )
    await expect(parseDocxParagraphs(buf)).resolves.toEqual([
      { style: 'Heading2', text: 'Chapter One' },
      { style: null, text: 'real chant line' },
    ])
  })

  it('excludes everything inside a content control (sdt) — the auto-generated table of contents', async () => {
    const buf = await buildTestDocx(
      '<w:sdt><w:sdtContent>' + paragraph('Heading2', 'TOC mirror of a real heading') + '</w:sdtContent></w:sdt>' +
        paragraph(null, 'real content after the TOC'),
    )
    await expect(parseDocxParagraphs(buf)).resolves.toEqual([{ style: null, text: 'real content after the TOC' }])
  })

  it('rejects a buffer with no word/document.xml', async () => {
    const zip = new JSZip()
    zip.file('not-a-docx.txt', 'nope')
    const buf = await zip.generateAsync({ type: 'nodebuffer' })
    await expect(parseDocxParagraphs(buf)).rejects.toThrow(/word\/document\.xml/)
  })
})
