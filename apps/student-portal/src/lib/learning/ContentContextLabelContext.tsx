"use client";

import React, { createContext, useContext } from "react";

interface ContentContextLabelContextValue {
  setLabel: (label: string | null) => void;
}

export const ContentContextLabelContext =
  createContext<ContentContextLabelContextValue | undefined>(undefined);

export function useContentContextLabelSetter() {
  const ctx = useContext(ContentContextLabelContext);
  return ctx?.setLabel ?? (() => {});
}
