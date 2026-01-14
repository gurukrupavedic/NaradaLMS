/* Generate by @shikijs/codegen */
import {
  createSingletonShorthands,
  createdBundledHighlighter,
} from "@shikijs/core";
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript";

import type {
  DynamicImportLanguageRegistration,
  DynamicImportThemeRegistration,
  HighlighterGeneric,
} from "@shikijs/types";

type BundledLanguage =
  | "typescript"
  | "ts"
  | "cts"
  | "mts"
  | "javascript"
  | "js"
  | "cjs"
  | "mjs"
  | "jsx"
  | "tsx"
  | "vue"
  | "svelte"
  | "astro"
  | "angular-html"
  | "angular-ts"
  | "python"
  | "py"
  | "java"
  | "go"
  | "rust"
  | "rs"
  | "php"
  | "html"
  | "css"
  | "scss"
  | "json"
  | "yaml"
  | "yml"
  | "markdown"
  | "md"
  | "ruby"
  | "rb"
  | "sql"
  | "docker"
  | "dockerfile"
  | "make"
  | "makefile"
  | "graphql"
  | "gql"
  | "objective-c"
  | "objc"
  | "c"
  | "cpp"
  | "c++"
  | "csharp"
  | "c#"
  | "cs"
  | "shellscript"
  | "bash"
  | "sh"
  | "shell"
  | "zsh"
  | "swift"
  | "kotlin"
  | "kt"
  | "kts";
type BundledTheme = "github-dark" | "github-light";
type Highlighter = HighlighterGeneric<BundledLanguage, BundledTheme>;

const bundledLanguages = {
  typescript: () => import("@shikijs/langs/typescript"),
  ts: () => import("@shikijs/langs/typescript"),
  cts: () => import("@shikijs/langs/typescript"),
  mts: () => import("@shikijs/langs/typescript"),
  javascript: () => import("@shikijs/langs/javascript"),
  js: () => import("@shikijs/langs/javascript"),
  cjs: () => import("@shikijs/langs/javascript"),
  mjs: () => import("@shikijs/langs/javascript"),
  jsx: () => import("@shikijs/langs/jsx"),
  tsx: () => import("@shikijs/langs/tsx"),
  vue: () => import("@shikijs/langs/vue"),
  svelte: () => import("@shikijs/langs/svelte"),
  astro: () => import("@shikijs/langs/astro"),
  "angular-html": () => import("@shikijs/langs/angular-html"),
  "angular-ts": () => import("@shikijs/langs/angular-ts"),
  python: () => import("@shikijs/langs/python"),
  py: () => import("@shikijs/langs/python"),
  java: () => import("@shikijs/langs/java"),
  go: () => import("@shikijs/langs/go"),
  rust: () => import("@shikijs/langs/rust"),
  rs: () => import("@shikijs/langs/rust"),
  php: () => import("@shikijs/langs/php"),
  html: () => import("@shikijs/langs/html"),
  css: () => import("@shikijs/langs/css"),
  scss: () => import("@shikijs/langs/scss"),
  json: () => import("@shikijs/langs/json"),
  yaml: () => import("@shikijs/langs/yaml"),
  yml: () => import("@shikijs/langs/yaml"),
  markdown: () => import("@shikijs/langs/markdown"),
  md: () => import("@shikijs/langs/markdown"),
  ruby: () => import("@shikijs/langs/ruby"),
  rb: () => import("@shikijs/langs/ruby"),
  sql: () => import("@shikijs/langs/sql"),
  docker: () => import("@shikijs/langs/docker"),
  dockerfile: () => import("@shikijs/langs/docker"),
  make: () => import("@shikijs/langs/make"),
  makefile: () => import("@shikijs/langs/make"),
  graphql: () => import("@shikijs/langs/graphql"),
  gql: () => import("@shikijs/langs/graphql"),
  "objective-c": () => import("@shikijs/langs/objective-c"),
  objc: () => import("@shikijs/langs/objective-c"),
  c: () => import("@shikijs/langs/c"),
  cpp: () => import("@shikijs/langs/cpp"),
  "c++": () => import("@shikijs/langs/cpp"),
  csharp: () => import("@shikijs/langs/csharp"),
  "c#": () => import("@shikijs/langs/csharp"),
  cs: () => import("@shikijs/langs/csharp"),
  shellscript: () => import("@shikijs/langs/shellscript"),
  bash: () => import("@shikijs/langs/shellscript"),
  sh: () => import("@shikijs/langs/shellscript"),
  shell: () => import("@shikijs/langs/shellscript"),
  zsh: () => import("@shikijs/langs/shellscript"),
  swift: () => import("@shikijs/langs/swift"),
  kotlin: () => import("@shikijs/langs/kotlin"),
  kt: () => import("@shikijs/langs/kotlin"),
  kts: () => import("@shikijs/langs/kotlin"),
} as Record<BundledLanguage, DynamicImportLanguageRegistration>;

const bundledThemes = {
  "github-dark": () => import("@shikijs/themes/github-dark"),
  "github-light": () => import("@shikijs/themes/github-light"),
} as Record<BundledTheme, DynamicImportThemeRegistration>;

const createHighlighter = /* @__PURE__ */ createdBundledHighlighter<
  BundledLanguage,
  BundledTheme
>({
  langs: bundledLanguages,
  themes: bundledThemes,
  engine: () => createJavaScriptRegexEngine(),
});

const {
  codeToHtml,
  codeToHast,
  codeToTokensBase,
  codeToTokens,
  codeToTokensWithThemes,
  getSingletonHighlighter,
  getLastGrammarState,
} = /* @__PURE__ */ createSingletonShorthands<BundledLanguage, BundledTheme>(
  createHighlighter
);

export {
  bundledLanguages,
  bundledThemes,
  codeToHast,
  codeToHtml,
  codeToTokens,
  codeToTokensBase,
  codeToTokensWithThemes,
  createHighlighter,
  getLastGrammarState,
  getSingletonHighlighter,
};
export type { BundledLanguage, BundledTheme, Highlighter };
