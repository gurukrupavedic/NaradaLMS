import React from "react";

import { useTextAlign } from "../../hooks/use-text-align";
import { MenuButton } from "../menu-button";

const AlignLeftButton = () => {
  const { isActive, canAlign, setTextAlign } = useTextAlign("left");

  return (
    <MenuButton
      icon="AlignLeft"
      tooltip="Align Left"
      shortcuts={["Mod", "Shift", "L"]}
      active={isActive}
      disabled={!canAlign}
      onClick={setTextAlign}
    />
  );
};

export default AlignLeftButton;
