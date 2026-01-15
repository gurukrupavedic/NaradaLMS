import React, { useState } from "react";

import { MenuButton } from "../../menu-button";
import Input from "../../ui/input";

interface AltTextEditProps {
  initialText?: string;
  onCancel: () => void;
  onApply: (value: string) => void;
}

const AltTextEdit = ({ initialText, onApply, onCancel }: AltTextEditProps) => {
  const [text, setText] = useState(initialText || "");

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onApply(text);
  };

  return (
    <form className="rte-text-alternative__form" onSubmit={onSubmit}>
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Text alternative"
        autoFocus
      />
      <MenuButton buttonType="submit" icon={"Check"} tooltip={false} />
      <MenuButton icon={"Close"} tooltip={false} onClick={onCancel} />
    </form>
  );
};

export default AltTextEdit;
