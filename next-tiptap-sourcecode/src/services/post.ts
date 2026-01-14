import { type JSONContent } from "@tiptap/react";

import { mockData } from "@/mock";

export type Post = {
  title: string;
  html: string;
  json: JSONContent;
  cover: string;
  author: string;
  readingTime: number;
  createdAt: string;
};

const getPost = (): Promise<Post> => {
  return new Promise<Post>((resolve, reject) => {
    setTimeout(() => {
      if (typeof window !== "undefined") {
        try {
          const data = localStorage.getItem("post");
          const parsed: Post = data ? JSON.parse(data) : mockData;

          if (!data) {
            savePost(mockData);
          }

          return resolve(parsed);
        } catch {
          return reject();
        }
      }

      return resolve(mockData);
    }, 200);
  });
};

const savePost = (data: Partial<Post>): void => {
  if (typeof window === "undefined") return;

  try {
    const value: Post = { ...mockData, ...data };
    localStorage.setItem("post", JSON.stringify(value));
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
};

const postService = {
  get: getPost,
  save: savePost,
};

export default postService;
