import React, { CSSProperties, useRef } from "react";

import { createPortal } from "react-dom";

import useMount from "../../hooks/use-mount";
import { useTextStyle } from "../../hooks/use-text-style";
import ColorPicker from "../color-picker";
import { MenuButton } from "../menu-button";

const TextColorPopover = () => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const mounted = useMount();
  const { currentValue, canSetValue, setValue, unsetValue } =
    useTextStyle("color");

  const colorBarStyle: CSSProperties = {
    position: "absolute",
    bottom: 1.5,
    insetInline: 5,
    height: 4,
    borderRadius: 4,
    pointerEvents: "none",
    background: currentValue || "var(--rte-fg, black)",
  };

  const renderBar =
    mounted && buttonRef.current
      ? createPortal(<div style={colorBarStyle} />, buttonRef.current)
      : null;

  return (
    <>
      <MenuButton
        ref={buttonRef}
        type="popover"
        icon={"TextColor"}
        hideArrow
        tooltip={"Text color"}
        disabled={!canSetValue}
      >
        <ColorPicker
          color={currentValue || "DEFAULT"}
          onChange={(color) => setValue(color)}
          onReset={() => unsetValue()}
        />
      </MenuButton>
      {renderBar}
    </>
  );
};

export default TextColorPopover;
