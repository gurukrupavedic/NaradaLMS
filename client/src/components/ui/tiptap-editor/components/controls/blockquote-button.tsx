import React from "react";
import { useEditorState } from "@tiptap/react";
import { MenuButton } from "../menu-button";
import { useTiptapEditor } from "../provider";

const BlockquoteButton = () => {
    const { editor } = useTiptapEditor();
    const editorState = useEditorState({
        editor,
        selector({ editor }) {
            return {
                isActive: editor.isActive("blockquote"),
                canSet: editor.isEditable && editor.can().toggleBlockquote(),
            };
        },
    });

    const toggleBlockquote = () => editor.chain().focus().toggleBlockquote().run();

    return (
        <MenuButton
            icon="Quote"
            tooltip="Blockquote"
            active={editorState.isActive}
            disabled={!editorState.canSet}
            onClick={toggleBlockquote}
        />
    );
};

export default BlockquoteButton;
