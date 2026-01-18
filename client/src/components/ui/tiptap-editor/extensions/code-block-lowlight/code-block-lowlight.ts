import CodeBlock from "@tiptap/extension-code-block";

import { lowlightService } from "../../helpers/lowlight";

import { lowlightPlugin } from "./lowlight-plugin";

export const CodeBlockLowlight = CodeBlock.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      defaultLanguage: lowlightService.getDefaultLanguage().syntax,
    };
  },

  addProseMirrorPlugins() {
    return [lowlightPlugin];
  },
});
