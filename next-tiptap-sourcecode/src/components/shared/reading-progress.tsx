"use client";

import React from "react";

import useProgress from "@/hooks/use-progress";

const PostReadingProgress = () => {
  const { progress, enable } = useProgress(".article-content");

  return enable ? (
    <div
      className="fixed inset-x-0 h-1 top-16 bg-blue-600 dark:bg-blue-500 z-50"
      style={{ width: `${progress}%` }}
    />
  ) : null;
};

export default PostReadingProgress;
