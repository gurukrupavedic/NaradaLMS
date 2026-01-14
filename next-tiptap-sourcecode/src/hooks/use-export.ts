import { useCallback } from "react";

import { type JSONContent } from "@tiptap/react";

import DocxExporter, {
  defaultMarkMapping,
  defaultNodeMapping,
} from "@/lib/docx";

export function useExport() {
  const exportToDocx = useCallback(
    async (content: JSONContent, filename: string = "document.docx") => {
      const exporter = new DocxExporter(defaultNodeMapping, defaultMarkMapping);
      const result = await exporter.export(content, "blob");

      const url = URL.createObjectURL(result as Blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return result;
    },
    []
  );

  return { exportToDocx };
}
