import React from "react";

import { useMark } from "../../hooks/use-mark";
import { MenuButton } from "../menu-button";

const SuperscriptButton = () => {
  const { isActive, canToggle, toggleMark } = useMark("superscript");

  return (
    <MenuButton
      icon={"Superscript"}
      tooltip={"Superscript"}
      shortcuts={["Mod", "Shift", "="]}
      active={isActive}
      disabled={!canToggle}
      onClick={toggleMark}
    />
  );
};

export default SuperscriptButton;
