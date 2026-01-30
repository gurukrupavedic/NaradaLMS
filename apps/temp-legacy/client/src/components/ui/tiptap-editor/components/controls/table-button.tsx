import React from "react";

import { useTable } from "../../hooks/use-table";
import { MenuButton } from "../menu-button";
import TableBuilder from "../table-builder";

const TableButton = () => {
  const { canInsert, insert } = useTable();

  return (
    <MenuButton
      icon="Table"
      tooltip="Insert Table"
      type="popover"
      hideArrow
      disabled={!canInsert}
    >
      <TableBuilder
        onCreate={({ rows, cols }) =>
          insert({
            rows,
            cols,
            withHeaderRow: false,
          })
        }
      />
    </MenuButton>
  );
};

export default TableButton;
