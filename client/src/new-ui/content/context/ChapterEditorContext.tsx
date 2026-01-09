import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

interface ChapterData {
    id: number;
    trackId: number;
    title: string;
    description?: string;
    status: "draft" | "published";
    content: {
        te?: string;
        hi?: string;
        en?: string;
    };
}

interface ChapterEditorContextValue {
    chapterId: string;
    trackId: string;
    chapter: ChapterData | null;
    isLoading: boolean;
    error: Error | null;
    isPublished: boolean;
    refetch: () => void;
}

const ChapterEditorContext = createContext<ChapterEditorContextValue | undefined>(undefined);

interface ChapterEditorProviderProps {
    children: ReactNode;
    chapterId: string;
    trackId: string;
}

export function ChapterEditorProvider({ children, chapterId, trackId }: ChapterEditorProviderProps) {
    // Fetch chapter data
    const { data: chapter, isLoading, error, refetch } = useQuery<ChapterData>({
        queryKey: ['content', 'chapters', chapterId, 'details'],
        queryFn: async () => {
            const response = await fetch(`/api/content/chapters/${chapterId}/details`);
            if (!response.ok) throw new Error('Failed to fetch chapter');
            return response.json();
        },
        enabled: !!chapterId,
    });

    const isPublished = chapter?.status === 'published';

    const value: ChapterEditorContextValue = {
        chapterId,
        trackId,
        chapter: chapter || null,
        isLoading,
        error: error as Error | null,
        isPublished,
        refetch,
    };

    return (
        <ChapterEditorContext.Provider value={value}>
            {children}
        </ChapterEditorContext.Provider>
    );
}

export function useChapterEditor() {
    const context = useContext(ChapterEditorContext);
    if (!context) {
        throw new Error('useChapterEditor must be used within ChapterEditorProvider');
    }
    return context;
}
