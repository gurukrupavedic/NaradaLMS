import React from "react";

import { BubbleMenu } from "../../bubble-menu";
import BoldButton from "../../controls/bold-button";
import HeadingDropdown from "../../controls/heading-dropdown";
import ItalicButton from "../../controls/italic-button";
import LinkButton from "../../controls/link-button";
import TextAlignPopover from "../../controls/text-align-popover";
import UnderlineButton from "../../controls/underline-button";
import { Toolbar, ToolbarDivider, ToolbarGroup } from "../../ui/toolbar";

export const TextMenu = () => {
  return (
    <BubbleMenu key="text-menu">
      <Toolbar>
        <ToolbarGroup>
          <HeadingDropdown />
        </ToolbarGroup>

        <ToolbarDivider />

        <ToolbarGroup>
          <BoldButton />
          <ItalicButton />
          <UnderlineButton />
        </ToolbarGroup>

        <ToolbarDivider />

        <ToolbarGroup>
          <LinkButton />
          <TextAlignPopover />
        </ToolbarGroup>
      </Toolbar>
    </BubbleMenu>
  );
};

export default TextMenu;
