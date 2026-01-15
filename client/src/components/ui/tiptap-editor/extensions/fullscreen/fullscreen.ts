/** @jsxImportSource @tiptap/core */
import { Extension } from "@tiptap/react";

declare module "@tiptap/core" {
  interface Editor {
    isFullScreen: () => boolean;
  }

  interface Commands<ReturnType> {
    fullScreen: {
      toggleFullScreen: () => ReturnType;
      setFullScreen: (enabled?: boolean) => ReturnType;
    };
  }

  interface Storage {
    fullScreen: FullScreenStorage;
  }
}

export type FullScreenOptions = {
  /**
   * CSS class name that will be toggled on the editor container
   * @default 'rte-editor--fullscreen'
   */
  className: string;
};

export interface FullScreenStorage {
  isFullScreen: boolean;
}

export const FullScreen = Extension.create<
  FullScreenOptions,
  FullScreenStorage
>({
  name: "fullScreen",

  addOptions() {
    return {
      className: "rte-editor--fullscreen",
    };
  },

  addStorage() {
    return {
      isFullScreen: false,
    };
  },

  addCommands() {
    return {
      toggleFullScreen:
        () =>
        ({ editor }) => {
          const enabled = !this.storage.isFullScreen;
          editor.commands.setFullScreen(enabled);
          return true;
        },

      setFullScreen:
        (enabled: boolean = true) =>
        ({ editor }) => {
          this.storage.isFullScreen = enabled;
          const container = (editor.options.element as Element).parentElement;
          container?.classList.toggle(this.options.className, enabled);
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () => {
        return this.editor.commands.toggleFullScreen();
      },
    };
  },
});
