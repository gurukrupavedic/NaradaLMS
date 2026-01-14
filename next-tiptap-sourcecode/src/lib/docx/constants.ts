import { inchesToTwip, millimetersToTwip } from "./utils";

// ========================================
// Page Setup
// ========================================
// prettier-ignore
export const PAGE_SIZE = {
  width: millimetersToTwip(210),    // A4: 210mm
  height: millimetersToTwip(297),   // A4: 297mm
  orientation: "portrait",
} as const;

export const PAGE_MARGIN = {
  top: inchesToTwip(1),
  right: inchesToTwip(1),
  bottom: inchesToTwip(1),
  left: inchesToTwip(1),
  header: inchesToTwip(0.5),
  footer: inchesToTwip(0.5),
  gutter: 0,
} as const;

// ========================================
// Fonts
// ========================================
export const FONTS = {
  body: "Calibri",
  heading: "Calibri",
  code: "Consolas",
} as const;

// ========================================
// Colors
// ========================================
export const COLORS = {
  text: {
    primary: "000000",
    secondary: "666666",
    muted: "999999",
  },
  heading: {
    primary: "2E74B5",
    secondary: "1F4E78",
  },
  link: "0563C1",
  code: {
    text: "6F42C1",
    background: "E8E8E8",
    border: "E1E4E8",
  },
  quote: {
    text: "6A737D",
    border: "7D797A",
    background: "F6F8FA",
  },
} as const;

// ========================================
// Font Sizes (in half-points)
// ========================================
// prettier-ignore
export const FONT_SIZES = {
  normal: 24,   // 12pt - body text
  small: 20,    // 10pt - footnotes, captions
  large: 28,    // 14pt - emphasis
  h1: 40,       // 20pt - main title
  h2: 36,       // 18pt - major sections
  h3: 32,       // 16pt - subsections
  h4: 28,       // 14pt - minor headings
  h5: 26,       // 13pt - small headings
  h6: 24,       // 12pt - smallest headings
  title: 52,    // 26pt - document title
  subtitle: 32, // 16pt - subtitle
  code: 22,     // 11pt - code blocks (slightly smaller than body)
} as const;

// ========================================
// Line Heights (in 240ths of a line)
// ========================================
// prettier-ignore
export const LINE_HEIGHTS = {
  tight: 240,      // 1.0x - single spacing
  normal: 276,     // 1.15x - standard spacing
  relaxed: 360,    // 1.5x - one and a half spacing
  loose: 480,      // 2.0x - double spacing
  
  heading: 288,    // 1.2x - slightly tighter for headings
  paragraph: 276,  // 1.15x - standard paragraph spacing
  list: 240,       // 1.0x - compact list items
  quote: 300,      // 1.25x - slightly relaxed for quotes
  code: 300,       // 1.25x 
} as const;
