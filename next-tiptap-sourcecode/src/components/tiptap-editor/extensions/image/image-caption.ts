/** @jsxImportSource @tiptap/core */
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

import { Figcaption } from "../figcaption";
import ImageFigure from "./image-figure";

export const ImageCaption = Figcaption.extend({
  name: "imageCaption",
  draggable: false,
  marks: "",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("imageCaptionFocus"),
        props: {
          decorations: ({ doc, selection }) => {
            const { isEditable, isFocused } = this.editor;
            const { $anchor } = selection;

            // Early return if conditions are not met
            if (
              !isEditable ||
              !isFocused ||
              $anchor.parent.type.name !== this.name
            ) {
              return DecorationSet.create(doc, []);
            }

            // Get the parent figure node and validate it's an ImageFigure
            const figureDepth = $anchor.depth - 1;
            const figure = $anchor.node(figureDepth);
            if (figure.type.name !== ImageFigure.name) {
              return DecorationSet.create(doc, []);
            }

            // Calculate figure position and size
            const figurePos = $anchor.before(figureDepth);
            const figureEndPos = figurePos + figure.nodeSize;

            // Apply decoration to the figure node
            return DecorationSet.create(doc, [
              Decoration.node(figurePos, figureEndPos, {
                class: "ProseMirror-selectednode",
              }),
            ]);

            // // Get image node and calculate its position
            // const img = figure.firstChild!;
            // // const figurePos = $anchor.start(figureDepth) - 1;
            // const imgPos = $anchor.before(figureDepth) + 1;
            // const imgEndPos = imgPos + img.nodeSize;

            // // Apply decoration to the image node
            // return DecorationSet.create(doc, [
            //   Decoration.node(imgPos, imgEndPos, {
            //     class: "ProseMirror-selectednode",
            //   }),
            // ]);
          },
        },
      }),

      // Plugin to sync caption text to image attrs
      new Plugin({
        key: new PluginKey("imageCaptionSync"),
        appendTransaction: (transactions, oldState, newState) => {
          const docChanged = transactions.some((tr) => tr.docChanged);
          if (!docChanged) return null;

          const { selection } = newState;
          const { $anchor } = selection;

          // Check if inside imageCaption
          if ($anchor.parent.type.name !== this.name) {
            return null;
          }

          // Get the parent figure node
          const figureDepth = $anchor.depth - 1;
          const figure = $anchor.node(figureDepth);
          if (figure.type.name !== ImageFigure.name) {
            return null;
          }

          const imageNode = figure.firstChild;
          const captionNode = figure.lastChild;
          if (!imageNode || !captionNode) {
            return null;
          }

          const prev = imageNode.attrs.caption;
          const next = captionNode.textContent;
          if (prev === next) {
            return null;
          }

          // Create transaction to update caption attribute
          const tr = newState.tr;
          const imagePos = $anchor.start(figureDepth);
          tr.setNodeMarkup(imagePos, undefined, {
            ...imageNode.attrs,
            caption: next,
          });

          return tr;
        },
      }),
    ];
  },
});

export default ImageCaption;
