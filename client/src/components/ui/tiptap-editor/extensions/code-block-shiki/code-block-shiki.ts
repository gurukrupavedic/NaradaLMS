import CodeBlock from "@tiptap/extension-code-block";

import { defaultLanguage } from "@/lib/shiki";

import { shikiPlugin } from "./shiki-plugin";

export const CodeBlockShiki = CodeBlock.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      defaultLanguage: defaultLanguage,
    };
  },

  addProseMirrorPlugins() {
    return [shikiPlugin];
  },
});
