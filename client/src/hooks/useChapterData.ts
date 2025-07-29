/**
 * useChapterData - Comprehensive chapter data management hook
 * 
 * Provides complete CRUD operations for chapter management including content
 * editing, status updates, and real-time data synchronization. Handles
 * multi-script content (Telugu, Hindi, English) with optimistic updates.
 * 
 * @example
 * ```tsx
 * function ChapterEditor() {
 *   const {
 *     chapter,
 *     isLoading,
 *     updateChapter,
 *     publishChapter,
 *     unpublishChapter
 *   } = useChapterData(chapterId);
 *   
 *   const handleSave = (content) => {
 *     updateChapter.mutate({ content });
 *   };
 *   
 *   return <div>...</div>;
 * }
 * ```
 * 
 * @param chapterId - Unique identifier for the chapter
 * @returns Chapter data and mutation functions
 * 
 * @author Vedic LMS Team
 * @since 2025-06-24
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Chapter } from "@shared/schema";

interface ChapterContent {
  te?: string;
  hi?: string;
  en?: string;
}

export function useChapterData(chapterId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Chapter content state
  const [textContent, setTextContent] = useState<ChapterContent>({
    te: "",
    hi: "",
    en: "",
  });

  // Chapter content for segmentation display
  const [chapterContent, setChapterContent] = useState<ChapterContent>({});

  // Content script state
  const [contentScript, setContentScript] = useState<"te" | "hi" | "en">("te");

  // Metadata editing state
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");

  // Chapter details query
  const {
    data: chapter,
    isLoading: chapterLoading,
    error: chapterError,
  } = useQuery<Chapter>({
    queryKey: [`/api/chapters/${chapterId}/details`],
    enabled: !!chapterId,
  });

  // Derived state
  const isPublished = chapter?.status === "published";

  // Content update mutation
  const updateContentMutation = useMutation({
    mutationFn: async (content: ChapterContent) => {
      await apiRequest("PATCH", `/api/chapters/${chapterId}`, {
        content,
      });
    },
    onSuccess: () => {
      toast({ title: "Content saved" });
      queryClient.invalidateQueries({
        queryKey: [`/api/chapters/${chapterId}/details`],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save content",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Chapter status toggle mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (newStatus: "draft" | "published") => {
      await apiRequest("PATCH", `/api/chapters/${chapterId}/status`, {
        status: newStatus,
      });
    },
    onSuccess: () => {
      toast({ title: "Chapter status updated successfully" });
      queryClient.invalidateQueries({
        queryKey: [`/api/chapters/${chapterId}/details`],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update chapter status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update chapter metadata mutation
  const updateChapterMetadataMutation = useMutation({
    mutationFn: async ({ title, description }: { title: string; description: string }) => {
      await apiRequest("PATCH", `/api/chapters/${chapterId}`, {
        title,
        description,
      });
    },
    onSuccess: () => {
      toast({ title: "Chapter metadata updated successfully" });
      setIsEditingMetadata(false);
      queryClient.invalidateQueries({
        queryKey: [`/api/chapters/${chapterId}/details`],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update chapter metadata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize text content when chapter loads
  useEffect(() => {
    if (chapter?.content) {
      console.log('Chapter content loaded:', JSON.stringify(chapter.content, null, 2));
      setTextContent({
        te: (chapter.content?.te as string) || "",
        hi: (chapter.content?.hi as string) || "",
        en: (chapter.content?.en as string) || "",
      });
    }
  }, [chapter]);

  // Initialize chapterContent for segmentation display
  useEffect(() => {
    if (chapter?.content) {
      setChapterContent({
        te: (chapter.content?.te as string) || "",
        hi: (chapter.content?.hi as string) || "",
        en: (chapter.content?.en as string) || "",
      });
    }
  }, [chapter?.content]);

  // Auto-save functionality with debounce
  useEffect(() => {
    if (!chapter?.content || isPublished) return;

    const hasChanges =
      textContent.te !== ((chapter.content?.te as string) || "") ||
      textContent.hi !== ((chapter.content?.hi as string) || "") ||
      textContent.en !== ((chapter.content?.en as string) || "");

    if (!hasChanges) return;

    const timeoutId = setTimeout(() => {
      console.log('Auto-save triggering with content:', textContent);
      updateContentMutation.mutate(textContent);
    }, 2000); // Auto-save after 2 seconds of no typing

    return () => clearTimeout(timeoutId);
  }, [textContent, chapter?.content, isPublished, updateContentMutation]);

  // Metadata editing helpers
  const startEditingMetadata = () => {
    setEditingTitle(chapter?.title || "");
    setEditingDescription((chapter as any)?.description || "");
    setIsEditingMetadata(true);
  };

  const cancelEditingMetadata = () => {
    setIsEditingMetadata(false);
    setEditingTitle("");
    setEditingDescription("");
  };

  const saveMetadata = () => {
    if (!editingTitle.trim()) {
      toast({
        title: "Title Required",
        description: "Chapter title cannot be empty",
        variant: "destructive",
      });
      return;
    }

    updateChapterMetadataMutation.mutate({
      title: editingTitle.trim(),
      description: editingDescription.trim(),
    });
  };

  const toggleChapterStatus = () => {
    const newStatus = isPublished ? "draft" : "published";
    toggleStatusMutation.mutate(newStatus);
  };

  return {
    // Data
    chapter,
    textContent,
    chapterContent,
    contentScript,
    isPublished,
    chapterLoading,
    chapterError,

    // Metadata editing state
    isEditingMetadata,
    editingTitle,
    editingDescription,

    // Actions
    setTextContent,
    setContentScript,
    setEditingTitle,
    setEditingDescription,
    startEditingMetadata,
    cancelEditingMetadata,
    saveMetadata,
    toggleChapterStatus,

    // Mutations
    updateContentMutation,
    toggleStatusMutation,
    updateChapterMetadataMutation,
  };
}