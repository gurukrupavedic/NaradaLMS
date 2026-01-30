import React from "react";

import { useEditorState } from "@tiptap/react";

import { MenuButton } from "./menu-button";
import { useTiptapEditor } from "./provider";
import { Toolbar } from "./ui/toolbar";
import { Loader2 } from "lucide-react";

type StatusBarProps = {
  autoSaveStatus?: 'clean' | 'dirty' | 'saving' | 'saved' | 'error';
};

export const StatusBar = ({ autoSaveStatus }: StatusBarProps) => {
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
      const counter = currentEditor?.storage?.characterCount;
      return {
        words: counter?.words() ?? 0,
        characters: counter?.characters() ?? 0
      };
    },
  });

  return (
    <div className="rte-status-bar">
      <Toolbar dense>

        <MenuButton
          icon="Maximize"
          text="Fullscreen"
          hideText={false}
          active={isFullScreen}
          onClick={toggleFullScreen}
        />
      </Toolbar>

      <div className="rte-counter">
        <span className="rte-word-count">Words: {count.words}</span>
        <span className="rte-charater">Characters: {count.characters}</span>
      </div>

      {/* Auto-Save Status */}
      {autoSaveStatus && (
        <div className="ml-4 flex items-center gap-1.5 text-xs min-w-[120px]">
          {autoSaveStatus === 'clean' && (
            <span className="text-gray-500 dark:text-gray-400">
              All changes saved
            </span>
          )}
          {autoSaveStatus === 'dirty' && (
            <span className="text-yellow-600 dark:text-yellow-500">
              Unsaved changes...
            </span>
          )}
          {autoSaveStatus === 'saving' && (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-blue-600 dark:text-blue-500" />
              <span className="text-blue-600 dark:text-blue-500">Saving...</span>
            </>
          )}
          {autoSaveStatus === 'saved' && (
            <span className="text-green-600 dark:text-green-500">
              Saved ✓
            </span>
          )}
          {autoSaveStatus === 'error' && (
            <span className="text-red-600 dark:text-red-500 font-bold">
              Save failed ❌
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatusBar;
