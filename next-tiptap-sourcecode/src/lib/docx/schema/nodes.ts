import { processCodeBlock } from "../transforms/code-block";
import { processImage } from "../transforms/image";
import { processList } from "../transforms/list";
import { processParagraph } from "../transforms/paragraph";
import { processTable } from "../transforms/table";
import { processYouTube } from "../transforms/youtube";

import type { NodeMapping } from "../types";

export const defaultNodeMapping: NodeMapping = {
  paragraph: (node, exporter) => processParagraph(node, exporter),
  heading: (node, exporter) => {
    return processParagraph(node, exporter, {
      heading: `Heading${node.attrs?.level as 1 | 2 | 3 | 4 | 5 | 6}`,
    });
  },
  blockquote: (node, exporter) => {
    return (node.content || []).map((child) =>
      processParagraph(child, exporter, { style: "Blockquote" })
    );
  },
  bulletList: (node, exporter) => {
    return processList(node, exporter, { level: 0, isNumbering: false });
  },
  orderedList: (node, exporter) => {
    return processList(node, exporter, { level: 0, isNumbering: true });
  },
  image: (node, exporter) => processImage(node, exporter),
  imageFigure: (node, exporter) => {
    const [imageNode, captionNode] = node.content || [];
    return Promise.all([
      processImage(imageNode, exporter),
      processParagraph(captionNode, exporter, { style: "Caption" }),
    ]);
  },
  table: (node, exporter) => processTable(node, exporter),
  youtube: (node, exporter) => processYouTube(node, exporter),
  codeBlock: (node, exporter) => processCodeBlock(node, exporter),
};
