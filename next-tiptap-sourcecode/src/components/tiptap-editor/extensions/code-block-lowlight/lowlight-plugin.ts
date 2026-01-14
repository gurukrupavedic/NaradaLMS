import { createHighlightPlugin } from "prosemirror-highlight";
import { createParser, type Parser } from "prosemirror-highlight/lowlight";

import {
  createHighlighter,
  type Highlighter,
  type BundledLanguage,
} from "@/lib/lowlight";

let highlighter: Highlighter | undefined;
let parser: Parser | undefined;

const lazyParser: Parser = (options) => {
  // Initialize highlighter on first use
  if (!highlighter) {
    highlighter = createHighlighter();
  }

  const language = options.language as BundledLanguage;
  const loadedLanguages = highlighter.getLoadedLanguages();

  // Load language if not already loaded
  if (!loadedLanguages.includes(language)) {
    return highlighter.loadLanguage(language);
  }

  // Create parser if not exists
  if (!parser) {
    parser = createParser(highlighter.lowlight);
  }

  return parser(options);
};

export const lowlightPlugin = createHighlightPlugin({
  parser: lazyParser,
});
