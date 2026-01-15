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

// export function imageFigureDragPlugin(extension: any) {
//   let draggedNode: NodeSelection | null = null;

//   return new Plugin({
//     key: new PluginKey("imageFigureDrag"),
//     props: {
//       handleDOMEvents: {
//         dragstart: (view, event) => {
//           // Only handle dragstart from an <img> inside a figure
//           if (!event.dataTransfer || !event.target) return false;
//           const target = event.target as HTMLElement;
//           if (!(target instanceof HTMLImageElement)) return false;

//           // Get the position of the dragged image
//           const pos = view.posAtDOM(target, 0);
//           const $pos = view.state.doc.resolve(pos);

//           // Check if the image is part of a figure node
//           if ($pos.parent.type.name !== extension.name) {
//             return false;
//           }

//           const nodeStart = $pos.before($pos.depth);
//           draggedNode = NodeSelection.create(view.state.doc, nodeStart);

//           const draggedSlice = draggedNode.content();
//           const { dom, text, slice } = view.serializeForClipboard(draggedSlice);

//           // Set dataTransfer
//           event.dataTransfer.clearData();
//           event.dataTransfer.setData("text/html", dom.innerHTML);
//           event.dataTransfer.setData("text/plain", text);
//           event.dataTransfer.effectAllowed = "copyMove";

//           // ProseMirror flag
//           (view as any).dragging = { slice, move: event.ctrlKey };

//           return true;
//         },

//         drop: (view) => {
//           if (draggedNode) {
//             view.dispatch(view.state.tr.setSelection(draggedNode));
//             draggedNode = null;
//           }
//         },

//         dragend: () => {
//           draggedNode = null;
//         },
//       },
//     },
//   });
// }

// /** // * Handle drag-and-drop behavior for imageFigure nodes. // */ // addProseMirrorPlugins() { // let draggedNode: NodeSelection | null; // return [ // new Plugin({ // props: { // handleDOMEvents: { // dragstart: (view, event) => { // // Only handle dragstart from an <img> inside a figure of this type // if (!event.dataTransfer || !event.target) return false; // const target = event.target as HTMLElement; // if (!(target instanceof HTMLImageElement)) return false; // // Get the position of the dragged image // const pos = view.posAtDOM(target, 0); // const $pos = view.state.doc.resolve(pos); // // Check if the image is part of a figure node // if ($pos.parent.type !== this.type) { // return false; // } // // Set up drag data // const nodeStart = $pos.before($pos.depth); // draggedNode = NodeSelection.create(view.state.doc, nodeStart); // const draggedSlice = draggedNode.content(); // const { dom, text, slice } = // view.serializeForClipboard(draggedSlice); // // const { dom, text, slice } = serializeForClipboard( // // view, // // draggedSlice // // ); // // Populate dataTransfer // event.dataTransfer.clearData(); // event.dataTransfer.setData("text/html", dom.innerHTML); // event.dataTransfer.setData("text/plain", text); // event.dataTransfer.effectAllowed = "copyMove"; // view.dragging = { slice: slice, move: event.ctrlKey }; // return true; // }, // drop: (view) => { // if (draggedNode) { // view.dispatch(view.state.tr.setSelection(draggedNode)); // draggedNode = null; // } // }, // dragend: () => { // draggedNode = null; // }, // }, // }, // }), // ]; // }, // });
