import { Paragraph, ExternalHyperlink, TextRun, BuilderElement } from "docx";

import {
  twipToPixel,
  createShapeElement,
  ShapeOptions,
  createPictureElement,
} from "../utils";

import type { DocxExporter } from "../exporter";
import type { TiptapNode } from "../types";

const YOUTUBE_REGEX =
  /^((?:https?:)?\/\/)?((?:www|m|music)\.)?((?:youtube\.com|youtu\.be|youtube-nocookie\.com))(\/(?:[\w-]+\?v=|embed\/|v\/)?)([\w-]+)(\S+)?$/;

const VIDEO_ID_REGEX = /(?:v=|embed\/|shorts\/)([-\w]+)/;

function isValidYoutubeUrl(url: string): boolean {
  return YOUTUBE_REGEX.test(url);
}

function extractYouTubeId(url: string): string | null {
  if (!isValidYoutubeUrl(url)) {
    return null;
  }

  const matches = url.match(VIDEO_ID_REGEX);
  return matches?.[1] ?? null;
}

export function processYouTube(
  node: TiptapNode,
  exporter: DocxExporter
): Paragraph {
  const videoId = extractYouTubeId(node.attrs?.src || "");
  const videoUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : "";

  return createTextbox({
    width: twipToPixel(exporter.availableWidth),
    height: 120,
    children: [
      new Paragraph({
        alignment: "center",
        children: [
          new TextRun({
            text: "Watch on YouTube",
            size: 28,
          }),
        ],
      }),
      new Paragraph({
        alignment: "center",
        children: [
          new ExternalHyperlink({
            link: videoUrl,
            children: [
              new TextRun({
                text: videoUrl,
                size: 20,
                style: "Hyperlink",
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

type TextboxOptions = Pick<ShapeOptions, "width" | "height" | "children"> & {
  verticalAlign?: "top" | "middle" | "bottom";
};

export function createTextbox(options: TextboxOptions) {
  const { width, height, verticalAlign = "middle", children } = options;

  const textboxContent = new BuilderElement({
    name: "v:textbox",
    attributes: {
      style: {
        key: "style",
        value: `v-text-anchor:${verticalAlign};mso-fit-shape-to-text:${height == "auto" ? "t" : "f"}`,
      },
    },
    children: [
      new BuilderElement({
        name: "w:txbxContent",
        children,
      }),
    ],
  });

  const shape = createShapeElement({
    width,
    height,
    fill: {
      color: "#F0F0F0",
      opacity: "50%",
    },
    stroke: {
      dashstyle: "dash",
      color: "#0066CC",
      weight: "1pt",
    },
    children: [textboxContent],
  });

  return new Paragraph({
    children: [createPictureElement(shape)],
  });
}
