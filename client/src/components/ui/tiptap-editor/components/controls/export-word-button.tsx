// import { useTiptapEditor } from "../provider";
// import { MenuButton } from "../menu-button";
// import { saveAs } from "file-saver";
// import DocxExporter, {
//   defaultMarkMapping,
//   defaultNodeMapping,
// } from "@/lib/docx";
// import { useExport } from "@/hooks/use-export";

// const ExportWordButton = () => {
//   const { exportToDocx } = useExport();
//   // const { editor } = useTiptapEditor();
//   // const exportDocx = async () => {
//   //   const exporter = new DocxExporter(defaultNodeMapping, defaultMarkMapping);
//   //   const buffer = await exporter.export(editor.state.doc, "buffer");
//   //   // console.log(editor.state.doc, editor.getJSON());
//   //   saveAs(
//   //     // @ts-ignore
//   //     new Blob([buffer], {
//   //       type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//   //     }),
//   //     "export.docx"
//   //   );
//   // };

//   return (
//     <MenuButton
//       icon="Download"
//       text="Export to Word"
//       tooltip="Export to Word"
//       onClick={() => exportToDocx("my-document.docx")}
//     />
//   );
// };

// export default ExportWordButton;
