import { useState, useEffect, useCallback } from "react";

import { clamp } from "../helpers/utils";

export interface ResizeParams {
  side: "left" | "right";
  initialWidth: number;
  initialClientX: number;
}

export interface Rect {
  width: number;
  height: number;
  left: number;
  top: number;
}

export function useResizable(
  element: HTMLElement | null,
  options: {
    minWidth?: number;
    maxWidth?: number;
    keepRatio?: boolean;
    onResize?: (width: number, height: number) => void;
    onResizeStart?: () => void;
    onResizeEnd?: (width: number) => void;
  } = {}
) {
  const {
    minWidth = 96,
    maxWidth = 800,
    keepRatio = true,
    onResize,
    onResizeStart,
    onResizeEnd,
  } = options;

  const [rect, setRect] = useState<Rect | null>(null);
  const [resizeParams, setResizeParams] = useState<ResizeParams | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    if (!element) {
      setRect(null);
      return;
    }

    const newRect = {
      width: element.clientWidth,
      height: element.clientHeight,
      left: element.offsetLeft,
      top: element.offsetTop,
    };
    setRect(newRect);

    if (keepRatio) {
      setAspectRatio(newRect.width / newRect.height);
    }
  }, [element, keepRatio]);

  const startResize = useCallback(
    (side: ResizeParams["side"], clientX: number) => {
      if (!rect) return;

      setResizeParams({
        side,
        initialWidth: rect.width,
        initialClientX: clientX,
      });

      onResizeStart?.();
    },
    [element, rect, onResizeStart]
  );

  const stopResize = useCallback(() => {
    if (!resizeParams || !rect) return;

    if (onResizeEnd) {
      onResizeEnd(Math.round((rect.width / maxWidth) * 100));
    }

    setResizeParams(null);
  }, [resizeParams, rect, maxWidth, onResizeEnd]);

  const resize = useCallback(
    (clientX: number) => {
      if (!resizeParams || !element || !rect) return;

      const deltaX =
        resizeParams.side === "left"
          ? resizeParams.initialClientX - clientX
          : clientX - resizeParams.initialClientX;

      let newWidth = resizeParams.initialWidth + deltaX;
      newWidth = clamp(newWidth, minWidth, maxWidth);

      let newHeight: number;
      if (aspectRatio) {
        newHeight = newWidth / aspectRatio;
      } else {
        newHeight = rect.height;
      }

      // Update element styles immediately
      element.style.width = `${newWidth}px`;
      element.style.height = `${newHeight}px`;

      // Update rect state immediately for visual feedback
      const updatedRect = {
        left: element.offsetLeft,
        top: element.offsetTop,
        width: newWidth,
        height: newHeight,
      };
      setRect(updatedRect);

      onResize?.(newWidth, newHeight);
    },
    [element, rect, resizeParams, minWidth, maxWidth, aspectRatio]
  );

  // Mouse event handling
  useEffect(() => {
    if (!resizeParams) return;

    const onMove = (e: MouseEvent) => {
      e.preventDefault();
      resize(e.clientX);
    };

    const onUp = (e: MouseEvent) => {
      e.preventDefault();
      stopResize();
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [resizeParams, resize, stopResize]);

  return { startResize, rect };
}
