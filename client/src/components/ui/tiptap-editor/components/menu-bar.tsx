import React from "react";

import BoldButton from "./controls/bold-button";
import BulletListButton from "./controls/bullet-list-button";
// import EmojiPopover from "./controls/emoji-popover";
import HeadingDropdown from "./controls/heading-dropdown";
import ImageButton from "./controls/image-button-2";
import InsertDropdown from "./controls/insert-dropdown";
import ItalicButton from "./controls/italic-button";
import LinkButton from "./controls/link-button";
import MoreFormatPopover from "./controls/more-format-popover";
import OrderedListButton from "./controls/ordered-list-button";
import RedoButton from "./controls/redo-button";
// import TableButton from "./controls/table-button";
import BlockquoteButton from "./controls/blockquote-button";
import YoutubeButton from "./controls/youtube-button";
import TextAlignPopover from "./controls/text-align-popover";
import TextBackgroundPopover from "./controls/text-background-popover";
import TextColorPopover from "./controls/text-color-popover";
import UnderlineButton from "./controls/underline-button";
import UndoButton from "./controls/undo-button";
import { Toolbar, ToolbarDivider, ToolbarGroup } from "./ui/toolbar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type MenuBarProps = {
  currentScript?: "te" | "hi" | "en";
  onScriptChange?: (script: "te" | "hi" | "en") => void;
  disabled?: boolean;
};

export const MenuBar = ({ currentScript, onScriptChange, disabled }: MenuBarProps) => {
  return (
    <Toolbar dense className="rte-menu-bar">
      {/* Script Selector - First group */}
      {currentScript && onScriptChange && (
        <>
          <ToolbarGroup>
            <Select
              value={currentScript}
              onValueChange={onScriptChange}
              disabled={disabled}
            >
              <SelectTrigger className="w-[140px] h-8 text-xs bg-white dark:bg-gray-950 shadow-sm border-gray-300 dark:border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="te">Telugu</SelectItem>
                <SelectItem value="hi">Devanagari</SelectItem>
                <SelectItem value="en">IAST</SelectItem>
              </SelectContent>
            </Select>
          </ToolbarGroup>

          <ToolbarDivider />
        </>
      )}

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
        <BlockquoteButton />
        <YoutubeButton />
        <InsertDropdown />
      </ToolbarGroup>
    </Toolbar>
  );
};

export default MenuBar;
