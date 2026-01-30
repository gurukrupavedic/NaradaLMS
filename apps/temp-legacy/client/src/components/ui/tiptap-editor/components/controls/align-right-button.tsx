import React from "react";

import { useTextAlign } from "../../hooks/use-text-align";
import { MenuButton } from "../menu-button";

const AlignRightButton = () => {
  const { isActive, canAlign, setTextAlign } = useTextAlign("right");

  return (
    <MenuButton
      icon="AlignRight"
      tooltip="Align Right"
      shortcuts={["Mod", "Shift", "R"]}
      active={isActive}
      disabled={!canAlign}
      onClick={setTextAlign}
    />
  );
};

export default AlignRightButton;
