"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "../lib/utils";

type TaglineScript = "te" | "hi" | "en";

interface AuthTaglineEntry {
  readonly script: TaglineScript;
  readonly before: string;
  readonly after: string;
  readonly ariaLabel: string;
}

/** Matches {@link getFontClass} in the text editor. */
const AUTH_TAGLINE_FONT_CLASS: Record<TaglineScript, string> = {
  te: "font-['JIMS','Noto_Sans_Telugu',sans-serif]",
  hi: "font-['AdishilaSanVedic','Noto_Sans_Devanagari',sans-serif] font-semibold",
  en: "font-['AdishilaSan','Noto_Sans',sans-serif]",
};

export const AUTH_TAGLINE_ENTRIES: readonly AuthTaglineEntry[] = [
  {
    script: "te",
    before: "వైదిక ప్రజ్ఞ",
    after: "ఆధునిక శిక్ష",
    ariaLabel: "వైదిక ప్రజ్ఞ ఆధునిక శిక్ష",
  },
  {
    script: "hi",
    before: "वैदिक प्रज्ञा",
    after: "आधुनिक शिक्षा",
    ariaLabel: "वैदिक प्रज्ञा आधुनिक शिक्षा",
  },
  {
    script: "en",
    before: "vaidika prajñā",
    after: "ādhunika śikṣā",
    ariaLabel: "vaidika prajñā ādhunika śikṣā",
  },
] as const;

/** @deprecated Use {@link AUTH_TAGLINE_ENTRIES} */
export const AUTH_ROTATING_TAGLINES = AUTH_TAGLINE_ENTRIES.map(
  (entry) => `${entry.before} ${entry.after}`
);

const HOLD_MS = 1800;
const LETTER_FADE_MS = 1700;
const STAGGER_MS = 72;

export interface AuthRotatingTaglineProps {
  className?: string;
}

function splitGraphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), (segment) => segment.segment);
  }
  return [...text];
}

interface TaglineAnimationUnits {
  beforeGraphemes: string[];
  afterGraphemes: string[];
  centerIndex: number;
  total: number;
}

function getTaglineAnimationUnits(entry: AuthTaglineEntry): TaglineAnimationUnits {
  const beforeGraphemes = splitGraphemes(entry.before);
  const afterGraphemes = splitGraphemes(entry.after);
  const centerIndex = beforeGraphemes.length;

  return {
    beforeGraphemes,
    afterGraphemes,
    centerIndex,
    total: centerIndex + 1 + afterGraphemes.length,
  };
}

function getMaxDistanceFromCenter(total: number, centerIndex: number): number {
  return Math.max(centerIndex, total - 1 - centerIndex);
}

function getCenterStaggerDuration(total: number, centerIndex: number): number {
  const maxDistance = getMaxDistanceFromCenter(total, centerIndex);
  if (maxDistance === 0) {
    return LETTER_FADE_MS;
  }
  return maxDistance * STAGGER_MS + LETTER_FADE_MS;
}

function getCenterStaggerDelay(
  charIndex: number,
  centerIndex: number,
  total: number,
  revealed: boolean
): string {
  const maxDistance = getMaxDistanceFromCenter(total, centerIndex);
  const distance = Math.abs(charIndex - centerIndex);
  const delay = revealed
    ? distance * STAGGER_MS
    : (maxDistance - distance) * STAGGER_MS;
  return `${delay}ms`;
}

function getTransformOrigin(charIndex: number, centerIndex: number): string {
  if (charIndex === centerIndex) {
    return "center center";
  }
  if (charIndex < centerIndex) {
    return "right center";
  }
  return "left center";
}

function getCenterTransform(
  charIndex: number,
  centerIndex: number,
  revealed: boolean
): string {
  if (revealed) {
    return "translateX(0) scale(1)";
  }

  const offset = charIndex - centerIndex;
  if (offset === 0) {
    return "scale(0.7)";
  }

  const towardCenterEm = 0.45;
  const translateX = offset < 0 ? towardCenterEm : -towardCenterEm;
  return `translateX(${translateX}em) scale(0.8)`;
}

function getGraphemeMotionStyle(
  charIndex: number,
  centerIndex: number,
  total: number,
  revealed: boolean
) {
  return {
    opacity: revealed ? 1 : 0,
    transform: getCenterTransform(charIndex, centerIndex, revealed),
    transformOrigin: getTransformOrigin(charIndex, centerIndex),
    transitionDuration: `${LETTER_FADE_MS}ms`,
    transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
    transitionDelay: getCenterStaggerDelay(
      charIndex,
      centerIndex,
      total,
      revealed
    ),
  } as const;
}

function TaglineSeparatorIcon() {
  return (
    <span
      aria-hidden
      className="block size-2.5 shrink-0 rounded-full bg-[oklch(var(--vidruma-warn))]"
    />
  );
}

interface TaglineLetterProps {
  grapheme: string;
  charIndex: number;
  centerIndex: number;
  total: number;
  revealed: boolean;
}

function TaglineLetter({
  grapheme,
  charIndex,
  centerIndex,
  total,
  revealed,
}: TaglineLetterProps) {
  return (
    <span
      aria-hidden
      className="inline-block transition-[opacity,transform] ease-in-out"
      style={getGraphemeMotionStyle(charIndex, centerIndex, total, revealed)}
    >
      {grapheme === " " ? "\u00A0" : grapheme}
    </span>
  );
}

export function AuthRotatingTagline({ className }: AuthRotatingTaglineProps) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const indexRef = useRef(index);
  indexRef.current = index;

  const entry = AUTH_TAGLINE_ENTRIES[index];
  const fontClass = AUTH_TAGLINE_FONT_CLASS[entry.script];
  const { beforeGraphemes, afterGraphemes, centerIndex, total } =
    getTaglineAnimationUnits(entry);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const scheduleCycle = (currentIndex: number) => {
      if (cancelled) {
        return;
      }

      const currentEntry = AUTH_TAGLINE_ENTRIES[currentIndex];
      const { centerIndex: currentCenter, total: currentTotal } =
        getTaglineAnimationUnits(currentEntry);
      const exitMs = getCenterStaggerDuration(currentTotal, currentCenter);

      timeoutId = setTimeout(() => {
        if (cancelled) {
          return;
        }
        setRevealed(false);

        timeoutId = setTimeout(() => {
          if (cancelled) {
            return;
          }
          const nextIndex = (currentIndex + 1) % AUTH_TAGLINE_ENTRIES.length;
          setIndex(nextIndex);
          setRevealed(false);

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (cancelled) {
                return;
              }
              setRevealed(true);
              const nextEntry = AUTH_TAGLINE_ENTRIES[nextIndex];
              const { centerIndex: nextCenter, total: nextTotal } =
                getTaglineAnimationUnits(nextEntry);
              const enterMs = getCenterStaggerDuration(nextTotal, nextCenter);
              timeoutId = setTimeout(() => {
                if (!cancelled) {
                  scheduleCycle(nextIndex);
                }
              }, HOLD_MS + enterMs);
            });
          });
        }, exitMs);
      }, HOLD_MS);
    };

    scheduleCycle(indexRef.current);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [prefersReducedMotion]);

  const renderGrapheme = (grapheme: string, charIndex: number) => (
    <TaglineLetter
      key={`${index}-${charIndex}`}
      grapheme={grapheme}
      charIndex={charIndex}
      centerIndex={centerIndex}
      total={total}
      revealed={revealed}
    />
  );

  const renderSeparator = () => (
    <span
      key={`${index}-separator`}
      aria-hidden
      className="flex items-center justify-center transition-[opacity,transform] ease-in-out"
      style={getGraphemeMotionStyle(centerIndex, centerIndex, total, revealed)}
    >
      <TaglineSeparatorIcon />
    </span>
  );

  return (
    <div
      className={cn("w-96 max-w-full min-h-[4rem]", className)}
      aria-live="polite"
    >
      <h2
        className={cn(
          "text-4xl leading-none tracking-wide text-[oklch(var(--hema-base))]",
          fontClass
        )}
        aria-label={entry.ariaLabel}
      >
        {prefersReducedMotion ? (
          <span className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-x-2">
            <span className="text-right">{entry.before}</span>
            <span className="flex items-center justify-center">
              <TaglineSeparatorIcon />
            </span>
            <span className="text-left">{entry.after}</span>
          </span>
        ) : (
          <span className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-x-2">
            <span className="flex min-w-0 items-center justify-end text-right">
              {beforeGraphemes.map((grapheme, charIndex) =>
                renderGrapheme(grapheme, charIndex)
              )}
            </span>
            <span className="flex h-full min-h-[1em] items-center justify-center px-0.5">
              {renderSeparator()}
            </span>
            <span className="flex min-w-0 items-center justify-start text-left">
              {afterGraphemes.map((grapheme, charIndex) =>
                renderGrapheme(grapheme, centerIndex + 1 + charIndex)
              )}
            </span>
          </span>
        )}
      </h2>
    </div>
  );
}
