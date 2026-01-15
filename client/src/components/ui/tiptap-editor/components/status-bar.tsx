import React from "react";

import { useEditorState } from "@tiptap/react";

import { MenuButton } from "./menu-button";
import { useTiptapEditor } from "./provider";
import { Toolbar } from "./ui/toolbar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Loader2 } from "lucide-react";

type StatusBarProps = {
  editorMode?: 'html' | 'text';
  onModeChange?: (mode: 'html' | 'text') => void;
  autoSaveStatus?: 'clean' | 'dirty' | 'saving' | 'saved';
};

export const StatusBar = ({ editorMode, onModeChange, autoSaveStatus }: StatusBarProps) => {
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

      {/* HTML/Text Toggle */}
      {editorMode && onModeChange && (
        <Tabs value={editorMode} onValueChange={onModeChange} className="ml-4">
          <TabsList className="h-8 bg-white dark:bg-gray-950 border shadow-sm">
            <TabsTrigger value="html" className="text-xs h-6 px-3">
              HTML
            </TabsTrigger>
            <TabsTrigger value="text" className="text-xs h-6 px-3">
              Text
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

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
        </div>
      )}
    </div>
  );
};

export default StatusBar;
