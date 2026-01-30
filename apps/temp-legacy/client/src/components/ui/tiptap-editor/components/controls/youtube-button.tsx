import React from "react";

import { useEditorState } from "@tiptap/react";

import { MenuButton } from "../menu-button";
import { useTiptapEditor } from "../provider";

const YoutubeButton = () => {
  const { editor } = useTiptapEditor();
  const editorState = useEditorState({
    editor,
    selector({ editor }) {
      return {
        isActive: editor.isActive("youtube"),
        canSet:
          editor.isEditable &&
          editor.can().setYoutubeVideo({
            src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          }),
      };
    },
  });

  const insertYoutubeVideo = () => {
    const src = prompt(
      "Embed Youtube Video",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    );
    if (src) {
      editor.chain().focus().setYoutubeVideo({ src }).run();
    }
  };

  return (
    <MenuButton
      icon="Youtube"
      tooltip="Youtube"
      active={editorState.isActive}
      disabled={!editorState.canSet}
      onClick={insertYoutubeVideo}
    />
  );
};

export default YoutubeButton;
