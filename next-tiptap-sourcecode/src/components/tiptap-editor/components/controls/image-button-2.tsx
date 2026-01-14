import React, { ChangeEvent, Fragment, useCallback, useRef } from "react";

import MediaLibrary from "@/components/media-library";

import { useImage } from "../../hooks/use-image";
import useModal from "../../hooks/use-modal";
import { MenuButton } from "../menu-button";
import Dialog from "../ui/dialog";

const ImageButton = () => {
  const { canInsert, insert } = useImage();
  const { open, handleOpen, handleClose } = useModal();

  return (
    <>
      <MenuButton
        icon="Image"
        tooltip="Image"
        disabled={!canInsert}
        onClick={handleOpen}
      />
      <Dialog open={open} onOpenChange={handleClose}>
        <MediaLibrary
          onClose={handleClose}
          onInsert={(image) => {
            insert({
              src: image.url,
              width: image.width,
              height: image.height,
            });
            handleClose();
          }}
        />
      </Dialog>
    </>
  );
};

export default ImageButton;
