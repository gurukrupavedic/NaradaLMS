import { Paragraph } from "docx";

import { processParagraph } from "./paragraph";

import type { DocxExporter } from "../exporter";
import type { TiptapNode } from "../types";

type ListConfig = {
  level: number;
  instance?: number;
  isNumbering: boolean;
};

export function processList(
  node: TiptapNode,
  exporter: DocxExporter,
  config: ListConfig
): Paragraph[] {
  const {
    level,
    isNumbering,
    instance = Math.floor(Date.now() * 1000 + Math.random() * 1000),
  } = config;

  return (node.content || []).flatMap((child: TiptapNode) =>
    processListItem(child, exporter, { level, isNumbering, instance })
  );
}

function processListItem(
  node: TiptapNode,
  exporter: DocxExporter,
  config: ListConfig
): Paragraph[] {
  const result: Paragraph[] = [];

  for (const child of node.content || []) {
    const childType = child.type;

    switch (childType) {
      case "paragraph":
        result.push(
          processParagraph(child, exporter, {
            numbering: {
              level: config.level,
              instance: config.isNumbering ? config.instance : undefined,
              reference: config.isNumbering ? "orderedList" : "bulletList",
            },
          })
        );
        break;

      case "bulletList":
        result.push(
          ...processList(child, exporter, {
            level: config.level + 1,
            isNumbering: false,
          })
        );
        break;

      case "orderedList":
        result.push(
          ...processList(child, exporter, {
            level: config.level + 1,
            isNumbering: true,
          })
        );
        break;
    }
  }

  return result;
}
