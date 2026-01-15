import React from "react";

import { MenuButton } from "../../menu-button";
import { PopoverClose } from "../../ui/popover";
import { Toolbar } from "../../ui/toolbar";

interface InsertDropdownProps {
  addRowBefore: () => void;
  addRowAfter: () => void;
  addColumnBefore: () => void;
  addColumnAfter: () => void;
}

export const InsertDropdown = ({
  addRowBefore,
  addRowAfter,
  addColumnBefore,
  addColumnAfter,
}: InsertDropdownProps) => {
  return (
    <MenuButton
      type="popover"
      icon="TablePlus"
      dropdownClass="rte-table-insert-dropdown"
      dropdownStyle={{ minWidth: "10rem" }}
    >
      <PopoverClose asChild>
        <Toolbar vertical={true}>
          <MenuButton
            icon="RowInsertTop"
            hideText={false}
            tooltip={false}
            block={true}
            text="Insert row above"
            onClick={addRowBefore}
          />
          <MenuButton
            icon="RowInsertBottom"
            hideText={false}
            block={true}
            tooltip={false}
            text="Insert row below"
            onClick={addRowAfter}
          />
          <MenuButton
            icon="ColInsertLeft"
            hideText={false}
            block={true}
            tooltip={false}
            text="Insert column before"
            onClick={addColumnBefore}
          />
          <MenuButton
            icon="ColInsertRight"
            hideText={false}
            block={true}
            tooltip={false}
            text="Insert column after"
            onClick={addColumnAfter}
          />
        </Toolbar>
      </PopoverClose>
    </MenuButton>
  );
};
