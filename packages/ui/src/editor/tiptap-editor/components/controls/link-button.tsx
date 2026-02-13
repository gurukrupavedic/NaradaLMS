import React from "react";

import { useLink } from "../../hooks/use-link";
import { MenuButton } from "../menu-button";

const LinkButton = () => {
  const { canSet, isActive, openMenu } = useLink();

  return (
    <MenuButton
      icon="Link"
      tooltip="Link"
      shortcuts={["Mod", "K"]}
      active={isActive}
      disabled={!canSet}
      onClick={openMenu}
    />
  );
};

export default LinkButton;
