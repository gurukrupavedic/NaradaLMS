"use client";

import React from "react";

import postService, { Post } from "@/services/post";

type SaveStatus = "idle" | "saving" | "saved";

export function usePost() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>("idle");
  const [post, setPost] = React.useState<Post | null>(null);

  const savePost = React.useCallback(async (values: Partial<Post>) => {
    try {
      setSaveStatus("saving");
      await postService.save(values);
      setSaveStatus("saved");

      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Save failed:", error);
      setSaveStatus("idle");
    }
  }, []);

  const debouncedSave = React.useMemo(
    () => debounce(savePost, 2000),
    [savePost]
  );

  React.useEffect(() => {
    (async () => {
      const post = await postService.get();
      setPost(post);
      setIsLoading(false);
    })();
  }, []);

  return { savePost, debouncedSave, saveStatus, isLoading, post };
}

function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}
