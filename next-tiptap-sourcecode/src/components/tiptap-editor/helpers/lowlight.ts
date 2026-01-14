import plaintext from "highlight.js/lib/languages/plaintext";
import xml from "highlight.js/lib/languages/xml";
import { createLowlight, type LanguageFn } from "lowlight";

export const loader: Record<string, () => Promise<any>> = {
  bash: () => import("highlight.js/lib/languages/bash"),
  c: () => import("highlight.js/lib/languages/c"),
  csharp: () => import("highlight.js/lib/languages/csharp"),
  css: () => import("highlight.js/lib/languages/css"),
  go: () => import("highlight.js/lib/languages/go"),
  graphql: () => import("highlight.js/lib/languages/graphql"),
  java: () => import("highlight.js/lib/languages/java"),
  javascript: () => import("highlight.js/lib/languages/javascript"),
  json: () => import("highlight.js/lib/languages/json"),
  kotlin: () => import("highlight.js/lib/languages/kotlin"),
  less: () => import("highlight.js/lib/languages/less"),
  makefile: () => import("highlight.js/lib/languages/makefile"),
  markdown: () => import("highlight.js/lib/languages/markdown"),
  objectivec: () => import("highlight.js/lib/languages/objectivec"),
  php: () => import("highlight.js/lib/languages/php"),
  plaintext: () => import("highlight.js/lib/languages/plaintext"),
  python: () => import("highlight.js/lib/languages/python"),
  scss: () => import("highlight.js/lib/languages/scss"),
  shell: () => import("highlight.js/lib/languages/shell"),
  sql: () => import("highlight.js/lib/languages/sql"),
  typescript: () => import("highlight.js/lib/languages/typescript"),
  vbnet: () => import("highlight.js/lib/languages/vbnet"),
  xml: () => import("highlight.js/lib/languages/xml"),
};

interface CodeLanguage {
  syntax: string;
  alias: string[];
  label: string;
}

const CODE_BLOCK_LANGUAGUES_DEFAULT: CodeLanguage = {
  syntax: "plaintext",
  alias: ["text", "txt"],
  label: "Text",
};

const CODE_BLOCK_LANGUAGUES: CodeLanguage[] = [
  { syntax: "bash", alias: ["sh"], label: "Bash" },
  { syntax: "c", alias: ["h"], label: "C" },
  { syntax: "csharp", alias: ["cs", "c#", "dotnet"], label: "C#" },
  { syntax: "css", alias: [], label: "CSS" },
  { syntax: "go", alias: ["golang"], label: "Go" },
  { syntax: "graphql", alias: ["gql"], label: "GraphQL" },
  { syntax: "java", alias: ["jsp"], label: "Java" },
  {
    syntax: "javascript",
    alias: ["js", "jsx", "mjs", "cjs"],
    label: "Javascript",
  },
  { syntax: "json", alias: [], label: "JSON" },
  { syntax: "kotlin", alias: ["kt", "kts"], label: "Kotlin" },
  { syntax: "less", alias: [], label: "Less" },
  { syntax: "makefile", alias: ["mk", "mak", "make"], label: "Makefile" },
  { syntax: "markdown", alias: ["md", "mkdown", "mkd"], label: "Markdown" },
  {
    syntax: "objectivec",
    alias: ["mm", "objc", "obj-c", "obj-c++", "objective-c++"],
    label: "Objective-C",
  },
  { syntax: "php", alias: [], label: "PHP" },
  { syntax: "plaintext", alias: ["text", "txt"], label: "Text" },
  { syntax: "python", alias: ["py", "gyp", "ipython"], label: "Python" },
  { syntax: "scss", alias: [], label: "SCSS" },
  { syntax: "shell", alias: ["console", "shellsession"], label: "Shell" },
  { syntax: "sql", alias: [], label: "SQL" },
  { syntax: "typescript", alias: ["ts", "tsx"], label: "TypeScript" },
  { syntax: "vbnet", alias: ["vb"], label: "VB .NET" },
  {
    syntax: "xml",
    alias: [
      "html",
      "xhtml",
      "rss",
      "atom",
      "xjb",
      "xsd",
      "xsl",
      "plist",
      "wsf",
      "svg",
    ],
    label: "HTML, XML",
  },
];

export class LowlightService {
  private lowlight: ReturnType<typeof createLowlight>;

  constructor() {
    this.lowlight = createLowlight();
    this.lowlight.register("plaintext", plaintext);
    this.lowlight.register("xml", xml);
  }

  getLowlight(): ReturnType<typeof createLowlight> {
    return this.lowlight;
  }

  find(syntaxOrAlias: string | undefined): CodeLanguage | undefined {
    if (!syntaxOrAlias) return undefined;

    const query = syntaxOrAlias.toLowerCase();
    return this.getSupportedLanguages().find(
      (lang) =>
        lang.syntax === query || lang.alias.some((alias) => alias === query)
    );
  }

  async load(syntax: string): Promise<boolean> {
    if (this.lowlight.registered(syntax)) {
      return false;
    }

    try {
      const { default: language } = await loader[syntax]();
      this.lowlight.register(syntax, language);
      return true;
    } catch (err) {
      console.error(`Failed to load ${syntax}`, err);
      return false;
    }
  }

  register(syntax: string, language: LanguageFn): void {
    this.lowlight.register(syntax, language);
  }

  registered(language: string): boolean {
    return this.lowlight.registered(language);
  }

  async preload(languages: string[]): Promise<boolean[]> {
    return Promise.all(languages.map((lang) => this.load(lang)));
  }

  getSupportedLanguages(): CodeLanguage[] {
    return CODE_BLOCK_LANGUAGUES;
  }

  getDefaultLanguage(): CodeLanguage {
    return CODE_BLOCK_LANGUAGUES_DEFAULT;
  }
}

export const lowlightService = new LowlightService();
