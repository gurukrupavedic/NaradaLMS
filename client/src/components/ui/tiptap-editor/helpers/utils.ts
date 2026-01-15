import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCssValue(
  value?: string | number,
  unit?: string
): string | null {
  if (value === undefined) return null;

  if (typeof value === "number") {
    return unit ? `${value}${unit}` : String(value);
  }

  return value;
}

export const cssVar = (
  name: string,
  value: string | number | undefined,
  unit?: string
) => {
  document.documentElement.style.setProperty(name, formatCssValue(value, unit));
};

export const getShortcutKey = (key: string) => {
  const isMacOS = /macintosh|mac os x/gi.test(navigator.userAgent);

  if (key === "Mod") {
    return isMacOS ? "⌘" : "Ctrl";
  }

  if (key === "Shift") {
    return isMacOS ? "⇧" : key;
  }

  if (key === "Alt") {
    return isMacOS ? "⌥" : key;
  }

  return key;
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      fn(...args);
    }, wait);
  };

  debounced.cancel = () => {
    if (timeout) clearTimeout(timeout);
  };

  return debounced;
}

export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastExecTime = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastExecTime > wait) {
      fn(...args);
      lastExecTime = now;
    } else {
      if (timeout) clearTimeout(timeout);

      timeout = setTimeout(
        () => {
          fn(...args);
          lastExecTime = Date.now();
          timeout = null;
        },
        wait - (now - lastExecTime)
      );
    }
  };
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
