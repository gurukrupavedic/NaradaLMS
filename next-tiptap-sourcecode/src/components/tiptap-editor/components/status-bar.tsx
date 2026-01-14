import React from "react";

import { useEditorState } from "@tiptap/react";

import { MenuButton } from "./menu-button";
import { useTiptapEditor } from "./provider";
import { Toolbar } from "./ui/toolbar";

export const StatusBar = () => {
  const {
    editor,
    isFullScreen,
    isSourceMode,
    toggleFullScreen,
    toggleSourceMode,
  } = useTiptapEditor();

  const count = useEditorState({
    editor,
    selector({ editor: currentEditor }) {
      const counter = currentEditor.storage.characterCount;
      return { words: counter.words(), characters: counter.characters() };
    },
  });

  return (
    <div className="rte-status-bar">
      <Toolbar dense>
        <MenuButton
          icon="SourceCode"
          text="Source Code"
          active={isSourceMode}
          onClick={toggleSourceMode}
        />
        <MenuButton
          icon="Maximize"
          text="Fullscreen"
          active={isFullScreen}
          onClick={toggleFullScreen}
        />
      </Toolbar>

      <div className="rte-counter">
        <span className="rte-word-count">Words: {count.words}</span>
        <span className="rte-charater">Characters: {count.characters}</span>
      </div>
    </div>
  );
};

export default StatusBar;
