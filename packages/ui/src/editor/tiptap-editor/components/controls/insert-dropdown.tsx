import React from "react";

import { useEmoji } from "../../hooks/use-emoji";
import { useTable } from "../../hooks/use-table";
import EmojiPicker from "../emoji-picker";
import { MenuButton } from "../menu-button";
import TableBuilder from "../table-builder";
import Icon from "../ui/icon";
import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "../ui/dropdown";
import { useTiptapEditor } from "../provider";

const InsertDropdown = () => {
  const { editor } = useTiptapEditor();
  const { canInsert: canInsertTable, insert: insertTable } = useTable();
  const { emojis, handleSelect: handleSelectEmoji } = useEmoji();

  return (
    <MenuButton
      type="dropdown"
      tooltip="Insert"
      disabled={!editor?.isEditable}
      icon="Plus"
      dropdownStyle={{ minWidth: "12rem" }}
    >
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Icon name="Table" className="mr-2" />
          Table
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="p-0">
          <TableBuilder
            onCreate={({ rows, cols }) =>
              insertTable({
                rows,
                cols,
                withHeaderRow: false,
              })
            }
          />
        </DropdownMenuSubContent>
      </DropdownMenuSub>

      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Icon name="Emoji" className="mr-2" />
          Emoji
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="p-0">
          <EmojiPicker emojis={emojis} onSelect={handleSelectEmoji} />
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </MenuButton>
  );
};

export default InsertDropdown;
