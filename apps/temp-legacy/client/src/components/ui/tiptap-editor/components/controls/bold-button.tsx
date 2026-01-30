import React from "react";

import { useMark } from "../../hooks/use-mark";
import { MenuButton } from "../menu-button";

const BoldButton = () => {
  const { isActive, canToggle, toggleMark } = useMark("bold");

  return (
    <MenuButton
      icon={"Bold"}
      tooltip={"Bold"}
      shortcuts={["Mod", "B"]}
      active={isActive}
      disabled={!canToggle}
      onClick={toggleMark}
    />
  );
};

export default BoldButton;
