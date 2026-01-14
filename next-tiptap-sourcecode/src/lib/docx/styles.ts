import { AlignmentType, IStylesOptions, ShadingType } from "docx";

import { COLORS, FONT_SIZES, FONTS, LINE_HEIGHTS } from "./constants";
import { deepMerge, mergeArrayByKey } from "./utils";

/**
 * Default paragraph styles for DOCX documents
 * Consistent font family, proper sizing, and visual hierarchy
 */
export const DEFAULT_STYLES: IStylesOptions = {
  paragraphStyles: [
    // ========================================
    // Base Styles
    // ========================================
    {
      id: "Normal",
      name: "Normal",
      run: {
        font: FONTS.body,
        size: FONT_SIZES.normal,
      },
      paragraph: {
        spacing: {
          before: 0,
          after: 160,
          line: LINE_HEIGHTS.paragraph,
        },
      },
    },
    {
      id: "NoSpacing",
      name: "No Spacing",
      basedOn: "Normal",
      quickFormat: true,
      paragraph: {
        spacing: {
          before: 0,
          after: 0,
          line: LINE_HEIGHTS.tight,
        },
      },
    },

    // ========================================
    // Headings - Unified font family
    // ========================================
    {
      id: "Heading1",
      name: "Heading 1",
      basedOn: "Normal",
      next: "Normal",
      quickFormat: true,
      run: {
        font: FONTS.heading,
        size: FONT_SIZES.h1,
        bold: true,
        color: COLORS.heading.primary,
      },
      paragraph: {
        spacing: {
          before: 240,
          after: 120,
          line: LINE_HEIGHTS.heading,
        },
      },
    },
    {
      id: "Heading2",
      name: "Heading 2",
      basedOn: "Normal",
      next: "Normal",
      quickFormat: true,
      run: {
        font: FONTS.heading,
        size: FONT_SIZES.h2,
        bold: true,
        color: COLORS.heading.primary,
      },
      paragraph: {
        spacing: {
          before: 200,
          after: 120,
          line: LINE_HEIGHTS.heading,
        },
      },
    },
    {
      id: "Heading3",
      name: "Heading 3",
      basedOn: "Normal",
      next: "Normal",
      quickFormat: true,
      run: {
        font: FONTS.heading,
        size: FONT_SIZES.h3,
        bold: true,
        color: COLORS.heading.primary,
      },
      paragraph: {
        spacing: {
          before: 200,
          after: 120,
          line: LINE_HEIGHTS.heading,
        },
      },
    },
    {
      id: "Heading4",
      name: "Heading 4",
      basedOn: "Normal",
      next: "Normal",
      quickFormat: true,
      run: {
        font: FONTS.heading,
        size: FONT_SIZES.h4,
        bold: true,
        color: COLORS.heading.secondary,
      },
      paragraph: {
        spacing: {
          before: 200,
          after: 120,
          line: LINE_HEIGHTS.heading,
        },
      },
    },
    {
      id: "Heading5",
      name: "Heading 5",
      basedOn: "Normal",
      next: "Normal",
      quickFormat: true,
      run: {
        font: FONTS.heading,
        size: FONT_SIZES.h5,
        bold: true,
        color: COLORS.heading.secondary,
      },
      paragraph: {
        spacing: {
          before: 200,
          after: 120,
          line: LINE_HEIGHTS.heading,
        },
      },
    },
    {
      id: "Heading6",
      name: "Heading 6",
      basedOn: "Normal",
      next: "Normal",
      quickFormat: true,
      run: {
        font: FONTS.heading,
        size: FONT_SIZES.h6,
        bold: true,
        color: COLORS.text.secondary,
      },
      paragraph: {
        spacing: {
          before: 200,
          after: 120,
          line: LINE_HEIGHTS.heading,
        },
      },
    },

    // ========================================
    // Title & Subtitle
    // ========================================
    {
      id: "Title",
      name: "Title",
      basedOn: "Normal",
      next: "Normal",
      quickFormat: true,
      run: {
        font: FONTS.heading,
        size: FONT_SIZES.title,
        bold: true,
        color: COLORS.heading.primary,
      },
      paragraph: {
        alignment: AlignmentType.CENTER,
        spacing: {
          before: 0,
          after: 240,
          line: LINE_HEIGHTS.heading,
        },
      },
    },
    {
      id: "Subtitle",
      name: "Subtitle",
      basedOn: "Normal",
      next: "Normal",
      quickFormat: true,
      run: {
        font: FONTS.body,
        size: FONT_SIZES.subtitle,
        color: COLORS.text.secondary,
      },
      paragraph: {
        alignment: AlignmentType.CENTER,
        spacing: {
          before: 0,
          after: 240,
          line: LINE_HEIGHTS.normal,
        },
      },
    },

    // ========================================
    // Lists
    // ========================================
    {
      id: "ListParagraph",
      name: "List Paragraph",
      basedOn: "Normal",
      quickFormat: true,
      run: {
        font: FONTS.body,
        size: FONT_SIZES.normal,
      },
      paragraph: {
        spacing: {
          before: 0,
          after: 40,
          line: LINE_HEIGHTS.list,
        },
      },
    },

    // ========================================
    // Quotes
    // ========================================
    {
      id: "Quote",
      name: "Quote",
      basedOn: "Normal",
      quickFormat: true,
      run: {
        font: FONTS.body,
        italics: true,
        color: COLORS.quote.text,
      },
      paragraph: {
        alignment: AlignmentType.CENTER,
        spacing: {
          before: 160,
          after: 160,
          line: LINE_HEIGHTS.quote,
        },
      },
    },
    {
      id: "IntenseQuote",
      name: "Intense Quote",
      basedOn: "Normal",
      quickFormat: true,
      run: {
        font: FONTS.body,
        italics: true,
        bold: true,
        color: COLORS.quote.text,
      },
      paragraph: {
        alignment: AlignmentType.CENTER,
        spacing: {
          before: 200,
          after: 200,
          line: LINE_HEIGHTS.quote,
        },
        border: {
          top: {
            color: COLORS.quote.border,
            style: "single",
            size: 6,
            space: 1,
          },
          bottom: {
            color: COLORS.quote.border,
            style: "single",
            size: 6,
            space: 1,
          },
        },
      },
    },
    {
      id: "Blockquote",
      name: "Block Quote",
      basedOn: "Normal",
      quickFormat: true,
      run: {
        font: FONTS.body,
        color: COLORS.quote.text,
      },
      paragraph: {
        spacing: {
          before: 160,
          after: 160,
          line: LINE_HEIGHTS.relaxed,
        },
        shading: {
          type: ShadingType.CLEAR,
          color: COLORS.quote.background,
        },
        border: {
          left: {
            color: COLORS.quote.border,
            space: 4,
            style: "single",
            size: 16,
          },
        },
      },
    },

    // ========================================
    // Caption
    // ========================================
    {
      id: "Caption",
      name: "Caption",
      basedOn: "Normal",
      quickFormat: true,
      run: {
        font: FONTS.body,
        size: FONT_SIZES.small,
        italics: true,
        color: COLORS.text.secondary,
      },
      paragraph: {
        alignment: AlignmentType.CENTER,
        spacing: {
          before: 0,
          after: 120,
          line: LINE_HEIGHTS.tight,
        },
      },
    },

    // ========================================
    // Code Block
    // ========================================
    {
      id: "CodeBlock",
      name: "CodeBlock",
      basedOn: "Normal",
      quickFormat: true,
      run: {
        font: FONTS.code,
        size: FONT_SIZES.small,
      },
      paragraph: {
        spacing: {
          before: 0,
          after: 0,
          line: LINE_HEIGHTS.code,
        },
      },
    },
  ],

  // ========================================
  // Character Styles
  // ========================================
  characterStyles: [
    {
      id: "Code",
      name: "Code Character",
      basedOn: "DefaultParagraphFont",
      run: {
        font: FONTS.code,
        size: FONT_SIZES.code,
        color: COLORS.code.text,
        shading: {
          type: ShadingType.CLEAR,
          fill: COLORS.code.background,
        },
      },
    },
    {
      id: "Hyperlink",
      name: "Hyperlink Character",
      basedOn: "DefaultParagraphFont",
      run: {
        color: COLORS.link,
        underline: { type: "single" },
      },
    },
  ],
};

/**
 * Process and merge custom styles with default styles
 *
 * @param customStyles - Custom style configuration
 * @param useDefaults - Whether to merge with default styles (default: true)
 * @returns Processed styles configuration
 */
export function processStyles(
  customStyles: IStylesOptions = {},
  useDefaults: boolean = true
): IStylesOptions {
  if (!useDefaults) {
    return customStyles;
  }

  return deepMerge(DEFAULT_STYLES, customStyles, {
    mergeArray: mergeArrayByKey("id"),
  });
}
