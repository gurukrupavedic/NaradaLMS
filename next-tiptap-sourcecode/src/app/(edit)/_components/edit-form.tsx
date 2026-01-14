"use client";

import { useCallback, useEffect, useRef } from "react";

import { useForm, Controller } from "react-hook-form";

import TiptapEditor, { type TiptapEditorRef } from "@/components/tiptap-editor";
import { loadInitialContent } from "@/components/tiptap-editor/helpers/tiptap";
import { usePost } from "@/hooks/use-post";
import { Post } from "@/services/post";

type PostForm = Pick<Post, "title" | "html" | "readingTime">;

export default function EditForm() {
  const editorRef = useRef<TiptapEditorRef>(null);
  const form = useForm<PostForm>({
    defaultValues: { title: "", html: "" },
  });

  const { debouncedSave, isLoading, post } = usePost();

  const calculateReadingTime = useCallback(() => {
    const editor = editorRef.current;
    const wordCount = editor?.storage.characterCount.words() ?? 0;
    return Math.max(1, Math.ceil(wordCount / 150));
  }, []);

  useEffect(() => {
    const editor = editorRef.current!;
    if (post) {
      loadInitialContent(editor, post.html);
      form.reset({ ...post });
    }
  }, [post]);

  useEffect(() => {
    const subscription = form.watch((values, { type }) => {
      if (type === "change") {
        const readingTime = calculateReadingTime();
        debouncedSave({ ...values, readingTime });
      }
    });
    return () => subscription.unsubscribe();
  }, [debouncedSave, calculateReadingTime]);

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <label className="inline-block font-medium dark:text-white mb-2">
          Title
        </label>
        <Controller
          control={form.control}
          name="title"
          render={({ field }) => (
            <input
              {...field}
              type="text"
              className="w-full px-4 py-2.5 shadow border border-[#d1d9e0] rounded-md bg-white dark:bg-[#0d1017] dark:text-white dark:border-[#3d444d] outline-none"
              placeholder="Enter post title..."
            />
          )}
        />
      </div>

      {/* Content */}
      <div>
        <label className="inline-block font-medium dark:text-white mb-2">
          Content
        </label>
        <Controller
          control={form.control}
          name="html"
          render={({ field }) => (
            <TiptapEditor
              ref={editorRef}
              output="html"
              minHeight={320}
              maxHeight={640}
              maxWidth={700}
              onChange={field.onChange}
              placeholder={{
                paragraph: "Type your content here...",
                imageCaption: "Type caption for image (optional)",
              }}
            />
          )}
        />
      </div>
    </div>
  );
}
