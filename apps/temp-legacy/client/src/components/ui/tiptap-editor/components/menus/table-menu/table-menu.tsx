import React from "react";

import AlignmentDropdown from "./align-dropdown";
import { DeleteDropdown } from "./delete-dropdown";
import { InsertDropdown } from "./insert-dropdown";
import { useTable } from "../../../hooks/use-table";
import { MenuButton } from "../../menu-button";
import { Toolbar, ToolbarDivider } from "../../ui/toolbar";

export const TableMenu = () => {
  const {
    addRowBefore,
    addRowAfter,
    addColumnBefore,
    addColumnAfter,
    deleteRow,
    deleteColumn,
    toggleHeaderRow,
    toggleHeaderColumn,
    mergeCells,
    splitCell,
    deleteTable,
    toggleCellAlignment,
  } = useTable();

  return (
    <Toolbar>
      <MenuButton
        icon="RowHeader"
        tooltip="Toggle row header"
        onClick={toggleHeaderRow}
      />
      <MenuButton
        icon="ColHeader"
        tooltip="Toggle column header"
        onClick={toggleHeaderColumn}
      />

      <ToolbarDivider />

      <MenuButton icon="SplitCell" tooltip="Split cell" onClick={splitCell} />
      <MenuButton icon="MergeCell" tooltip="Merge cells" onClick={mergeCells} />

      <ToolbarDivider />

      <InsertDropdown
        addRowBefore={addRowBefore}
        addRowAfter={addRowAfter}
        addColumnBefore={addColumnBefore}
        addColumnAfter={addColumnAfter}
      />
      <DeleteDropdown
        deleteColumn={deleteColumn}
        deleteRow={deleteRow}
        deleteTable={deleteTable}
      />

      <ToolbarDivider />

      <AlignmentDropdown toggleCellAlign={toggleCellAlignment} />
    </Toolbar>
  );
};

export default TableMenu;

// import React, { useCallback } from "react";

// import { useTiptapContext } from "../../provider";
// import { getNodeContainer } from "../../../utils/getNodeContainer";
// import { MenuButton } from "../../menu-button";
// import { Toolbar } from "../../ui/toolbar";
// import { BubbleMenu } from "../../BubbleMenu";

// export const TableMenu = () => {
//   const { editor } = useTiptapContext();

//   const shouldShow = useCallback(({ editor }: any) => {
//     return editor.isActive("table");
//   }, []);

//   const getReferenceClientRect = useCallback(() => {
//     const node = getNodeContainer(editor, "table");
//     return node?.getBoundingClientRect() || new DOMRect(-1000, -1000, 0, 0);
//   }, [editor]);

//   const addRowOrColumn = useCallback(
//     (type: "Row" | "Column", position: "Before" | "After") => {
//       const command = `add${type}${position}` as const;
//       return () => editor.chain().focus()[command]().run();
//     },
//     [editor]
//   );

//   const deleteRowOrColumn = useCallback(
//     (type: "Row" | "Column") => {
//       const command = `delete${type}` as const;
//       return () => editor.chain().focus()[command]().run();
//     },
//     [editor]
//   );

//   const toggleHeader = useCallback(
//     (type: "Row" | "Column") => {
//       const command = `toggleHeader${type}` as const;
//       return () => editor.chain().focus()[command]().run();
//     },
//     [editor]
//   );

//   const mergeCells = useCallback(
//     () => editor.chain().focus().mergeCells().run(),
//     [editor]
//   );
//   const splitCell = useCallback(
//     () => editor.chain().focus().splitCell().run(),
//     [editor]
//   );
//   const deleteTable = useCallback(
//     () => editor.chain().focus().deleteTable().run(),
//     [editor]
//   );

//   return (
//     <BubbleMenu
//       className="rte-bubble-menu"
//       shouldShow={shouldShow}
//       getReferenceClientRect={getReferenceClientRect}
//       // appendTo={contentElement.current as HTMLElement}
//     >
//       <Toolbar>
//         <MenuButton
//           icon="RowInsertTop"
//           tooltip="Add row above"
//           onClick={addRowOrColumn("Row", "Before")}
//         />
//         <MenuButton
//           icon="RowInsertBottom"
//           tooltip="Add row below"
//           onClick={addRowOrColumn("Row", "After")}
//         />
//         <MenuButton
//           icon="ColInsertLeft"
//           tooltip="Add column before"
//           onClick={addRowOrColumn("Column", "Before")}
//         />
//         <MenuButton
//           icon="ColInsertRight"
//           tooltip="Add column after"
//           onClick={addRowOrColumn("Column", "After")}
//         />
//         <MenuButton icon="SplitCell" tooltip="Split cell" onClick={splitCell} />
//         <MenuButton
//           icon="MergeCell"
//           tooltip="Merge cells"
//           onClick={mergeCells}
//         />
//       </Toolbar>
//       <Toolbar style={{ justifyContent: "center" }}>
//         <MenuButton
//           icon="RowHeader"
//           tooltip="Toggle row header"
//           onClick={toggleHeader("Row")}
//         />
//         <MenuButton
//           icon="ColHeader"
//           tooltip="Toggle column header"
//           onClick={toggleHeader("Column")}
//         />
//         <MenuButton
//           icon="RowRemove"
//           tooltip="Delete row"
//           onClick={deleteRowOrColumn("Row")}
//         />
//         <MenuButton
//           icon="ColRemove"
//           tooltip="Delete column"
//           onClick={deleteRowOrColumn("Column")}
//         />
//         <MenuButton icon="Trash" tooltip="Delete table" onClick={deleteTable} />
//       </Toolbar>
//     </BubbleMenu>
//   );
// };

// export default TableMenu;
