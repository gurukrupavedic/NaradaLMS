import { Extension } from "@tiptap/react";

export interface CellAlignOptions {
  /**
   * The types where the cell align attribute can be applied.
   * @default ['tableCell', 'tableHeader']
   * @example ['tableCell', 'tableHeader']
   */
  types: string[];
  /**
   * The alignments which are allowed.
   * @default ['top', 'top-left', 'top-right', 'middle', 'middle-left', 'middle-right', 'bottom', 'bottom-left', 'bottom-right']
   * @example ['top', 'middle', 'bottom']
   */
  alignments: string[];
  /**
   * The default alignment.
   * @default 'top-left'
   * @example 'middle'
   */
  defaultAlignment: CellAlign;
}

type CellAlign =
  | "top"
  | "top-left"
  | "top-right"
  | "middle"
  | "middle-left"
  | "middle-right"
  | "bottom"
  | "bottom-left"
  | "bottom-right";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    cellAlign: {
      /**
       * Set the cell align attribute
       * @param alignment The cell alignment
       * @example editor.commands.setCellAlign('middle')
       */
      setCellAlign: (alignment: string) => ReturnType;
      /**
       * Unset the cell align attribute
       * @example editor.commands.unsetCellAlign()
       */
      unsetCellAlign: () => ReturnType;
      /**
       * Toggle the cell align attribute
       * @param alignment The cell alignment
       * @example editor.commands.toggleCellAlign('bottom')
       */
      toggleCellAlign: (alignment: string) => ReturnType;
    };
  }
}

/**
 * This extension allows you to set alignment for table cells.
 * Specifically designed for table cells and headers with combined vertical and horizontal alignment.
 */
export const CellAlign = Extension.create<CellAlignOptions>({
  name: "cellAlign",

  addOptions() {
    return {
      types: ["tableCell", "tableHeader"],
      alignments: [
        "top",
        "top-left",
        "top-right",
        "middle",
        "middle-left",
        "middle-right",
        "bottom",
        "bottom-left",
        "bottom-right",
      ],
      defaultAlignment: "top-left",
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          cellAlign: {
            default: this.options.defaultAlignment,
            parseHTML: (element) => {
              const verticalAlign = element.style.verticalAlign || "top";
              const textAlign = element.style.textAlign || "left";

              let cellAlign = "";

              if (["top", "middle", "bottom"].includes(verticalAlign)) {
                cellAlign += verticalAlign;
              } else {
                cellAlign = "top";
              }

              if (["left", "right"].includes(textAlign)) {
                cellAlign += `-${textAlign}`;
              } else {
                // center or other values means no suffix (just vertical)
              }

              return this.options.alignments.includes(cellAlign as CellAlign)
                ? (cellAlign as CellAlign)
                : this.options.defaultAlignment;
            },
            renderHTML: (attributes) => {
              if (
                !attributes.cellAlign ||
                attributes.cellAlign === this.options.defaultAlignment
              ) {
                return {};
              }

              const [vertical, horizontal] = attributes.cellAlign.split("-");

              const styles = [];
              if (vertical) {
                styles.push(`vertical-align: ${vertical}`);
              }

              if (horizontal) {
                styles.push(`text-align: ${horizontal}`);
              }

              return styles.length > 0 ? { style: styles.join("; ") } : {};
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setCellAlign:
        (cellAlign) =>
        ({ commands, editor }) => {
          if (!this.options.alignments.includes(cellAlign)) {
            return false;
          }

          const isInTable = editor.isActive("table");
          if (!isInTable) {
            return false;
          }

          return this.options.types
            .map((type) => commands.updateAttributes(type, { cellAlign }))
            .some((response) => response);
        },

      unsetCellAlign:
        () =>
        ({ commands, editor }) => {
          const isInTable = editor.isActive("table");
          if (!isInTable) {
            return false;
          }

          return this.options.types
            .map((type) => commands.resetAttributes(type, "cellAlign"))
            .some((response) => response);
        },

      toggleCellAlign:
        (cellAlign) =>
        ({ editor, commands }) => {
          if (!this.options.alignments.includes(cellAlign)) {
            return false;
          }

          const isInTable = editor.isActive("table");
          if (!isInTable) {
            return false;
          }

          if (editor.isActive({ cellAlign })) {
            return commands.unsetCellAlign();
          }

          return commands.setCellAlign(cellAlign);
        },
    };
  },
});

export default CellAlign;
