import React from "react";

import { useTextAlign } from "../../hooks/use-text-align";
import { MenuButton } from "../menu-button";


const AlignCenterButton = () => {
  const { isActive, canAlign, setTextAlign } = useTextAlign("center");

  return (
    <MenuButton
      icon="AlignCenter"
      tooltip="Align Center"
      shortcuts={["Mod", "Shift", "E"]}
      active={isActive}
      disabled={!canAlign}
      onClick={setTextAlign}
    />
  );
};

export default AlignCenterButton;
