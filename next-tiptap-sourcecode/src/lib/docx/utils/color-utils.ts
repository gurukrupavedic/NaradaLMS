/**
 * Converts an RGB string (e.g. "rgb(255, 128, 64)") to a HEX color ("#FF8040").
 */
function rgbToHex(rgbString: string): string {
  const values = rgbString.match(/\d+/g);
  if (!values || values.length !== 3) {
    throw new Error("Invalid RGB string format");
  }

  const toHex = (n: string) => {
    const num = parseInt(n, 10);
    if (num < 0 || num > 255) {
      throw new Error("RGB values must be between 0 and 255");
    }
    return num.toString(16).padStart(2, "0");
  };

  return `#${values.map(toHex).join("")}`;
}

/**
 * Converts color strings (hex, #RGB, rgb()) to a HEX format used by DOCX (without #).
 * - "#abc" → "AABBCC"
 * - "#aabbcc" → "AABBCC"
 * - "rgb(255,0,0)" → "FF0000"
 */
function extractColor(color: string | undefined) {
  if (!color) return undefined;

  if (color.startsWith("#")) {
    const hex = color.slice(1);

    // Full hex (#RRGGBB)
    if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
      return hex.toUpperCase();
    }

    // Short hex (#RGB)
    if (/^[0-9A-Fa-f]{3}$/.test(hex)) {
      return hex
        .split("")
        .map((c) => c + c)
        .join("")
        .toUpperCase();
    }
  }

  if (color.startsWith("rgb")) {
    return rgbToHex(color).slice(1).toUpperCase();
  }

  return undefined;
}

/**
 * Normalizes a color for DOCX.
 * Returns uppercase 6-digit hex without "#".
 * Defaults to undefined for invalid input.
 */
export function normalizeDocxColor(
  color: string | undefined
): string | undefined {
  try {
    return extractColor(color)?.toUpperCase();
  } catch {
    return undefined;
  }
}
