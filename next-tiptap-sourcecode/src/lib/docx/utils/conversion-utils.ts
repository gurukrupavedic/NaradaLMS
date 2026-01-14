import type { PositiveUniversalMeasure } from "docx";

export const lineHeightToDocx = (lh: number) => Math.round(lh * 240);

export const pointsToHalfPoint = (pt: number) => Math.round(pt * 2);
export const pixelsToHalfPoint = (px: number) => Math.round(px * 1.5);

export const twipToPixel = (twip: number) => Math.round(twip / 15);

export const pixelsToTwip = (px: number) => Math.round(px * 15);
export const pointsToTwip = (pt: number) => Math.round(pt * 20);
export const picasToTwip = (pc: number) => Math.round(pc * 240);
export const inchesToTwip = (inch: number) => Math.round(inch * 1440);
export const centimetersToTwip = (cm: number) => Math.round((cm / 2.54) * 1440);
export const millimetersToTwip = (mm: number) => Math.round((mm / 25.4) * 1440);

export const unitToTwip = (
  input: number | PositiveUniversalMeasure
): number => {
  if (typeof input === "number") return input;

  const unit = input.slice(-2);
  const value = parseFloat(input);

  switch (unit) {
    case "mm":
      return millimetersToTwip(value);
    case "cm":
      return centimetersToTwip(value);
    case "in":
      return inchesToTwip(value);
    case "pt":
      return pointsToTwip(value);
    case "pc":
    case "pi":
      return picasToTwip(value);
    default:
      return centimetersToTwip(value);
  }
};
