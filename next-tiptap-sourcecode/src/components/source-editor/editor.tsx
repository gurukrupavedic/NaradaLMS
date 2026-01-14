import React, {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";

import { formatHtml } from "./format";
import { useCodeMirror } from "./use-code-mirror";
import "./CodeMirror.scss";

interface SourceEditorProps {
  initialContent: string;
  onChange?: (content: string) => void;
}

const SourceEditor = forwardRef<HTMLDivElement, SourceEditorProps>(
  ({ initialContent, onChange }, ref) => {
    const [formattedContent, setFormattedContent] = useState<string>("");
    const editorRef = useCodeMirror({
      initialContent: formattedContent,
      onChange,
    });

    useEffect(() => {
      formatHtml(initialContent).then(setFormattedContent);
    }, [initialContent]);

    useImperativeHandle(ref, () => editorRef.current!, [editorRef]);

    return <div className="rte-editor__container" ref={editorRef} />;
  }
);

SourceEditor.displayName = "SourceEditor";

export default SourceEditor;
