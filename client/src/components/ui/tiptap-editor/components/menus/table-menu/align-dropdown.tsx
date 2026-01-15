import React from "react";

import { CellAlign } from "../../../hooks/use-table";
import { MenuButton } from "../../menu-button";
import Button from "../../ui/button";
import Icon from "../../ui/icon";
import { PopoverClose } from "../../ui/popover";

interface AlignmentDropdownProps {
  toggleCellAlign: (align: CellAlign) => void;
}

export const AlignmentDropdown = ({
  toggleCellAlign,
}: AlignmentDropdownProps) => {
  const alignments = [
    { value: "top-left", label: "Top Left", icon: "AlignTopLeft" },
    { value: "top", label: "Top", icon: "AlignTop" },
    { value: "top-right", label: "Top Right", icon: "AlignTopRight" },
    { value: "middle-left", label: "Middle Left", icon: "AlignMiddleLeft" },
    { value: "middle", label: "Middle", icon: "AlignMiddle" },
    { value: "middle-right", label: "Middle Right", icon: "AlignMiddleRight" },
    { value: "bottom-left", label: "Bottom Left", icon: "AlignBottomLeft" },
    { value: "bottom", label: "Bottom", icon: "AlignBottom" },
    { value: "bottom-right", label: "Bottom Right", icon: "AlignBottomRight" },
  ] as const;

  return (
    <MenuButton
      type="popover"
      icon="AlignCenter"
      dropdownClass="rte-table-align-dropdown"
      dropdownStyle={{}}
    >
      <div className="grid grid-cols-3 grid-rows-3 gap-1.5 aspect-square p-1.5">
        {alignments.map((alignment) => (
          <PopoverClose asChild key={`h-${alignment.value}`}>
            <Button
              variant="ghost"
              iconOnly={true}
              onClick={() => toggleCellAlign(alignment.value)}
            >
              <Icon name={alignment.icon} size={20} />
            </Button>
          </PopoverClose>
        ))}
      </div>
    </MenuButton>
  );
};

export default AlignmentDropdown;
