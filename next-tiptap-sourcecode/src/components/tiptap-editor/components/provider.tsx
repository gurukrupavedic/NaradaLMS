import { createContext, ReactNode, useContext, useMemo, useState } from "react";

import { EditorContent, type Editor } from "@tiptap/react";

import SourceEditor from "@/components/source-editor/editor";

import { getEditorContent } from "../helpers/tiptap";
import { cn } from "../helpers/utils";

type TiptapContextType = {
  editor: Editor;
  isFullScreen: boolean;
  isSourceMode: boolean;
  toggleFullScreen: () => void;
  toggleSourceMode: () => void;
};

const TiptapContext = createContext<TiptapContextType>({} as TiptapContextType);
export const useTiptapEditor = () => useContext(TiptapContext);

type TiptapProviderProps = {
  editor: Editor;
  slotBefore?: ReactNode;
  slotAfter?: ReactNode;
  children?: ReactNode;
};

export const TiptapProvider = ({
  editor,
  children,
  slotBefore,
  slotAfter,
}: TiptapProviderProps) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isSourceMode, setIsSourceMode] = useState(false);

  const providerValue = useMemo(
    () => ({
      editor,
      isFullScreen,
      isSourceMode,
      toggleFullScreen: () => setIsFullScreen((prev) => !prev),
      toggleSourceMode: () => setIsSourceMode((prev) => !prev),
    }),
    [editor, isFullScreen, isSourceMode]
  );

  const editorContent = isSourceMode ? (
    <SourceEditor initialContent={getEditorContent(editor, "html")} />
  ) : (
    <EditorContent editor={editor} className="rte-editor__container" />
  );

  return (
    <TiptapContext value={providerValue}>
      <div
        className={cn("rte-editor", { "rte-editor--fullscreen": isFullScreen })}
      >
        {slotBefore}
        {editorContent}
        {slotAfter}
        {children}
      </div>
    </TiptapContext>
  );
};

export default TiptapProvider;
