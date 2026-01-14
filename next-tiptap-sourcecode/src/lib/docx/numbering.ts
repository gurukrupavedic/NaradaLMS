import {
  deepMerge,
  inchesToTwip,
  keyBy,
  mergeArrayByKey,
  pointsToTwip,
} from "./utils";

import type { INumberingOptions } from "docx";

/**
 * Generate default list style for a given nesting level
 */
const getDefaultListStyle = (level: number) => ({
  paragraph: {
    indent: {
      left: inchesToTwip(0.5 * (level + 1)),
      hanging: inchesToTwip(0.25),
    },
    spacing: {
      before: pointsToTwip(3),
      after: pointsToTwip(3),
    },
  },
});

/**
 * Default numbering configurations for bullet and ordered lists
 */
export const DEFAULT_NUMBERING: INumberingOptions["config"] = [
  {
    reference: "bulletList",
    levels: ["\u25CF", "\u25CB", "\u25A0"].map((text, level) => ({
      level,
      format: "bullet",
      text,
      style: getDefaultListStyle(level),
    })),
  },
  {
    reference: "orderedList",
    levels: (["decimal", "lowerLetter", "lowerRoman"] as const).map(
      (format, level) => ({
        level,
        format,
        text: `%${level + 1}.`,
        style: getDefaultListStyle(level),
      })
    ),
  },
];

/**
 * Process and merge custom numbering configurations with defaults
 *
 * @param customNumbering - Custom numbering configuration
 * @param useDefaults - Whether to merge with default numbering (default: true)
 * @returns Processed numbering configuration
 */
export function processNumbering(
  customNumbering: INumberingOptions["config"] = [],
  useDefault: boolean = true
): INumberingOptions {
  if (!useDefault) {
    return { config: customNumbering };
  }

  const merged = deepMerge(
    keyBy([...DEFAULT_NUMBERING], "reference"),
    keyBy([...customNumbering], "reference"),
    { mergeArray: mergeArrayByKey("level") }
  );

  return {
    config: Object.values(merged),
  };
}
