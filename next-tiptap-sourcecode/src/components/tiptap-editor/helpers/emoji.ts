import { getStorage, setStorage } from "./storage";

const EMOJI_BASE_URL = "https://cdn.jsdelivr.net/npm/emojibase-data";
const EMOJI_DEFAULT_VERSION = "latest";
const EMOJI_DEFAULT_LOCALE = "en";
const EMOJI_CACHE_KEY = "emojis";

export type EmojiItem = {
  name: string;
  emoji: string;
  tags: string[];
  group?: string;
  version?: number;
};

type EmojiCache = {
  data: EmojiItem[];
  version: string;
  locale: string;
};

export async function getEmojiData(
  version: string = EMOJI_DEFAULT_VERSION,
  locale: string = EMOJI_DEFAULT_LOCALE
): Promise<EmojiItem[]> {
  const cached = getStorage<EmojiCache>(localStorage, EMOJI_CACHE_KEY);

  if (cached) {
    return cached.data;
  }

  return fetchEmojiData(version, locale);
}

async function fetchEmojiData(
  version: string,
  locale: string
): Promise<EmojiItem[]> {
  const baseUrl = `${EMOJI_BASE_URL}@${version}/${locale}`;

  try {
    const [data, messages] = await Promise.all([
      fetch(`${baseUrl}/data.json`).then((res) => res.json()),
      fetch(`${baseUrl}/messages.json`).then((res) => res.json()),
    ]);

    const groupMap = new Map(
      messages.groups.map((g: any) => [g.order, g.message])
    );

    const emojiData: EmojiItem[] = data
      .filter(({ label, group }: any) => {
        return !(
          group === 2 ||
          label.startsWith("regional") ||
          label.startsWith("flag:")
        );
      })
      .map((emoji: any) => ({
        name: emoji.label.charAt(0).toUpperCase() + emoji.label.slice(1),
        emoji: emoji.emoji,
        tags: emoji.tags || [],
        group: groupMap.get(emoji.group),
        version: emoji.version,
      }));

    setStorage<EmojiCache>(localStorage, EMOJI_CACHE_KEY, {
      data: emojiData,
      version,
      locale,
    });

    return emojiData;
  } catch (error) {
    console.error("Error fetching emoji resources:", error);
    return [];
  }
}
