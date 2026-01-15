import { createHighlightPlugin } from "prosemirror-highlight";
import { createParser, type Parser } from "prosemirror-highlight/shiki";

import { createHighlighter, isSpecialLanguage } from "@/lib/shiki";

import type { Highlighter, BundledLanguage } from "@/lib/shiki";

let highlighter: Highlighter | undefined;
let parser: Parser | undefined;

const lazyParser: Parser = (options) => {
  if (!highlighter) {
    return createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: ["text"],
    }).then((h) => {
      highlighter = h;
    });
  }

  const language = options.language as BundledLanguage;
  const loadedLanguages = highlighter.getLoadedLanguages();

  if (!isSpecialLanguage(language) && !loadedLanguages.includes(language)) {
    return highlighter.loadLanguage(language);
  }

  if (!parser) {
    parser = createParser(highlighter, {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      defaultColor: false,
      cssVariablePrefix: "--rte-shiki-",
    });
  }

  return parser(options);
};

export const shikiPlugin = createHighlightPlugin({
  parser: lazyParser,
});
