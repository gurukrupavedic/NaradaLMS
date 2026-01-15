import React from "react";

import {
  useHeading,
  HEADING_LEVELS,
  type HeadingType,
} from "../../hooks/use-heading";
import { MenuButton } from "../menu-button";
import { DropdownMenuItem } from "../ui/dropdown";

const HeadingDropdown = () => {
  const { currentType, canToggle, toggleHeading } = useHeading();

  const options = [
    {
      value: "paragraph",
      label: "Paragraph",
      display: "p",
    },
    ...HEADING_LEVELS.map((level) => ({
      value: `heading${level}`,
      label: `Heading ${level}`,
      display: `h${level}`,
    })),
  ] as { value: HeadingType; label: string; display: string }[];

  const currentLabel =
    options.find((item) => item.value === currentType)?.label || "Headings";

  return (
    <MenuButton
      type="dropdown"
      text={currentLabel}
      tooltip="Headings"
      hideText={false}
      disabled={!canToggle}
      buttonStyle={{ minWidth: "6.5rem" }}
      dropdownClass="rte-heading-dropdown"
    >
      {options.map((item) => (
        <DropdownMenuItem
          key={item.value}
          data-active={item.value === currentType || undefined}
          data-heading={item.display}
          onSelect={() => toggleHeading(item.value)}
        >
          {item.label}
        </DropdownMenuItem>
      ))}
    </MenuButton>
  );
};

export default HeadingDropdown;
