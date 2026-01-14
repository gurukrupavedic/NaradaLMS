"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { useExport } from "@/hooks/use-export";
import { usePost } from "@/hooks/use-post";

import ActionBar from "./_components/action-bar";
import PostForm from "./_components/post-form";
import "./style.scss";

export default function EditPage() {
  const router = useRouter();
  const [editable, setEditable] = useState(true);
  const { debouncedSave, isLoading, post } = usePost();
  const { exportToDocx } = useExport();

  const handlePreview = () => {
    router.push("/post-csr");
  };

  const handleExport = async () => {
    if (!post) {
      alert("No content to export");
      return;
    }

    try {
      const filename = `${post.title || "document"}.docx`;
      await exportToDocx(post.json, filename);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="text-lg text-slate-600 dark:text-slate-300">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl w-full mx-auto py-10 px-6">
      <ActionBar
        onPreview={handlePreview}
        onExport={handleExport}
        editable={editable}
        onToggleEditable={setEditable}
      />
      <PostForm post={post} editable={editable} onSave={debouncedSave} />
    </div>
  );
}
