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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";

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
          <ToolbarGroup className="pl-4 gap-2">
            <span className="text-xs font-medium text-muted-foreground">Script:</span>
            <Select
              value={currentScript}
              onValueChange={onScriptChange}
            >
              <SelectTrigger className="w-40 h-7 text-xs bg-white dark:bg-gray-950 shadow-none border-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="te">Telugu</SelectItem>
                <SelectItem value="hi">Devanagari (Hindi)</SelectItem>
                <SelectItem value="en">English (IAST)</SelectItem>
              </SelectContent>
            </Select>
          </ToolbarGroup>

          <ToolbarDivider />
        </>
      )}

      {/* Formatting Tools */}
      {/* Formatting Tools - Hidden in read-only mode */}
      {!disabled && (
        <>
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
        </>
      )}
    </Toolbar>
  );
};

export default MenuBar;
