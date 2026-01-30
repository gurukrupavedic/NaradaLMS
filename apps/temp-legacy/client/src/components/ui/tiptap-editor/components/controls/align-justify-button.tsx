import React from "react";

import { useTextAlign } from "../../hooks/use-text-align";
import { MenuButton } from "../menu-button";

const AlignJustifyButton = () => {
  const { isActive, canAlign, setTextAlign } = useTextAlign("justify");

  return (
    <MenuButton
      icon="AlignJustify"
      tooltip="Align Justify"
      shortcuts={["Mod", "Shift", "J"]}
      active={isActive}
      disabled={!canAlign}
      onClick={setTextAlign}
    />
  );
};

export default AlignJustifyButton;
