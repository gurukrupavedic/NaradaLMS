import React from "react";

import { useList } from "../../hooks/use-list";
import { MenuButton } from "../menu-button";

const OrderedListButton = () => {
  const { isActive, canToggle, toggleList } = useList("orderedList");

  return (
    <MenuButton
      icon={"OrderedList"}
      tooltip={"Ordered list"}
      shortcuts={["Mod", "Shift", "7"]}
      active={isActive}
      disabled={!canToggle}
      onClick={toggleList}
    />
  );
};

export default OrderedListButton;
