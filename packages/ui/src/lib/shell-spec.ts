/**
 * Shell and top bar sizing spec for Narada LMS.
 * Use these values for consistent header/toolbar heights across ops and student portals.
 * Aligns with responsive-shell-and-topbar-audit plan.
 *
 * Breakpoints (Tailwind): sm 640px, md 768px, lg 1024px
 */

/** Global top bar (AppShell primary header) heights in px */
export const SHELL_TOP_BAR_HEIGHT = {
  /** Desktop/laptop (≥1024px): compact, 56px */
  desktop: 56,
  /** Tablet (640–1023px): comfortable tap targets, 60–64px */
  tablet: 64,
  /** Phone (<640px): 64–72px, 44px+ touch targets */
  phone: 68,
} as const;

/** Inner headers / secondary toolbars (within-page bars) in px */
export const SHELL_INNER_HEADER_HEIGHT = {
  /** Desktop: 40–44px, dense toolbars */
  desktop: 44,
  /** Tablet/phone: 44–52px for touch-friendly controls */
  mobile: 48,
} as const;

/** Standard control sizes (Tailwind class reference) */
export const SHELL_CONTROL_SIZES = {
  /** Buttons in toolbars: h-9 desktop, h-10 mobile for 44px hit area */
  buttonHeightDesktop: "h-9",
  buttonHeightMobile: "h-10",
  /** Icon size in headers: 16–20px */
  iconSize: "size-4", // 16px; use size-5 for 20px where needed
  /** Label/text in headers */
  textSize: "text-sm", // 14px
  textSizeMuted: "text-xs",
} as const;

/** Tailwind classes for global top bar container (use with responsive variants) */
export const SHELL_TOP_BAR_CLASSES = {
  /** Base: 56px height, compact */
  desktop: "min-h-14 h-14 md:min-h-14 md:h-14",
  /** Tablet: slightly taller */
  tablet: "sm:min-h-[4rem] sm:h-[4rem]",
  /** Phone: 64–72px, safe for touch */
  phone: "min-h-[4.25rem] h-[4.25rem] sm:min-h-[4rem] sm:h-[4rem]",
} as const;

/** Tailwind classes for inner/secondary toolbar container */
export const SHELL_INNER_HEADER_CLASSES = {
  /** 40–44px on desktop */
  desktop: "min-h-11 h-11 py-2",
  /** 44–52px on mobile */
  mobile: "min-h-[2.75rem] sm:min-h-11 sm:h-11",
} as const;
