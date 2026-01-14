import React, { useMemo, useCallback, useState } from "react";

import { List, type RowComponentProps } from "react-window";

import { EmojiItem } from "../../helpers/emoji";
import SearchInput from "../ui/search-input";

// import type { EmojiItem } from "@tiptap/extension-emoji";

const EMOJIS_PER_ROW = 8;
const EMOJI_ROW_HEIGHT = 36;

interface EmojiPickerProps {
  emojis: EmojiItem[];
  onSelect?: (emoji: EmojiItem) => void;
}

type EmojiRow = EmojiItem[];

interface EmojiGroupHeader {
  title: string;
  offset: number;
  height: number;
}

interface VirtualizedRowProps {
  items: EmojiRow[];
  onSelect?: (emoji: EmojiItem) => void;
  onHover?: (emoji: EmojiItem | null) => void;
}

const VirtualizedRow = ({
  index,
  style,
  items,
  onSelect,
  onHover,
}: RowComponentProps<VirtualizedRowProps>): React.ReactElement => {
  const emojis = items[index];

  return (
    <div style={style} className="rte-ep__row">
      {emojis.map((emoji, i) => (
        <button
          key={`${emoji.name}-${i}`}
          type="button"
          className="rte-ep__item"
          onClick={() => onSelect?.(emoji)}
          onMouseEnter={() => onHover?.(emoji)}
          onMouseLeave={() => onHover?.(null)}
        >
          {emoji.emoji}
        </button>
      ))}
    </div>
  );
};

const EmojiPicker = ({ emojis, onSelect }: EmojiPickerProps) => {
  const [query, setQuery] = useState("");
  const [hoveredEmoji, setHoveredEmoji] = useState<EmojiItem | null>(null);

  const filteredEmojis = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery) return emojis;

    return emojis.filter(
      (item) =>
        item.name.toLowerCase().includes(cleanQuery) ||
        item.tags.some((tag) => tag.toLowerCase().includes(cleanQuery))
    );
  }, [emojis, query]);

  const groups = useMemo(() => {
    const groupedByCategory: Record<string, EmojiItem[]> = {};

    filteredEmojis.forEach((emoji) => {
      const category = emoji.group as string;
      groupedByCategory[category] ??= [];
      groupedByCategory[category].push(emoji);
    });

    return Object.entries(groupedByCategory).map(([title, items]) => {
      const emojiRows: EmojiRow[] = [];
      for (let i = 0; i < items.length; i += EMOJIS_PER_ROW) {
        emojiRows.push(items.slice(i, i + EMOJIS_PER_ROW));
      }
      return { title, emojis: emojiRows };
    });
  }, [filteredEmojis]);

  const { rows, headers } = useMemo(() => {
    const rows: EmojiRow[] = [];
    const headers: EmojiGroupHeader[] = [];
    let currentOffset = 0;

    groups.forEach((group) => {
      rows.push([], ...group.emojis);

      const height = (group.emojis.length + 1) * EMOJI_ROW_HEIGHT;
      headers.push({
        title: group.title,
        offset: currentOffset,
        height,
      });
      currentOffset += height;
    });

    return { rows, headers };
  }, [groups]);

  const itemData = useMemo(
    () => ({ items: rows, onSelect, onHover: setHoveredEmoji }),
    [rows, onSelect]
  );

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const isEmpty = filteredEmojis.length === 0;

  return (
    <div className="rte-ep">
      <SearchInput
        autoFocus={false}
        placeholder="Search"
        className="rte-ep__search"
        value={query}
        onChange={handleSearch}
      />

      <div className="rte-ep__content">
        {isEmpty ? (
          <div className="rte-ep__empty">
            <p>No emojis found</p>
          </div>
        ) : (
          <List<VirtualizedRowProps>
            rowComponent={VirtualizedRow}
            rowCount={rows.length}
            rowHeight={EMOJI_ROW_HEIGHT}
            rowProps={itemData}
            overscanCount={5}
          >
            {headers.map((header) => (
              <div
                key={header.title}
                style={{
                  position: "absolute",
                  inset: 0,
                  top: header.offset,
                  height: header.height,
                  pointerEvents: "none",
                }}
              >
                <div className="rte-ep__title">{header.title}</div>
              </div>
            ))}
          </List>
        )}
      </div>

      <div className="rte-ep__preview">
        {hoveredEmoji ? (
          <>
            <span className="rte-ep__preview-emoji">{hoveredEmoji.emoji}</span>
            <span className="rte-ep__preview-text">{hoveredEmoji.name}</span>
          </>
        ) : (
          <span className="rte-ep__preview-text">Select an emoji...</span>
        )}
      </div>
    </div>
  );
};

export default EmojiPicker;
