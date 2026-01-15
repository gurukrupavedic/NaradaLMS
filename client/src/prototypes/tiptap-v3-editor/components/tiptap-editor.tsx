import React, {
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useMemo,
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
import { cssVar, throttle } from "../helpers/utils";

import type { EditorProps } from "@tiptap/pm/view";

import "../styles/index.scss";

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
    } = props;
    const isEditable = !readonly && !disabled;

    const throttledUpdate = useCallback(
      throttle(({ editor }: { editor: Editor }) => {
        if (!onChange) return;
        const content = getEditorContent(editor, output);
        onChange(content);
      }, throttleDelay),
      [output, throttleDelay]
    );

    // const updateContent = useCallback(
    //   ({ editor }: { editor: Editor }) => {
    //     if (!onChange) return;
    //     const content = getEditorContent(editor, output);
    //     onChange(content);
    //   },
    //   [output, onChange]
    // );

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

    if (!editor) {
      return null;
    }

    return (
      <TiptapProvider
        editor={editor}
        slotBefore={<MenuBar />}
        slotAfter={<StatusBar />}
      >
        <Menus />
        <Resizer />
        <DragHandle />
      </TiptapProvider>
    );
  }
);

TiptapEditor.displayName = "TiptapEditor";

export default TiptapEditor;
