/**
 * Extracts the first valid font family name from a CSS font-family string.
 * Removes quotes and skips generic families like 'sans-serif'.
 */
export function extractFontFamily(fontFamily: string) {
  const cleaned = fontFamily.replace(/['"]/g, "");
  const fonts = cleaned.split(",").map((f) => f.trim());

  const genericFonts = new Set([
    "serif",
    "sans-serif",
    "monospace",
    "cursive",
    "fantasy",
    "system-ui",
    "ui-serif",
    "ui-sans-serif",
    "ui-monospace",
    "-apple-system",
    "BlinkMacSystemFont",
  ]);

  return fonts.find((f) => !genericFonts.has(f));
}

/**
 * Normalizes a CSS font-family string into a DOCX-friendly font name.
 */
export function normalizeDocxFont(fontFamily: string | undefined) {
  return fontFamily ? extractFontFamily(fontFamily) : undefined;
}
