"use client";

import * as React from "react";
import { List, type RowComponentProps } from "react-window";
import { cn } from "../lib/utils";

export interface VirtualizedListProps<T> {
  /** Items to render */
  items: T[];
  /** Render a single item. Use React.memo for the item component and stable callbacks. */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Height of each item in px (fixed size list) */
  estimateSize: number;
  /** Height of the scroll container in px */
  height: number;
  /** Optional width (default 100%) */
  width?: number | string;
  /** Optional className for the list container */
  className?: string;
  /** Optional overscan count (default 2) */
  overscanCount?: number;
}

function VirtualizedListInner<T>({
  items,
  renderItem,
  estimateSize,
  height,
  width = "100%",
  className,
  overscanCount = 2,
}: VirtualizedListProps<T>) {
  const Row = React.useCallback(
    ({ index, style }: RowComponentProps<object>) => (
      <div style={style}>{renderItem(items[index], index)}</div>
    ),
    [items, renderItem]
  );

  return (
    <List
      rowCount={items.length}
      rowHeight={estimateSize}
      rowComponent={Row}
      rowProps={{}}
      overscanCount={overscanCount}
      className={cn(className)}
      style={{ height, width: width ?? "100%" }}
    />
  );
}

export const VirtualizedList = React.memo(VirtualizedListInner) as typeof VirtualizedListInner;
