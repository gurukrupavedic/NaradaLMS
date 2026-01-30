/** @jsxImportSource @tiptap/core */
import { Youtube as TiptapYoutube } from "@tiptap/extension-youtube";
import { mergeAttributes } from "@tiptap/react";

import { getEmbedUrlFromYoutubeUrl } from "./utils";

type SetYoutubeVideoOptions = {
  src: string;
  width?: number;
  height?: number;
  start?: number;
};

export const Youtube = TiptapYoutube.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => Number.parseInt(element.style.width) || null,
        renderHTML: (attrs) =>
          attrs.width ? { style: `width: ${attrs.width}%` } : {},
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div iframe[src]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = {
      width: this.options.width,
      height: this.options.height,
      allowfullscreen: this.options.allowFullscreen ?? undefined,
      autoplay: this.options.autoplay ?? undefined,
      ccLanguage: this.options.ccLanguage,
      ccLoadPolicy: this.options.ccLoadPolicy ?? undefined,
      disableKBcontrols: this.options.disableKBcontrols ?? undefined,
      enableIFrameApi: this.options.enableIFrameApi ?? undefined,
      endTime: this.options.endTime,
      interfaceLanguage: this.options.interfaceLanguage,
      ivLoadPolicy: this.options.ivLoadPolicy,
      loop: this.options.loop ?? undefined,
      modestBranding: this.options.modestBranding ?? undefined,
      origin: this.options.origin ?? undefined,
      playlist: this.options.playlist ?? undefined,
      progressBarColor: this.options.progressBarColor,
      rel: this.options.rel,
    };

    return [
      "div",
      [
        "iframe",
        mergeAttributes(this.options.HTMLAttributes, attrs, HTMLAttributes),
      ],
    ];
  },

  addCommands() {
    return {
      setYoutubeVideo:
        (options: SetYoutubeVideoOptions) =>
        ({ commands }) => {
          const embedUrl = getEmbedUrlFromYoutubeUrl({
            url: options.src,
            ...this.options,
          });

          if (!embedUrl) {
            return false;
          }

          return commands.insertContent({
            type: this.name,
            attrs: { ...options, src: embedUrl },
          });
        },
    };
  },

  // addNodeView() {
  //   return ({ node }) => {
  //     const iframe = document.createElement("iframe");

  //     iframe.src = node.attrs.src;

  //     const dom = document.createElement("div");
  //     dom.style.cursor = "default";
  //     dom.style.marginInline = "auto";
  //     dom.style.width = `${node.attrs.width}%`;
  //     dom.appendChild(iframe);

  //     return {
  //       dom,
  //     };
  //   };
  // },
});
