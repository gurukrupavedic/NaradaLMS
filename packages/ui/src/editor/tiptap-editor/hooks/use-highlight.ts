import { useCallback } from "react";

import { useEditorState, type Editor } from "@tiptap/react";

import { useTiptapEditor } from "../components/provider";

// Utility functions
export function canSetHighlight(editor: Editor | null): boolean {
    if (!editor || !editor.isEditable) return false;
    return editor.can().toggleHighlight();
}

export function getActiveHighlightColor(editor: Editor | null): string | undefined {
    if (!editor) return undefined;
    return editor.getAttributes("highlight").color;
}

export function isHighlightActive(
    editor: Editor | null,
    color?: string
): boolean {
    if (!editor) return false;
    return editor.isActive("highlight", color ? { color } : undefined);
}

export function setHighlight(editor: Editor | null, color: string): boolean {
    if (!editor || !editor.isEditable) return false;
    return editor.chain().focus().toggleHighlight({ color }).run();
}

export function unsetHighlight(editor: Editor | null): boolean {
    if (!editor || !editor.isEditable) return false;
    return editor.chain().focus().unsetHighlight().run();
}

// Hook
export function useHighlight() {
    const { editor } = useTiptapEditor();

    const editorState = useEditorState({
        editor,
        selector({ editor }) {
            return {
                currentValue: getActiveHighlightColor(editor),
                canSetValue: canSetHighlight(editor),
            };
        },
    });

    const setValue = useCallback(
        (color: string) => {
            // If color is 'DEFAULT' or empty, unset it
            if (!color || color === "DEFAULT") {
                return unsetHighlight(editor);
            }
            return setHighlight(editor, color);
        },
        [editor]
    );

    const unsetValue = useCallback(() => {
        return unsetHighlight(editor);
    }, [editor]);

    return {
        ...editorState,
        setValue,
        unsetValue,
    };
}
