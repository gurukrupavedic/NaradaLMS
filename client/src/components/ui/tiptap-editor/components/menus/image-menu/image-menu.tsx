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

// import React, { useCallback, useEffect, useRef, useState } from "react";
// import { Toolbar, ToolbarDivider } from "../../ui/toolbar";
// import { MenuButton } from "../../menu-button";
// import { useEditorState } from "@tiptap/react";
// import AltTextEdit from "./alt-text-edit";
// import SizeDropdown from "./size-dropdown";
// import { NodeSelection, Selection, TextSelection } from "@tiptap/pm/state";
// import { Node } from "@tiptap/pm/model";
// import { BubbleMenu } from "../../bubble-menu";

// export const ImageMenu = () => {
//   const [isEditAltText, setIsEditAltText] = useState(false);
//   return (
//     <BubbleMenu>
//       {isEditAltText ? (
//         <AltTextEdit initialText={""} onApply={() => {}} onCancel={() => {}} />
//       ) : (
//         <Toolbar>
//           <MenuButton
//             text="Alt text"
//             hideText={false}
//             tooltip={"Alternative text"}
//             onClick={() => {}}
//           />
//           <MenuButton
//             icon="ImageCaption"
//             // tooltip={`Caption: ${image?.hasCaption ? "ON" : "OFF"}`}
//             // active={image?.hasCaption}
//             onClick={() => {}}
//           />
//           <ToolbarDivider />
//           <SizeDropdown
//             //    value={image?.width} onChange={setSize}
//             value={0}
//             onChange={() => {}}
//           />
//           <ToolbarDivider />
//           <MenuButton icon="Download" tooltip="Download" onClick={() => {}} />
//           <MenuButton icon="Trash" tooltip="Delete" onClick={() => {}} />
//         </Toolbar>
//       )}
//     </BubbleMenu>
//   );
// };

// export default ImageMenu;

// const getImageOrFigureNode = (
//   selection: Selection
// ): { node: Node | null; pos: number | null } => {
//   let node: Node | null = null;
//   let pos: number | null = null;

//   if (selection instanceof TextSelection) {
//     // is in figcaption
//     const $anchor = selection.$anchor;
//     const figure = $anchor.node(-1);
//     node = figure.firstChild;
//     pos = $anchor.before(-1) + 1; // Position of the image inside the figure
//   } else if (selection instanceof NodeSelection) {
//     // is in figure or image
//     node = selection.node;
//     pos = selection.from;
//     if (node.type.name === "imageFigure") {
//       node = node.firstChild;
//       pos += 1; // Adjust position for the image inside the figure
//     }
//   }

//   return { node, pos };
// };

// // if (selection instanceof NodeSelection) {
// //   const { $anchor } = selection;
// //   nodeDOM = (
// //     $anchor.depth >= 1
// //       ? view.nodeDOM($anchor.before(1))
// //       : view.nodeDOM(selection.from)
// //   ) as HTMLElement | null;
// //   node = selection.node;
// // } else {
// //   const { $anchor } = selection;
// //   nodeDOM = view.nodeDOM($anchor.before(1)) as HTMLElement | null;
// //   node = $anchor.node(-1);
// // }
