import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/features/shared/hooks/use-toast';
import { useChapterEditor } from '@/features/content/context/ChapterEditorContext';
import { useTextSegmentation } from './useTextSegmentation';

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

    // Segment selection state (for syncing between text and list)
    const [selectedSegmentId, setSelectedSegmentId] = useState<number | undefined>(undefined);

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
            const response = await apiRequest('GET', `/api/content/chapters/${chapterId}/segments`);
            return response.json();
        },
        enabled: !!chapterId,
    });

    // Query: Fetch audio mappings for current chapter
    const { data: allChapterMappings = [] } = useQuery<AudioMapping[]>({
        queryKey: ['content', 'chapters', chapterId, 'mappings'],
        queryFn: async () => {
            const response = await apiRequest('GET', `/api/content/chapters/${chapterId}/mappings`);
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

            const response = await apiRequest('POST', `/api/content/chapters/${chapterId}/segments`, {
                script: selectedScript,
                startPosition: currentSelection.start,
                endPosition: currentSelection.end,
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
            const response = await apiRequest('DELETE', `/api/content/segments/${segmentId}`);

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

    // Mutation: Reorder segments
    const reorderSegmentsMutation = useMutation({
        mutationFn: async (reorderedSegments: TextSegment[]) => {
            // Prepare payload with new order indices
            const segmentOrders = reorderedSegments.map((segment, index) => ({
                id: segment.id,
                order: index
            }));

            const response = await apiRequest('PATCH', `/api/content/segments/${chapterId}/reorder`, { segmentOrders });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to reorder segments');
            }

            return response.json();
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['content', 'chapters', chapterId, 'segments'] });
            // Also invalidate mappings as they depend on segment order implicitly for creation? No, but safer.
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to reorder segments',
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


    // Mutation: Delete all segments for script
    const clearAllSegmentsMutation = useMutation({
        mutationFn: async () => {
            const response = await apiRequest('DELETE', `/api/content/chapters/${chapterId}/segments/all/clear?script=${selectedScript}`);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to clear segments');
            }

            return response.json();
        },
        onSuccess: () => {
            toast({
                title: 'All segments cleared',
            });
            queryClient.invalidateQueries({ queryKey: ['content', 'chapters', chapterId, 'segments'] });
            queryClient.invalidateQueries({ queryKey: ['content', 'chapters', chapterId, 'mappings'] });
            setSelectedSegmentId(undefined); // Clear selection
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to clear segments',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Clear all segments wrapper
    const clearAllSegments = useCallback(() => {
        if (isPublished) {
            toast({
                title: 'Chapter is published',
                description: 'Unpublish the chapter to delete segments',
                variant: 'destructive',
            });
            return;
        }

        clearAllSegmentsMutation.mutate();
    }, [isPublished, clearAllSegmentsMutation, toast]);

    // Create segment from AnnotationLayer selection data
    const createSegmentFromSelection = useCallback((segmentData: { script: string; startPosition: number; endPosition: number }) => {
        if (isPublished) {
            toast({
                title: 'Chapter is published',
                description: 'Unpublish the chapter to create segments',
                variant: 'destructive',
            });
            return;
        }

        // Check for overlap
        if (checkOverlap(segmentData.startPosition, segmentData.endPosition)) {
            toast({
                title: 'Segment overlaps',
                description: 'This segment overlaps with an existing segment. Adjacent segments are allowed.',
                variant: 'destructive',
            });
            return;
        }

        // Create segment directly with provided data
        const createMutation = async () => {
            const response = await apiRequest('POST', `/api/content/chapters/${chapterId}/segments`, segmentData);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create segment');
            }

            return response.json();
        };

        createMutation()
            .then(() => {
                toast({
                    title: 'Segment created',
                    description: `Position ${segmentData.startPosition}-${segmentData.endPosition}`,
                });
                queryClient.invalidateQueries({ queryKey: ['content', 'chapters', chapterId, 'segments'] });
            })
            .catch((error: Error) => {
                toast({
                    title: 'Failed to create segment',
                    description: error.message,
                    variant: 'destructive',
                });
            });
    }, [isPublished, checkOverlap, chapterId, toast, queryClient]);

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

        // Selection sync
        selectedSegmentId,
        setSelectedSegmentId,

        // Data
        textSegments,
        scriptSegments,
        allChapterMappings,
        isLoadingSegments,

        // CRUD operations
        createSegment,
        createSegmentFromSelection,
        deleteSegment,
        isCreating: createSegmentMutation.isPending,
        isDeleting: deleteSegmentMutation.isPending,
        clearAllSegments,
        isClearing: clearAllSegmentsMutation.isPending,

        // Utilities
        getMappingStatus,
        checkOverlap,

        // Reordering
        reorderSegments: reorderSegmentsMutation.mutate,
        isReordering: reorderSegmentsMutation.isPending,
    };
}
