import React, { useEffect, useState } from "react";

import Button from "../../ui/button";
import Input from "../../ui/input";
import Label from "../../ui/label";

interface LinkEditProps {
  initialUrl?: string;
  initialText?: string;
  isCreate?: boolean;
  onCancel?: () => void;
  onSubmit?: (url: string, text?: string) => void;
}

const LinkEdit = ({
  initialUrl,
  initialText,
  isCreate,
  onSubmit,
  onCancel,
}: LinkEditProps) => {
  const [url, setUrl] = useState(initialUrl || "");
  const [text, setText] = useState(initialText || "");
  const [canSubmit, setCanSubmit] = useState(isCreate);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit?.(url!, text);
  };

  useEffect(() => {
    // if (!isCreate) {
    setCanSubmit((url && url !== initialUrl) || text !== initialText);
    // }
  }, [text, url]);

  return (
    <form className="rte-link__form" onSubmit={handleSubmit}>
      <Label className="rte-link__label">URL</Label>
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="rte-link__input"
        placeholder="Paste link"
        type="url"
        required
        autoFocus
      />

      <Label className="rte-link__label">Display Text</Label>
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="rte-link__input"
        placeholder="Enter link text"
      />

      <div className="rte-link__actions">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          Apply
        </Button>
      </div>
    </form>
  );
};

export default LinkEdit;
