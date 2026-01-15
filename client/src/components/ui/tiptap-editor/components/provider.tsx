import { createContext, ReactNode, useContext, useMemo, useState } from "react";

import { EditorContent, type Editor } from "@tiptap/react";

// import SourceEditor from "@/components/source-editor/editor"; // Source editor not ported yet

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
  fontClassName?: string;
};

export const TiptapProvider = ({
  editor,
  children,
  slotBefore,
  slotAfter,
  fontClassName,
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

  return (
    <TiptapContext.Provider value={providerValue}>
      <div
        className={cn("rte-editor", { "rte-editor--fullscreen": isFullScreen })}
      >
        {slotBefore}
        <div className="flex flex-col flex-1 min-w-0">
          <EditorContent
            editor={editor}
            className={cn("rte-editor__container", fontClassName)}
          />
        </div>
        {slotAfter}
        {children}
      </div>
    </TiptapContext.Provider>
  );
};

export default TiptapProvider;
