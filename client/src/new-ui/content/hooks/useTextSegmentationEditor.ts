import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/features/shared-features/hooks/use-toast';
import { useChapterEditor } from '@/new-ui/content/context/ChapterEditorContext';
import { useTextSegmentation } from '@/features/learning/hooks/useTextSegmentation';

interface TextSegment {
    id: number;
    chapterId: number;
    script: 'te' | 'hi' | 'en';
    startPosition: number;
    endPosition: number;
    order: number;
    createdAt: string;
    createdBy: string;
}

interface AudioMapping {
    id: number;
    textSegmentId: number;
    audioFileId: number;
    startTime: number;
    endTime: number;
}

export function useTextSegmentationEditor() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { chapter, chapterId, isPublished } = useChapterEditor();

    // Script selection state
    const [selectedScript, setSelectedScript] = useState<'te' | 'hi' | 'en'>('te');

    // Use base text segmentation hook
    const {
        currentSelection,
        hasSelection,
        handleTextSelection,
        renderSegmentedText,
        clearSelection,
    } = useTextSegmentation();

    // Query: Fetch text segments for current chapter
    const { data: textSegments = [], isLoading: isLoadingSegments } = useQuery<TextSegment[]>({
        queryKey: ['content', 'chapters', chapterId, 'segments'],
        queryFn: async () => {
            const response = await fetch(`/api/content/chapters/${chapterId}/segments`, {
                credentials: 'include',
            });
            if (!response.ok) throw new Error('Failed to fetch segments');
            return response.json();
        },
        enabled: !!chapterId,
    });

    // Query: Fetch audio mappings for current chapter
    const { data: allChapterMappings = [] } = useQuery<AudioMapping[]>({
        queryKey: ['content', 'chapters', chapterId, 'mappings'],
        queryFn: async () => {
            const response = await fetch(`/api/content/chapters/${chapterId}/mappings`, {
                credentials: 'include',
            });
            if (!response.ok) throw new Error('Failed to fetch mappings');
            return response.json();
        },
        enabled: !!chapterId,
    });

    // Filter segments by selected script
    const scriptSegments = useMemo(() => {
        return textSegments.filter(seg => seg.script === selectedScript);
    }, [textSegments, selectedScript]);

    // Overlap detection - allow adjacent, prevent actual overlaps
    const checkOverlap = useCallback((start: number, end: number) => {
        return scriptSegments.some(seg => {
            // Adjacent segments are OK (touching but not overlapping)
            const isAdjacent = end === seg.startPosition || start === seg.endPosition;
            if (isAdjacent) return false;

            // Check for actual overlap
            return start < seg.endPosition && end > seg.startPosition;
        });
    }, [scriptSegments]);

    // Mutation: Create segment
    const createSegmentMutation = useMutation({
        mutationFn: async () => {
            if (!currentSelection) {
                throw new Error('No text selected');
            }

            // Check for overlap
            if (checkOverlap(currentSelection.start, currentSelection.end)) {
                throw new Error('Segment overlaps with existing segment. Adjacent segments are allowed.');
            }

            const response = await fetch(`/api/content/chapters/${chapterId}/segments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    script: selectedScript,
                    startPosition: currentSelection.start,
                    endPosition: currentSelection.end,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create segment');
            }

            return response.json();
        },
        onSuccess: () => {
            toast({
                title: 'Segment created',
                description: `Position ${currentSelection?.start}-${currentSelection?.end}`,
            });
            queryClient.invalidateQueries({ queryKey: ['content', 'chapters', chapterId, 'segments'] });
            clearSelection();
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to create segment',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Mutation: Delete segment
    const deleteSegmentMutation = useMutation({
        mutationFn: async (segmentId: number) => {
            const response = await fetch(`/api/content/segments/${segmentId}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to delete segment');
            }

            return response.json();
        },
        onSuccess: () => {
            toast({
                title: 'Segment deleted',
            });
            queryClient.invalidateQueries({ queryKey: ['content', 'chapters', chapterId, 'segments'] });
            queryClient.invalidateQueries({ queryKey: ['content', 'chapters', chapterId, 'mappings'] });
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to delete segment',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Get mapping status for a segment
    const getMappingStatus = useCallback((segmentId: number): 'mapped' | 'unmapped' => {
        const hasMapping = allChapterMappings.some(mapping => mapping.textSegmentId === segmentId);
        return hasMapping ? 'mapped' : 'unmapped';
    }, [allChapterMappings]);

    // Create segment wrapper
    const createSegment = useCallback(() => {
        if (!hasSelection) {
            toast({
                title: 'No text selected',
                description: 'Please select text before creating a segment',
                variant: 'destructive',
            });
            return;
        }

        if (isPublished) {
            toast({
                title: 'Chapter is published',
                description: 'Unpublish the chapter to create segments',
                variant: 'destructive',
            });
            return;
        }

        createSegmentMutation.mutate();
    }, [hasSelection, isPublished, createSegmentMutation, toast]);

    // Delete segment wrapper
    const deleteSegment = useCallback((segmentId: number) => {
        if (isPublished) {
            toast({
                title: 'Chapter is published',
                description: 'Unpublish the chapter to delete segments',
                variant: 'destructive',
            });
            return;
        }

        deleteSegmentMutation.mutate(segmentId);
    }, [isPublished, deleteSegmentMutation, toast]);

    return {
        // Selection state (from base hook)
        currentSelection,
        hasSelection,
        handleTextSelection,
        clearSelection,
        renderSegmentedText,

        // Script management
        selectedScript,
        setSelectedScript,

        // Data
        textSegments,
        scriptSegments,
        allChapterMappings,
        isLoadingSegments,

        // CRUD operations
        createSegment,
        deleteSegment,
        isCreating: createSegmentMutation.isPending,
        isDeleting: deleteSegmentMutation.isPending,

        // Utilities
        getMappingStatus,
        checkOverlap,
    };
}
