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
