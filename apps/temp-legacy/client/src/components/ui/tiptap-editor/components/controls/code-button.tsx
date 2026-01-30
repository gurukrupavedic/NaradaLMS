import React from "react";

import { useMark } from "../../hooks/use-mark";
import { MenuButton } from "../menu-button";

const CodeButton = () => {
  const { isActive, canToggle, toggleMark } = useMark("code");

  return (
    <MenuButton
      icon={"CodeInline"}
      tooltip={"Code"}
      shortcuts={["Mod", "E"]}
      active={isActive}
      disabled={!canToggle}
      onClick={toggleMark}
    />
  );
};

export default CodeButton;
