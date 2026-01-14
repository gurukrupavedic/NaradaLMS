import React from "react";

import BoldButton from "./controls/bold-button";
import BulletListButton from "./controls/bullet-list-button";
import EmojiPopover from "./controls/emoji-popover";
import HeadingDropdown from "./controls/heading-dropdown";
import ImageButton from "./controls/image-button-2";
import InsertDropdown from "./controls/insert-dropdown";
import ItalicButton from "./controls/italic-button";
import LinkButton from "./controls/link-button";
import MoreFormatPopover from "./controls/more-format-popover";
import OrderedListButton from "./controls/ordered-list-button";
import RedoButton from "./controls/redo-button";
import TableButton from "./controls/table-button";
import TextAlignPopover from "./controls/text-align-popover";
import TextBackgroundPopover from "./controls/text-background-popover";
import TextColorPopover from "./controls/text-color-popover";
import UnderlineButton from "./controls/underline-button";
import UndoButton from "./controls/undo-button";
import { Toolbar, ToolbarDivider, ToolbarGroup } from "./ui/toolbar";

export const MenuBar = () => {
  return (
    <Toolbar dense className="rte-menu-bar">
      <ToolbarGroup>
        <UndoButton />
        <RedoButton />
      </ToolbarGroup>

      <ToolbarDivider />

      <ToolbarGroup>
        <HeadingDropdown />
      </ToolbarGroup>

      <ToolbarDivider />

      <ToolbarGroup>
        <BoldButton />
        <ItalicButton />
        <UnderlineButton />
        <MoreFormatPopover />
      </ToolbarGroup>

      <ToolbarDivider />

      <ToolbarGroup>
        <TextColorPopover />
        <TextBackgroundPopover />
      </ToolbarGroup>

      <ToolbarDivider />

      <ToolbarGroup>
        <TextAlignPopover />
        <BulletListButton />
        <OrderedListButton />
      </ToolbarGroup>

      <ToolbarDivider />

      <ToolbarGroup>
        <LinkButton />
        <ImageButton />
        <TableButton />
        <EmojiPopover />
        <InsertDropdown />
      </ToolbarGroup>
    </Toolbar>
  );
};

export default MenuBar;
