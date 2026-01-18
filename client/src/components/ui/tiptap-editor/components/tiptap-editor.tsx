import React, {
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useMemo,
  useState,
} from "react";

import { useEditor, type Editor, type Content } from "@tiptap/react";

import { DragHandle } from "./drag-handle";
import { MenuBar } from "./menu-bar";
import { Menus } from "./menus";
import { StatusBar } from "./status-bar";
import { createExtensions } from "../extensions";
import { TiptapProvider } from "./provider";
import { Resizer } from "./resizer";
import { getEditorContent } from "../helpers/tiptap";
import { cssVar, throttle, cn } from "../helpers/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Loader2 } from "lucide-react";

import type { EditorProps } from "@tiptap/pm/view";

import "../styles/index.scss";

// Helper to convert HTML to plain text (from old RichTextEditor)
const htmlToPlainText = (html: string): string => {
  if (!html) return '';
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
};

// Helper to get font class based on script
const getFontClass = (language: "te" | "hi" | "en") => {
  switch (language) {
    case "te":
      return "font-['JIMS','Noto_Sans_Telugu',sans-serif]";
    case "hi":
      return "font-['AdishilaSanVedic','Noto_Sans_Devanagari',sans-serif] font-semibold";
    case "en":
      return "font-['AdishilaSan','Noto_Sans',sans-serif]";
    default:
      return "";
  }
};

export type TiptapEditorProps = {
  content?: Content;
  readonly?: boolean;
  disabled?: boolean;
  minHeight?: string | number;
  maxHeight?: string | number;
  maxWidth?: string | number;
  placeholder?: string | Record<string, string>;
  output: "html" | "json";
  ssr?: boolean;
  editorProps?: EditorProps;
  throttleDelay?: number;
  onChange?: (value: Content) => void;
  className?: string;

  // VedicLMS-specific props
  language: "te" | "hi" | "en";
  currentScript?: "te" | "hi" | "en";
  onScriptChange?: (script: "te" | "hi" | "en") => void;
  autoSaveStatus?: 'clean' | 'dirty' | 'saving' | 'saved';
  showStatusBar?: boolean;
};

export type TiptapEditorRef = Editor | null;

const TiptapEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(
  (props, ref) => {
    const {
      ssr = false,
      output = "html",
      readonly = false,
      disabled = false,
      minHeight = 320,
      placeholder,
      content,
      maxHeight,
      maxWidth,
      editorProps,
      throttleDelay = 1500,
      onChange,
      className,
      language,
      currentScript,
      onScriptChange,
      autoSaveStatus,
      showStatusBar = true,
    } = props;
    const isEditable = !readonly && !disabled;

    // Refs for stable access in throttled callback
    const onChangeRef = React.useRef(onChange);
    const outputRef = React.useRef(output);

    useEffect(() => {
      onChangeRef.current = onChange;
      outputRef.current = output;
    });


    const throttledUpdate = useMemo(
      () =>
        throttle(({ editor }: { editor: Editor }) => {
          const changeHandler = onChangeRef.current;
          if (!changeHandler) return;

          const content = getEditorContent(editor, outputRef.current);
          changeHandler(content);
        }, throttleDelay),
      [throttleDelay]
    );

    // Cleanup throttled updates on unmount
    useEffect(() => {
      return () => {
        throttledUpdate.cancel();
      };
    }, [throttledUpdate]);

    const extensions = useMemo(
      () => createExtensions({ placeholder }),
      [placeholder]
    );

    const editor = useEditor({
      content,
      extensions,
      editable: isEditable,
      immediatelyRender: ssr,
      editorProps: {
        ...editorProps,
        attributes: {
          spellcheck: "false",
          ...editorProps?.attributes,
        },
      },
      onUpdate: throttledUpdate,
    });

    useImperativeHandle(ref, () => editor);

    useEffect(() => {
      if (!editor || editor.isEditable === isEditable) return;
      editor.setEditable(isEditable);
      editor.view.dispatch(editor.view.state.tr);
    }, [editor, isEditable]);

    useEffect(() => {
      cssVar("--rte-editor-min-height", minHeight, "px");
      cssVar("--rte-editor-max-height", maxHeight, "px");
      cssVar("--rte-editor-max-width", maxWidth, "px");
    }, [minHeight, maxHeight, maxWidth]);

    // Update editor content when value changes externally
    useEffect(() => {
      if (editor && content !== editor.getHTML()) {
        editor.commands.setContent(content as string, false);
      }
    }, [content, editor]);

    if (!editor) {
      return null;
    }


    // Unified Render
    return (
      <div className={cn("rte-editor-wrapper", { "rte-editor--readonly": !isEditable }, className)}>
        <TiptapProvider
          editor={editor}
          slotBefore={
            <MenuBar
              currentScript={currentScript}
              onScriptChange={onScriptChange}
              disabled={!isEditable}
            />
          }
          slotAfter={
            showStatusBar ? (
              <StatusBar
                autoSaveStatus={autoSaveStatus}
              />
            ) : undefined
          }
          fontClassName={getFontClass(language)}
        >
          <>
            <Menus />
            <Resizer />
            <DragHandle />
          </>
        </TiptapProvider>
      </div>
    );
  }
);

TiptapEditor.displayName = "TiptapEditor";

export default TiptapEditor;
