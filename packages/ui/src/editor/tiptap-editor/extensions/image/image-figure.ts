/** @jsxImportSource @tiptap/core */
import { NodeSelection } from "@tiptap/pm/state";
import {
  type CommandProps,
  type JSONContent,
  findParentNode,
} from "@tiptap/react";

import Figure from "../figure";
import Image from "./image";
import ImageCaption from "./image-caption";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageFigure: {
      insertImage: (options: {
        src: string;
        alt?: string;
        width?: number;
        height?: number;
        caption?: string;
      }) => ReturnType;
      imageToFigure: () => ReturnType;
      figureToImage: () => ReturnType;
      removeImage: () => ReturnType;
    };
  }
}

export const ImageFigure = Figure.extend(() => {
  return {
    name: "imageFigure",
    content: "image imageCaption",
    atom: true,
    defining: true,

    addExtensions() {
      return [Image, ImageCaption];
    },

    // addProseMirrorPlugins() {
    //   return [imageFigureDragPlugin(this)];
    // },

    addCommands() {
      return {
        insertImage:
          ({ width, height, caption = null, ...options }) =>
          ({ chain }) => {
            const content: JSONContent[] = [
              {
                type: Image.name,
                attrs: {
                  ...options,
                  naturalWidth: width,
                  naturalHeight: height,
                },
              },
            ];

            if (caption) {
              content.push({
                type: ImageCaption.name,
                content: [{ type: "text", text: caption }],
              });
              return chain().insertContent({ type: this.name, content }).run();
            }

            return chain().insertContent(content).run();
          },
        imageToFigure:
          () =>
          ({ state, chain }) => {
            const { selection } = state;
            if (!(selection instanceof NodeSelection)) {
              return false;
            }
            // Check if selected node is an image
            const node = selection.node;
            if (node.type.name !== Image.name) {
              return false;
            }
            // Get position from NodeSelection
            const imagePos = selection.from;
            const range = { from: imagePos, to: imagePos + node.nodeSize };
            const content: JSONContent[] = [
              { type: Image.name, attrs: { ...node.attrs, caption: "" } },
              { type: ImageCaption.name, content: undefined },
            ];
            // Insert the new figure replacing the image
            return chain()
              .insertContentAt(range, { type: this.name, content })
              .setTextSelection(range.to + content.length)
              .run();
          },
        figureToImage:
          () =>
          ({ state, commands }) => {
            // Find parent figure node from selection
            const figure = findParentNode(
              (node) => node.type.name === this.name
            )(state.selection);
            if (!figure) return false;

            const { node, pos } = figure;

            // Get image inside figure (usually first child)
            const firstChild = node.firstChild;
            if (!firstChild) return false;

            const imageContent = {
              type: firstChild.type.name,
              attrs: {
                ...firstChild.attrs,
                caption: null,
              },
            };
            // Replace figure with its image
            const range = { from: pos, to: pos + node.nodeSize };
            return commands.insertContentAt(range, imageContent);
          },
        removeImage:
          () =>
          ({ state, tr, dispatch }: CommandProps) => {
            const { selection } = state;
            const { $anchor } = selection;

            let depth = $anchor.depth;
            let pos = $anchor.pos;

            while (depth > 0) {
              pos = $anchor.before(depth);
              depth--;
            }

            const node = state.doc.nodeAt(pos);

            if (
              !node ||
              (node.type.name !== this.name && node.type.name !== Image.name)
            ) {
              return false;
            }

            if (dispatch) {
              tr.deleteRange(pos, pos + node.nodeSize);
              dispatch(tr);
            }

            return true;
          },
      };
    },
  };
});

export default ImageFigure;
