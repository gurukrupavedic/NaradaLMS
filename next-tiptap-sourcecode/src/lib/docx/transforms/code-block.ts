import { Paragraph, TextRun, ShadingType } from "docx";

import { codeToTokens, defaultLanguage } from "@/lib/shiki";

import { normalizeDocxColor } from "../utils";

import type { DocxExporter } from "../exporter";
import type { TiptapNode } from "../types";

export async function processCodeBlock(
  node: TiptapNode,
  exporter: DocxExporter
): Promise<Paragraph[]> {
  const language = node.attrs?.language || defaultLanguage;
  const code = node.content?.[0].text || "";

  // Generate tokens
  const { tokens, bg, fg } = await codeToTokens(code, {
    lang: language,
    theme: "github-dark",
  });

  // Convert each line to a Paragraph
  const paragraphs = tokens.map((line, index) => {
    const runs = line.map((token) => {
      return new TextRun({
        text: token.content,
        color: normalizeDocxColor(token.color || fg),
      });
    });

    // // Add newline between lines, except for the last line
    // if (index < tokens.length - 1) {
    //   runs.push(new TextRun({ break: 1 }));
    // }

    return new Paragraph({
      style: "CodeBlock",
      shading: {
        type: ShadingType.SOLID,
        fill: normalizeDocxColor(bg),
      },
      children: runs,
    });
  });

  return paragraphs;
}
