/** @jsxImportSource @tiptap/core */
import { Image as TiptapImage } from "@tiptap/extension-image";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export const Image = TiptapImage.extend({
  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("src"),
        renderHTML: (attrs) => (attrs.src ? { src: attrs.src } : {}),
      },
      alt: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("alt"),
        renderHTML: (attrs) => (attrs.alt ? { alt: attrs.alt } : {}),
      },
      caption: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const figure = element.closest?.("figure");
          if (figure) {
            const figcaption = figure.querySelector("figcaption");
            return figcaption?.textContent ?? null;
          }
          return null;
        },
      },
      width: {
        default: null,
        parseHTML: (element) => Number.parseInt(element.style.width) || null,
        renderHTML: (attrs) =>
          attrs.width ? { style: `width: ${attrs.width}%` } : {},
      },
      naturalWidth: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-width"),
        renderHTML: (attrs) => ({ "data-width": attrs.naturalWidth }),
      },
      naturalHeight: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-height"),
        renderHTML: (attrs) => ({ "data-height": attrs.naturalHeight }),
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("imageDrag"),
        props: {
          handleDOMEvents: {
            dragstart: (view, event) => {
              if ((event.target as HTMLElement).tagName === "IMG") {
                event.preventDefault();
                return true;
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});

export default Image;
