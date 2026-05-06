import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useToast } from '@narada/ui';
import { useChapterEditor } from '@/lib/content/context/ChapterEditorContext';
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

// Wire shape for chapter mappings (Bundle E: ms on the wire).
interface AudioMappingWire {
    mappingId: number;
    textSegmentId: number;
    mediaSegmentId: number;
    audioFileId: number;
    startMs: number;
    endMs: number;
    segmentName?: string | null;
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
        queryFn: () => apiRequest<TextSegment[]>(`/content/chapters/${chapterId}/segments`, { method: 'GET' }),
        enabled: !!chapterId,
    });

    // Query: Fetch audio mappings for current chapter.
    // Wire is ms (Bundle E); convert to seconds at this boundary so UI stays in seconds.
    const { data: allChapterMappings = [] } = useQuery<AudioMapping[]>({
        queryKey: ['content', 'chapters', chapterId, 'mappings'],
        queryFn: async () => {
            const wire = await apiRequest<AudioMappingWire[]>(`/content/chapters/${chapterId}/mappings`, { method: 'GET' });
            return wire.map((m) => ({
                id: m.mappingId,
                textSegmentId: m.textSegmentId,
                audioFileId: m.audioFileId,
                startTime: m.startMs / 1000,
                endTime: m.endMs / 1000,
            }));
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

            return await apiRequest(`/content/chapters/${chapterId}/segments`, {
                method: 'POST',
                body: JSON.stringify({
                    script: selectedScript,
                    startPosition: currentSelection.start,
                    endPosition: currentSelection.end,
                }),
            });
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
            return await apiRequest(`/content/segments/${segmentId}`, { method: 'DELETE' });
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

            return await apiRequest(`/content/chapters/${chapterId}/segments/reorder`, {
                method: 'POST',
                body: JSON.stringify({ segmentOrders }),
            });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['content', 'chapters', chapterId, 'segments'] });
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
            return await apiRequest(`/content/chapters/${chapterId}/segments/all/clear?script=${selectedScript}`, {
                method: 'DELETE',
            });
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
        apiRequest(`/content/chapters/${chapterId}/segments`, {
            method: 'POST',
            body: JSON.stringify(segmentData),
        })
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
