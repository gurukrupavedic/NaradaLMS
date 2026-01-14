import React from "react";

import { useMark } from "../../hooks/use-mark";
import { MenuButton } from "../menu-button";

const ItalicButton = () => {
  const { isActive, canToggle, toggleMark } = useMark("italic");

  return (
    <MenuButton
      icon={"Italic"}
      tooltip={"Italic"}
      shortcuts={["Mod", "I"]}
      active={isActive}
      disabled={!canToggle}
      onClick={toggleMark}
    />
  );
};

export default ItalicButton;
