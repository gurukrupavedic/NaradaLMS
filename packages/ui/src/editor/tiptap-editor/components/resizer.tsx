import React, { useMemo } from "react";

import { createPortal } from "react-dom";

import { type Editor, useEditorState } from "@tiptap/react";

import { useTiptapEditor } from "./provider";
import { useResizable } from "../hooks/use-resizable";

interface ResizeProps {
  nodeTypes?: string[];
}

const getActiveNodeType = (
  editor: Editor,
  nodeTypes: string[]
): string | null => {
  if (!editor.isFocused || !editor.isEditable) return null;
  return nodeTypes.find((nodeType) => editor.isActive(nodeType)) || null;
};

const selectorMap = {
  image: "img",
  imageFigure: "img",
  youtube: "iframe",
} as const;

export const Resizer = ({
  nodeTypes = ["image", "imageFigure", "youtube"],
}: ResizeProps) => {
  const { editor } = useTiptapEditor();

  const editorState = useEditorState({
    editor,
    selector: ({ editor }) => {
      const activeType = getActiveNodeType(editor, nodeTypes);
      if (!activeType) return null;

      const { view, state } = editor;

      return {
        type: activeType,
        element: view.nodeDOM(state.selection.anchor) as HTMLElement,
        selection: state.selection,
      };
    },
  });

  const targetElement = useMemo(() => {
    if (!editorState || !editorState.element) return null;

    const selector = selectorMap[editorState.type as keyof typeof selectorMap];

    const target = editorState.element;

    if (target?.hasChildNodes()) {
      return target.querySelector(selector);
    }

    return target;
  }, [editorState]);

  const { rect, startResize } = useResizable(targetElement, {
    keepRatio: true,
    maxWidth: editor.view.dom.firstElementChild?.clientWidth,
    onResizeEnd: (size: number) => {
      if (!editor || !editorState) return;
      editor.commands.updateAttributes(editorState.type!, { width: size });
    },
  });

  const renderHandle = (
    cursor: "nw-resize" | "sw-resize" | "ne-resize" | "se-resize",
    styles: React.CSSProperties
  ) => {
    const side: "left" | "right" = cursor.includes("w") ? "left" : "right";

    return (
      <div
        className="rte-resizer__control"
        style={{ position: "absolute", cursor, ...styles }}
        onMouseDown={(e) => {
          e.preventDefault();
          startResize(side, e.clientX);
        }}
      />
    );
  };

  if (!editorState || !editor.view.dom.parentElement) {
    return null;
  }

  return createPortal(
    <div
      className="rte-resizer"
      style={{
        position: "absolute",
        width: rect?.width,
        height: rect?.height,
        transform: `translate(${rect?.left}px, ${rect?.top || 0}px)`,
        pointerEvents: "none",
      }}
    >
      <div style={{ pointerEvents: "auto" }}>
        {renderHandle("nw-resize", {
          left: -10,
          top: -10,
          width: 12,
          height: 12,
        })}
        {renderHandle("sw-resize", {
          left: -10,
          bottom: -10,
          width: 12,
          height: 12,
        })}
        {renderHandle("ne-resize", {
          right: -10,
          top: -10,
          width: 12,
          height: 12,
        })}
        {renderHandle("se-resize", {
          right: -10,
          bottom: -10,
          width: 12,
          height: 12,
        })}
      </div>
    </div>,
    editor.view.dom.parentElement
  );
};
