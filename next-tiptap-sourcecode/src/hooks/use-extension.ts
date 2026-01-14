// "use client";

// import React from "react";
// import { type Extension } from "@tiptap/react";

// type ExtensionConfig = {
//   placeholder?: string | Record<string, string>;
//   characterCountLimit?: number;
// };

// const placeholders: Record<string, Record<string, string>> = {
//   en: {
//     paragraph: "Type your content here...",
//     imageCaption: "Type caption for image (optional)",
//   },
//   vi: {
//     paragraph: "Nhập nội dung bài viết...",
//     imageCaption: "Nhập chú thích ảnh (tuỳ chọn)",
//   },
//   jp: {
//     paragraph: "ここに内容を入力してください...",
//     imageCaption: "画像のキャプションを入力（任意）",
//   },
// };

// export const useExtension = (defaultConfig: ExtensionConfig = {}) => {
//   const [config, setConfig] = React.useState<ExtensionConfig>(defaultConfig);
//   const configRef = React.useRef<ExtensionConfig>(defaultConfig);

//   const configure = React.useCallback((newConfig: Partial<ExtensionConfig>) => {
//     setConfig((prev) => {
//       const merged = { ...prev, ...newConfig };
//       configRef.current = merged;
//       return merged;
//     });
//   }, []);

//   const extensions = React.useMemo(() => {
//     return [
//       StarterKit.configure({
//         horizontalRule: false,
//         hardBreak: false,
//         codeBlock: false,
//         link: false,
//         trailingNode: false,
//       }),
//       Placeholder.configure({
//         includeChildren: true,
//         showOnlyCurrent: true,
//         showOnlyWhenEditable: true,
//         placeholder: ({ node }) => {
//           const { placeholder } = configRef.current;
//           if (typeof placeholder === "string") return placeholder;
//           if (placeholder && node.type.name in placeholder) {
//             return placeholder[node.type.name];
//           }
//           return "Write something…";
//         },
//       }),
//       CharacterCount.configure({
//         limit: configRef.current.characterCountLimit,
//       }),
//       Selection.configure({ className: "selection" }),
//       TextAlign.configure({
//         types: ["heading", "paragraph"],
//         alignments: ["left", "center", "right", "justify"],
//       }),
//       Table.configure({ table: { cellMinWidth: 35, resizable: true } }),
//       Link.configure({
//         autolink: false,
//         openOnClick: false,
//         defaultProtocol: "https",
//         protocols: ["http", "https", "mailto"],
//         HTMLAttributes: { rel: "noopener noreferrer nofollow" },
//       }),
//       TextStyle.configure({
//         backgroundColor: { types: ["heading", "paragraph"] },
//         color: { types: ["heading", "paragraph"] },
//       }),
//       Superscript,
//       Subscript,
//       ImageFigure,
//       CodeBlock,
//       Youtube,
//     ] as Extension[];
//   }, []);

//   return { extensions, configure, config };
// };
