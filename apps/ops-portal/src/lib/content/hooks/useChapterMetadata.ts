import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@narada/ui';
import { apiRequest } from '@/lib/api';
import { useChapterEditor } from '../context/ChapterEditorContext';

export function useChapterMetadata() {
    const { chapterId, chapter, isPublished } = useChapterEditor();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);

    // Toggle publish/draft status
    const toggleStatusMutation = useMutation({
        mutationFn: async (newStatus: "draft" | "published") => {
            await apiRequest(`/content/chapters/${chapterId}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus }),
            });
        },
        onSuccess: () => {
            toast({ title: "Chapter status updated successfully" });
            queryClient.invalidateQueries({
                queryKey: ['content', 'chapters', chapterId, 'details'],
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

    // Handle publish/unpublish toggle
    const handlePublishToggle = () => {
        const newStatus = isPublished ? "draft" : "published";

        // If unpublishing, show confirmation dialog first
        if (isPublished) {
            setShowUnpublishConfirm(true);
        } else {
            // Publishing - proceed directly
            toggleStatusMutation.mutate(newStatus);
        }
    };

    // Confirm unpublish action
    const confirmUnpublish = () => {
        toggleStatusMutation.mutate("draft");
        setShowUnpublishConfirm(false);
    };

    // Cancel unpublish action
    const cancelUnpublish = () => {
        setShowUnpublishConfirm(false);
    };

    return {
        chapter,
        isPublished,
        showUnpublishConfirm,
        handlePublishToggle,
        confirmUnpublish,
        cancelUnpublish,
        isTogglingStatus: toggleStatusMutation.isPending,
    };
}
