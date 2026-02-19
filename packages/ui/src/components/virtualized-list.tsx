"use client";

import * as React from "react";
import { FixedSizeList, type ListChildComponentProps } from "react-window";
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
    ({ index, style }: ListChildComponentProps) => (
      <div style={style}>{renderItem(items[index], index)}</div>
    ),
    [items, renderItem]
  );

  return (
    <FixedSizeList
      height={height}
      width={width}
      itemCount={items.length}
      itemSize={estimateSize}
      overscanCount={overscanCount}
      className={cn(className)}
    >
      {Row}
    </FixedSizeList>
  );
}

export const VirtualizedList = React.memo(VirtualizedListInner) as typeof VirtualizedListInner;
