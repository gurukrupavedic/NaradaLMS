import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/features/shared/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useChapterEditor } from '../context/ChapterEditorContext';

type Script = 'te' | 'hi' | 'en';
type SaveStatus = 'clean' | 'dirty' | 'saving' | 'saved';

export function useContentEditor() {
    const { chapterId, chapter } = useChapterEditor();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Local content state for all languages
    const [content, setContent] = useState<{
        te?: string;
        hi?: string;
        en?: string;
    }>({});

    // Active script
    const [contentScript, setContentScript] = useState<Script>('te');

    // Save status
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('clean');

    // Initialize content from context
    useEffect(() => {
        if (chapter?.content) {
            setContent({
                te: chapter.content.te || '',
                hi: chapter.content.hi || '',
                en: chapter.content.en || '',
            });
        }
    }, [chapter?.content]);

    // Content update mutation
    const updateContentMutation = useMutation({
        mutationFn: async (newContent: { te?: string; hi?: string; en?: string }) => {
            setSaveStatus('saving');
            await apiRequest('PATCH', `/api/content/chapters/${chapterId}`, {
                content: newContent,
            });
        },
        onSuccess: () => {
            setSaveStatus('saved');
            // toast({ title: 'Content saved' }); // Disabled to avoid spamming toast notifications

            // Auto-hide success status after 3 seconds
            setTimeout(() => {
                setSaveStatus('clean');
            }, 3000);

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({
                queryKey: ['content', 'chapters', chapterId, 'details'],
            });
        },
        onError: (error: any) => {
            setSaveStatus('clean');
            toast({
                title: 'Failed to save content',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Auto-save with 15-second debounce
    useEffect(() => {
        if (saveStatus !== 'dirty') return;

        const timeoutId = setTimeout(() => {
            updateContentMutation.mutate(content);
        }, 5000); // 5 seconds

        return () => clearTimeout(timeoutId);
    }, [saveStatus, content, updateContentMutation]);

    // Update content for a specific script
    const updateContent = (script: Script, value: string) => {
        setContent((prev) => ({
            ...prev,
            [script]: value,
        }));
        setSaveStatus('dirty');
    };

    return {
        content,
        contentScript,
        setContentScript,
        updateContent,
        saveStatus,
    };
}
