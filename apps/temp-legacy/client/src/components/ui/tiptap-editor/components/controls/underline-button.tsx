import React from "react";

import { useMark } from "../../hooks/use-mark";
import { MenuButton } from "../menu-button";

const UnderlineButton = () => {
  const { isActive, canToggle, toggleMark } = useMark("underline");

  return (
    <MenuButton
      icon={"Underline"}
      tooltip={"Underline"}
      shortcuts={["Mod", "U"]}
      active={isActive}
      disabled={!canToggle}
      onClick={toggleMark}
    />
  );
};

export default UnderlineButton;
