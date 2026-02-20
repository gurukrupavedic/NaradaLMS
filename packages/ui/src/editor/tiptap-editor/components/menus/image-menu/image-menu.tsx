import React, { useCallback, useState } from "react";

import AltTextEdit from "./alt-text-edit";
import SizeDropdown from "./size-dropdown";
import { useImage } from "../../../hooks/use-image";
import { MenuButton } from "../../menu-button";
import { Toolbar, ToolbarDivider } from "../../ui/toolbar";

export const ImageMenu = () => {
  const {
    imageData,
    canToggleCaption,
    canUpdateAttributes,
    canRemove,
    setAlt,
    setSize,
    toggleCaption,
    remove,
    download,
  } = useImage();
  const [isEditAltText, setIsEditAltText] = useState(false);

  const handleAltTextApply = useCallback(
    (value: string) => {
      setAlt(value);
      setIsEditAltText(false);
    },
    [setAlt]
  );

  const handleAltTextCancel = useCallback(() => {
    setIsEditAltText(false);
  }, []);

  const handleToggleAltText = useCallback(() => {
    setIsEditAltText(true);
  }, []);

  return isEditAltText ? (
    <AltTextEdit
      initialText={imageData?.alt || ""}
      onApply={handleAltTextApply}
      onCancel={handleAltTextCancel}
    />
  ) : (
    <Toolbar>
      <MenuButton
        text="Alt text"
        hideText={false}
        tooltip="Alternative text"
        disabled={!canUpdateAttributes}
        onClick={handleToggleAltText}
      />
      <MenuButton
        icon="ImageCaption"
        tooltip={`Caption: ${imageData?.hasCaption ? "ON" : "OFF"}`}
        active={imageData?.hasCaption}
        disabled={!canToggleCaption}
        onClick={toggleCaption}
      />
      <ToolbarDivider />
      <SizeDropdown value={imageData?.width || 0} onChange={setSize} />
      <ToolbarDivider />
      <MenuButton
        icon="Download"
        tooltip="Download"
        disabled={!imageData?.src}
        onClick={download}
      />
      <MenuButton
        icon="Trash"
        tooltip="Delete"
        disabled={!canRemove}
        onClick={remove}
      />
    </Toolbar>
  );
};

export default ImageMenu;
