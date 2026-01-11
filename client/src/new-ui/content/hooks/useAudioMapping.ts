import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/features/shared-features/hooks/use-toast';
import { useChapterEditor } from '../context/ChapterEditorContext';

interface CreateMappingInput {
    textSegmentId: number;
    audioFileId: number;
    startTime: number;
    endTime: number;
    silent?: boolean;
}

interface UpdateMappingInput {
    startTime?: number;
    endTime?: number;
}

export function useAudioMapping() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { chapterId, isPublished } = useChapterEditor();

    // Create mapping mutation
    const createMappingMutation = useMutation({
        mutationFn: async (mapping: CreateMappingInput) => {
            const response = await fetch(`/api/content/chapters/${chapterId}/mappings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    textSegmentId: mapping.textSegmentId,
                    audioFileId: mapping.audioFileId,
                    startTime: mapping.startTime,
                    endTime: mapping.endTime,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create mapping');
            }

            return response.json();
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['content', 'chapters', chapterId, 'mappings'] });
            if (!variables.silent) {
                toast({ title: 'Mapping created' });
            }
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to create mapping',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Update mapping mutation
    const updateMappingMutation = useMutation({
        mutationFn: async ({ audioFileId, segmentId, updates }: { audioFileId: number; segmentId: number; updates: UpdateMappingInput }) => {
            const response = await fetch(`/api/content/chapters/${chapterId}/mappings/audio/${audioFileId}/segment/${segmentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(updates),
            });

            if (!response.ok) {
                throw new Error('Failed to update mapping');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['content', 'chapters', chapterId, 'mappings'] });
            toast({ title: 'Mapping updated' });
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to update mapping',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Delete mapping mutation
    const deleteMappingMutation = useMutation({
        mutationFn: async ({ audioFileId, segmentId }: { audioFileId: number; segmentId: number }) => {
            const response = await fetch(`/api/content/chapters/${chapterId}/mappings/audio/${audioFileId}/segment/${segmentId}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to delete mapping');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['content', 'chapters', chapterId, 'mappings'] });
            toast({ title: 'Mapping deleted' });
        },
        onError: (error: Error) => {
            toast({
                title: 'Failed to delete mapping',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Wrapper functions with published check
    const createMapping = (mapping: CreateMappingInput) => {
        if (isPublished) {
            toast({
                title: 'Cannot modify published chapter',
                description: 'Unpublish the chapter first',
                variant: 'destructive',
            });
            return;
        }
        createMappingMutation.mutate(mapping);
    };

    const updateMapping = (audioFileId: number, segmentId: number, updates: UpdateMappingInput) => {
        if (isPublished) {
            toast({
                title: 'Cannot modify published chapter',
                description: 'Unpublish the chapter first',
                variant: 'destructive',
            });
            return;
        }
        updateMappingMutation.mutate({ audioFileId, segmentId, updates });
    };

    const deleteMapping = (audioFileId: number, segmentId: number) => {
        if (isPublished) {
            toast({
                title: 'Cannot modify published chapter',
                description: 'Unpublish the chapter first',
                variant: 'destructive',
            });
            return;
        }
        deleteMappingMutation.mutate({ audioFileId, segmentId });
    };

    return {
        createMapping,
        updateMapping,
        deleteMapping,
        isCreating: createMappingMutation.isPending,
        isUpdating: updateMappingMutation.isPending,
        isDeleting: deleteMappingMutation.isPending,
    };
}
