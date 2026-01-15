import { useCallback, useEffect, useState } from "react";

import { useTiptapEditor } from "../components/provider";
import { getEmojiData, type EmojiItem } from "../helpers/emoji";

export function useEmoji() {
  const { editor } = useTiptapEditor();
  const [emojis, setEmojis] = useState<EmojiItem[]>([]);

  const handleSelect = useCallback(
    (emoji: EmojiItem) => {
      editor.chain().focus().insertContent(emoji.emoji).run();
    },
    [editor]
  );

  useEffect(() => {
    getEmojiData().then(setEmojis);
  }, []);

  return { emojis, handleSelect };
}
