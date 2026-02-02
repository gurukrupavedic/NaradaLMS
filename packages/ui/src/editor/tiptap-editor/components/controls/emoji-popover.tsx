import React, { useCallback } from "react";

import { useEmoji } from "../../hooks/use-emoji";
import EmojiPicker from "../emoji-picker";
import { MenuButton } from "../menu-button";
import { useTiptapEditor } from "../provider";

const EmojiPopover = () => {
  const { emojis, handleSelect } = useEmoji();
  // const { editor } = useTiptapEditor();

  // const handleSelect = useCallback(
  //   (emoji: EmojiItem) => {
  //     editor.chain().focus().insertContent(emoji.emoji!).run();
  //   },
  //   [editor]
  // );

  return (
    <MenuButton type="popover" icon={"Emoji"} hideArrow tooltip={"Emoji"}>
      <EmojiPicker emojis={emojis} onSelect={handleSelect} />
    </MenuButton>
  );
};

export default EmojiPopover;
