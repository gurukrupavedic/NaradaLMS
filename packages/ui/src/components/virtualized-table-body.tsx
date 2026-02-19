"use client";

import * as React from "react";
import { cn } from "../lib/utils";

const ROW_HEIGHT_DEFAULT = 52;
const CONTAINER_HEIGHT_DEFAULT = 400;
const OVERSCAN = 2;

export interface VirtualizedTableBodyProps<T> {
  /** Rows to render (e.g. table.getRowModel().rows from TanStack Table) */
  rows: T[];
  /** Render a single row. Use React.memo for the row component and stable callbacks. */
  renderRow: (row: T, index: number) => React.ReactNode;
  /** Height of each row in px */
  rowHeight?: number;
  /** Height of the scroll container in px (used to compute visible range) */
  height?: number;
  /** Number of columns (for spacer row colspan) */
  columnCount: number;
  /** Ref for the scroll container. Must be attached to the div that wraps the table and has overflow-auto. */
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

function useScrollState(scrollRef: React.RefObject<HTMLDivElement | null>) {
  const [scrollTop, setScrollTop] = React.useState(0);
  const [containerHeight, setContainerHeight] = React.useState(CONTAINER_HEIGHT_DEFAULT);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const update = () => {
      setScrollTop(el.scrollTop);
      setContainerHeight(el.clientHeight);
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [scrollRef]);

  return { scrollTop, containerHeight };
}

export function VirtualizedTableBody<T>({
  rows,
  renderRow,
  rowHeight = ROW_HEIGHT_DEFAULT,
  height: heightProp,
  columnCount,
  scrollContainerRef,
  className,
}: VirtualizedTableBodyProps<T>) {
  const { scrollTop, containerHeight } = useScrollState(scrollContainerRef);
  const height = heightProp ?? containerHeight;

  const totalHeight = rows.length * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
  const visibleCount = Math.ceil(height / rowHeight) + OVERSCAN * 2;
  const endIndex = Math.min(rows.length, startIndex + visibleCount);

  const topHeight = startIndex * rowHeight;
  const bottomHeight = (rows.length - endIndex) * rowHeight;

  const visibleRows = rows.slice(startIndex, endIndex);

  return (
    <tbody className={cn("[&_tr:last-child]:border-0", className)}>
      {startIndex > 0 && (
        <tr aria-hidden="true">
          <td
            colSpan={columnCount}
            style={{ height: topHeight, padding: 0, border: 0, verticalAlign: "top" }}
          />
        </tr>
      )}
      {visibleRows.map((row, i) => (
        <React.Fragment key={startIndex + i}>{renderRow(row, startIndex + i)}</React.Fragment>
      ))}
      {endIndex < rows.length && bottomHeight > 0 && (
        <tr aria-hidden="true">
          <td
            colSpan={columnCount}
            style={{ height: bottomHeight, padding: 0, border: 0, verticalAlign: "top" }}
          />
        </tr>
      )}
    </tbody>
  );
}
