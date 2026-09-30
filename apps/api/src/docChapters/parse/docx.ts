import JSZip from 'jszip'
import { XMLParser } from 'fast-xml-parser'

/**
 * One `<w:p>` from `word/document.xml`, reduced to just what the rest of the pipeline needs: its
 * paragraph style (only the three we care about — everything else, including body-text styles,
 * comes back `null`) and its full text, joined across every `<w:t>` in the paragraph regardless of
 * which `<w:r>` run or font carries it (diacritics are routinely split onto their own run/font —
 * see the module doc comment on why that makes per-run text unusable on its own).
 */
export type DocxParagraph = {
  style: 'Title' | 'Heading1' | 'Heading2' | null
  text: string
}

// The preserveOrder tree fast-xml-parser returns: each node is `{ [tagName]: XmlNode[] }`, plus an
// optional `:@` holding its attributes (because `attributeNamePrefix` only affects the attribute
// *keys*, not this wrapper). A text leaf (`<w:t>hello</w:t>`) is `{ "w:t": [{ "#text": "hello" }] }`.
type XmlNode = { ':@'?: Record<string, string>; [tag: string]: unknown }

function tagName(node: XmlNode): string | undefined {
  return Object.keys(node).find(key => key !== ':@')
}

function childrenOf(node: XmlNode): XmlNode[] {
  const tag = tagName(node)
  const value = tag ? node[tag] : undefined
  return Array.isArray(value) ? (value as XmlNode[]) : []
}

/** Every descendant of `node` with tag `tag`, at any depth — used only within a single paragraph, never over the whole document. */
function descendantsWithTag(node: XmlNode, tag: string): XmlNode[] {
  const found: XmlNode[] = []
  for (const child of childrenOf(node)) {
    if (tagName(child) === tag) found.push(child)
    found.push(...descendantsWithTag(child, tag))
  }
  return found
}

function textOf(textNode: XmlNode): string {
  return childrenOf(textNode)
    .map(child => (typeof child['#text'] === 'string' ? child['#text'] : ''))
    .join('')
}

function paragraphStyle(p: XmlNode): DocxParagraph['style'] {
  const styleId = descendantsWithTag(p, 'w:pStyle')[0]?.[':@']?.['@_w:val']
  return styleId === 'Title' || styleId === 'Heading1' || styleId === 'Heading2' ? styleId : null
}

function paragraphText(p: XmlNode): string {
  return descendantsWithTag(p, 'w:t')
    .map(textOf)
    .join('')
    .trim()
}

/**
 * Reads `word/document.xml` out of a `.docx` (a zip archive) and reduces it to a flat, ordered
 * list of paragraphs.
 *
 * `<w:tbl>` (a table — the appendix in these documents) and `<w:sdt>` (a content control — the
 * auto-generated table of contents, confirmed against the real source docs to hold *only* mirrored
 * `TOC1`/`TOC2`-styled copies of the real headings, never the headings themselves) are excluded
 * wholesale: neither is descended into, so nothing inside either ever reaches the paragraph list.
 * Everything else that can appear as a direct child of `<w:body>` (`<w:sectPr>`, bookmarks, etc.)
 * carries no paragraph text and is simply skipped.
 */
export async function parseDocxParagraphs(buffer: Buffer): Promise<DocxParagraph[]> {
  const zip = await JSZip.loadAsync(buffer)
  const documentXml = await zip.file('word/document.xml')?.async('text')
  if (documentXml === undefined) {
    throw new Error('not a valid .docx file — word/document.xml is missing')
  }

  // `trimValues: false` matters here specifically: a run boundary routinely falls right at a word
  // space (one run ends "...word ", the next starts "next..."), and the parser's default trims
  // exactly that space away, silently running the two words together.
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    preserveOrder: true,
    trimValues: false,
  })
  const parsed = parser.parse(documentXml) as XmlNode[]

  const documentEl = parsed.find(node => tagName(node) === 'w:document')
  const bodyEl = documentEl && childrenOf(documentEl).find(node => tagName(node) === 'w:body')
  if (!bodyEl) {
    throw new Error('word/document.xml has no <w:document><w:body>')
  }

  const paragraphs: DocxParagraph[] = []
  for (const child of childrenOf(bodyEl)) {
    if (tagName(child) !== 'w:p') continue // w:tbl, w:sdt, w:sectPr, bookmarks, ... — not a paragraph
    paragraphs.push({ style: paragraphStyle(child), text: paragraphText(child) })
  }
  return paragraphs
}
