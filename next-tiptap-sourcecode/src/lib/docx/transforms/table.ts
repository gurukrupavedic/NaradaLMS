import {
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  BorderStyle,
} from "docx";

import { pixelsToTwip, type DocxExporter } from "..";
import { processParagraph } from "./paragraph";

import type { TiptapNode } from "../types";

function calculateTableColumns(tableNode: TiptapNode): number {
  const columnCounts = (tableNode.content || []).map((row) =>
    (row.content || []).reduce(
      (sum, cell) => sum + (cell.attrs?.colspan || 1),
      0
    )
  );
  return Math.max(...columnCounts, 1);
}

function calculateColumnWidths(
  tableNode: TiptapNode,
  availableWidth: number
): number[] {
  const totalColumns = calculateTableColumns(tableNode);
  const defaultColWidth = Math.round(availableWidth / totalColumns);

  const firstRow = (tableNode.content || [])[0];
  if (!firstRow) {
    return Array(totalColumns).fill(defaultColWidth);
  }

  // Extract colwidth for each column from first row
  const columnWidths = firstRow.content!.flatMap((cell) => {
    const colspan = cell.attrs?.colspan || 1;
    const colwidth = cell.attrs?.colwidth;

    return Array.isArray(colwidth)
      ? colwidth.map(pixelsToTwip)
      : Array(colspan).fill(defaultColWidth);
  });

  const totalWidth = columnWidths.reduce((sum, w) => sum + w, 0);

  // Scale down if table is too wide
  if (totalWidth > availableWidth) {
    const scale = availableWidth / totalWidth;
    return columnWidths.map((w) => Math.round(w * scale));
  }

  return columnWidths;
}

async function processTableCell(
  cellNode: TiptapNode,
  exporter: DocxExporter,
  cellWidth: number
): Promise<TableCell> {
  const isHeader = cellNode.type === "tableHeader";
  const colspan = cellNode.attrs?.colspan || 1;
  const rowspan = cellNode.attrs?.rowspan || 1;

  const cellContentPromises = (cellNode.content || []).map(async (child) => {
    if (child.type === "paragraph") {
      return processParagraph(child, exporter, {
        spacing: { before: 40, after: 40 },
        run: { bold: isHeader },
      });
    }

    return exporter.transformBlock(child);
  });

  const cellContent = (await Promise.all(cellContentPromises)).flatMap(
    (item) => (item ? (Array.isArray(item) ? item : [item]) : [])
  );

  return new TableCell({
    width: { size: cellWidth, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 80, right: 80 },
    columnSpan: colspan,
    rowSpan: rowspan,
    shading: isHeader ? { type: ShadingType.CLEAR, fill: "F3F4F6" } : undefined,
    children: cellContent,
  });
}

async function processTableRow(
  rowNode: TiptapNode,
  exporter: DocxExporter,
  columnWidths: number[]
): Promise<TableRow> {
  const cells: TableCell[] = [];
  let currentColumnIndex = 0;

  for (const cellNode of rowNode.content || []) {
    const colspan = cellNode.attrs?.colspan || 1;

    // Calculate cell width by summing up spanned column widths
    let cellWidth = 0;
    for (let i = 0; i < colspan; i++) {
      cellWidth += columnWidths[currentColumnIndex + i] || 0;
    }

    const cell = await processTableCell(cellNode, exporter, cellWidth);
    cells.push(cell);

    currentColumnIndex += colspan;
  }

  return new TableRow({ children: cells });
}

export async function processTable(
  node: TiptapNode,
  exporter: DocxExporter
): Promise<Table> {
  const availableWidth = exporter.availableWidth;
  const columnWidths = calculateColumnWidths(node, availableWidth);

  const rows = await Promise.all(
    (node.content || []).map((rowNode) =>
      processTableRow(rowNode, exporter, columnWidths)
    )
  );

  return new Table({
    width: { size: availableWidth, type: WidthType.DXA },
    layout: "autofit",
    columnWidths,
    margins: { top: 160, bottom: 160, left: 50, right: 50 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "E5E7EB" },
    },
    rows,
  });
}
