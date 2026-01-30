import React from "react";

import { useCopyToClipboard } from "../../../hooks/use-copy-to-clipboard";
import { MenuButton } from "../../menu-button";
import { Toolbar } from "../../ui/toolbar";

interface LinkViewProps {
  url: string;
  onEdit?: () => void;
  onRemove?: () => void;
}

const LinkView = ({ url, onEdit, onRemove }: LinkViewProps) => {
  const { copy, isCopied } = useCopyToClipboard();

  return (
    <Toolbar>
      <MenuButton text="Edit link" hideText={false} onClick={onEdit} />
      <MenuButton
        icon="ExternalLink"
        text="Open in new tab"
        onClick={() => window.open(url, "_blank")}
      />
      <MenuButton
        icon={isCopied ? "Check" : "Clipboard"}
        text={isCopied ? "Copied" : "Copy link"}
        onClick={() => copy(url)}
      />
      <MenuButton icon="Unlink" text="Remove link" onClick={onRemove} />
    </Toolbar>
  );
};

export default LinkView;
