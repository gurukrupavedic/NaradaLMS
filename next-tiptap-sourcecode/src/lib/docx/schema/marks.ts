import { ShadingType } from "docx";

import {
  pixelsToHalfPoint,
  normalizeDocxColor,
  normalizeDocxFont,
} from "../utils";

import type { MarkMapping } from "../types";

export const defaultMarkMapping: MarkMapping = {
  bold: () => ({ bold: true }),
  italic: () => ({ italics: true }),
  underline: () => ({ underline: { type: "single" } }),
  strike: () => ({ strike: true }),
  code: () => ({ style: "Code" }),
  link: () => ({ style: "Hyperlink" }),
  superscript: () => ({ superScript: true }),
  subscript: () => ({ subScript: true }),
  textStyle: (mark) => {
    return {
      ...(mark.attrs?.color && {
        color: normalizeDocxColor(mark.attrs.color),
      }),
      ...(mark.attrs?.backgroundColor && {
        shading: {
          type: ShadingType.CLEAR,
          fill: normalizeDocxColor(mark.attrs.backgroundColor),
        },
      }),
      ...(mark.attrs?.fontFamily && {
        font: normalizeDocxFont(mark.attrs.fontFamily),
      }),
      ...(mark.attrs?.fontSize && {
        size: pixelsToHalfPoint(parseInt(mark.attrs.fontSize, 10)),
      }),
    };
  },
};
