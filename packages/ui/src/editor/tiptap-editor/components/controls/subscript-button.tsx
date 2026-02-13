import React from "react";

import { useMark } from "../../hooks/use-mark";
import { MenuButton } from "../menu-button";

const SubscriptButton = () => {
  const { isActive, canToggle, toggleMark } = useMark("subscript");

  return (
    <MenuButton
      icon={"Subscript"}
      tooltip={"Subscript"}
      shortcuts={["Mod", "Shift", "="]}
      active={isActive}
      disabled={!canToggle}
      onClick={toggleMark}
    />
  );
};

export default SubscriptButton;
