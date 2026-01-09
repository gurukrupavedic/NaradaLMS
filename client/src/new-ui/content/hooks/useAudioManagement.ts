import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/features/shared-features/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface AudioFile {
    id: number;
    filename: string;
    displayName?: string;
    duration: number;
    url: string;
    fileSize?: number;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

function validateAudioFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds 100MB limit`,
        };
    }

    // Check file type
    const validTypes = /^(audio|video)\//;
    if (!validTypes.test(file.type)) {
        return { valid: false, error: 'Please select an audio or video file' };
    }

    return { valid: true };
}

export function useAudioManagement(chapterId: string) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDragOver, setIsDragOver] = useState(false);
    const [editingFileId, setEditingFileId] = useState<number | null>(null);
    const [editingFileName, setEditingFileName] = useState('');

    // Query audio files
    const { data: audioFiles = [] } = useQuery<AudioFile[]>({
        queryKey: [`/api/audio-files/${chapterId}`],
        enabled: !!chapterId,
    });

    // Upload mutation
    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            // Validate file
            const validation = validateAudioFile(file);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            const formData = new FormData();
            formData.append('audio', file);

            const response = await fetch(`/api/audio-files/${chapterId}/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Upload failed');
            }

            return response.json();
        },
        onSuccess: () => {
            toast({ title: 'Audio file uploaded successfully' });
            queryClient.invalidateQueries({ queryKey: [`/api/audio-files/${chapterId}`] });
        },
        onError: (error: any) => {
            toast({
                title: 'Failed to upload audio file',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (fileId: number) => {
            await apiRequest('DELETE', `/api/audio-files/${fileId}`);
            return fileId;
        },
        onSuccess: () => {
            toast({ title: 'Audio file deleted successfully' });
            queryClient.invalidateQueries({ queryKey: [`/api/audio-files/${chapterId}`] });
        },
        onError: (error: any) => {
            toast({
                title: 'Failed to delete audio file',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Update filename mutation
    const updateFileNameMutation = useMutation({
        mutationFn: async ({ fileId, newName }: { fileId: number; newName: string }) => {
            await apiRequest('PATCH', `/api/audio-files/${fileId}`, {
                displayName: newName,
            });
        },
        onSuccess: () => {
            toast({ title: 'Filename updated successfully' });
            queryClient.invalidateQueries({ queryKey: [`/api/audio-files/${chapterId}`] });
            setEditingFileId(null);
            setEditingFileName('');
        },
        onError: (error: any) => {
            toast({
                title: 'Failed to update filename',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    return {
        audioFiles,
        isDragOver,
        setIsDragOver,
        uploadFile: uploadMutation.mutate,
        isUploading: uploadMutation.isPending,
        deleteFile: deleteMutation.mutate,
        isDeleting: deleteMutation.isPending,
        editingFileId,
        editingFileName,
        setEditingFileName,
        startEditing: (fileId: number, currentName: string) => {
            setEditingFileId(fileId);
            setEditingFileName(currentName);
        },
        cancelEditing: () => {
            setEditingFileId(null);
            setEditingFileName('');
        },
        saveFileName: (fileId: number) => {
            updateFileNameMutation.mutate({ fileId, newName: editingFileName });
        },
        isSaving: updateFileNameMutation.isPending,
    };
}
