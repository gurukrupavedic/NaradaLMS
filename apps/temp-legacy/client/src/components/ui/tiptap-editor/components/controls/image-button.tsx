import React, { ChangeEvent, Fragment, useCallback, useRef } from "react";

import { useImage } from "../../hooks/use-image";
import { MenuButton } from "../menu-button";

const ImageButton = () => {
  const { canInsert, insert } = useImage();
  const fileInput = useRef<HTMLInputElement>(null);

  const handleClick = useCallback(() => {
    fileInput.current?.click();
  }, []);

  const onUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const target = e.target;
      const file = target.files?.[0];

      if (file?.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        insert({ src: url, alt: file.name });
        // Reset input value to allow uploading same file again
        target.value = "";
      }
    },
    [insert]
  );

  return (
    <Fragment>
      <MenuButton
        icon="Image"
        tooltip="Insert Image"
        disabled={!canInsert}
        onClick={handleClick}
      />
      <input
        style={{ display: "none" }}
        type="file"
        accept="image/*"
        ref={fileInput}
        onChange={onUpload}
      />
    </Fragment>
  );
};

export default ImageButton;
