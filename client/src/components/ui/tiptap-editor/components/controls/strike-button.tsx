import React from "react";

import { useMark } from "../../hooks/use-mark";
import { MenuButton } from "../menu-button";

const StrikeButton = () => {
  const { isActive, canToggle, toggleMark } = useMark("strike");

  return (
    <MenuButton
      icon={"Strike"}
      tooltip={"Strike"}
      shortcuts={["Mod", "Shift", "S"]}
      active={isActive}
      disabled={!canToggle}
      onClick={toggleMark}
    />
  );
};

export default StrikeButton;
