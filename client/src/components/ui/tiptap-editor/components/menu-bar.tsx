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
  editorMode?: 'html' | 'text';
  onModeChange?: (mode: 'html' | 'text') => void;
};

export const MenuBar = ({ currentScript, onScriptChange, disabled, editorMode, onModeChange }: MenuBarProps) => {
  const isTextMode = editorMode === 'text';

  return (
    <Toolbar dense className="rte-menu-bar">
      {/* Script Selector - First group */}
      {currentScript && onScriptChange && (
        <>
          <ToolbarGroup className="pl-1">
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

          {!isTextMode && <ToolbarDivider />}
        </>
      )}

      {/* Formatting Tools - Only in HTML mode */}
      {!isTextMode && (
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

      {/* Mode Toggle - Far right */}
      {editorMode && onModeChange && (
        <ToolbarGroup className="ml-auto pr-1">
          <Tabs value={editorMode} onValueChange={onModeChange as (value: string) => void}>
            <TabsList className="h-8 bg-transparent p-0 gap-1 select-none">
              <TabsTrigger
                value="html"
                className="text-xs h-7 px-3 rounded-sm data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none border border-transparent data-[state=active]:border-border hover:bg-muted/50"
              >
                HTML
              </TabsTrigger>
              <TabsTrigger
                value="text"
                className="text-xs h-7 px-3 rounded-sm data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none border border-transparent data-[state=active]:border-border hover:bg-muted/50"
              >
                Text
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </ToolbarGroup>
      )}
    </Toolbar>
  );
};

export default MenuBar;
