import { useEffect, useRef, useState } from "react";

import { html } from "@codemirror/lang-html";
import { EditorState } from "@codemirror/state";
import { lineNumbers } from "@codemirror/view";
import { EditorView } from "codemirror";

import { theme } from "./theme";

interface UseCodeMirrorProps {
  initialContent: string;
  onChange?: (content: string) => void;
}

export function useCodeMirror({ initialContent, onChange }: UseCodeMirrorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const state = EditorState.create({
      doc: initialContent,
      extensions: [
        lineNumbers(),
        html(),
        theme,
        EditorState.readOnly.of(true),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    return () => view.destroy();
  }, [initialContent]);

  return editorRef;
}
