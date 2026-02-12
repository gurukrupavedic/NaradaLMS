import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useToast } from '@narada/ui';
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
            return await apiRequest(`/content/chapters/${chapterId}/mappings`, {
                method: 'POST',
                body: JSON.stringify({
                    textSegmentId: mapping.textSegmentId,
                    audioFileId: mapping.audioFileId,
                    startTime: mapping.startTime,
                    endTime: mapping.endTime,
                }),
            });
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
            return await apiRequest(`/content/chapters/${chapterId}/mappings/audio/${audioFileId}/segment/${segmentId}`, {
                method: 'PATCH',
                body: JSON.stringify(updates),
            });
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
            return await apiRequest(`/content/chapters/${chapterId}/mappings/audio/${audioFileId}/segment/${segmentId}`, {
                method: 'DELETE',
            });
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
