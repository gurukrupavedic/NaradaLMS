import React from 'react';
import { useChapterEditor } from '../../context/ChapterEditorContext';
import { useAudioManagement } from '../../hooks/useAudioManagement';
import { AudioUploader } from './AudioUploader';
import { AudioFileList } from './AudioFileList';

export function MediaTab() {
    const { chapterId, isPublished } = useChapterEditor();
    const audioManagement = useAudioManagement(chapterId);

    return (
        <div className="w-full space-y-4">
            <AudioUploader
                onUpload={audioManagement.uploadFile}
                isUploading={audioManagement.isUploading}
                isDragOver={audioManagement.isDragOver}
                setIsDragOver={audioManagement.setIsDragOver}
                disabled={isPublished}
            />

            <AudioFileList
                files={audioManagement.audioFiles}
                editingFileId={audioManagement.editingFileId}
                editingFileName={audioManagement.editingFileName}
                onStartEditing={audioManagement.startEditing}
                onCancelEditing={audioManagement.cancelEditing}
                onSaveFileName={audioManagement.saveFileName}
                onDeleteFile={audioManagement.deleteFile}
                onFileNameChange={audioManagement.setEditingFileName}
                isSaving={audioManagement.isSaving}
                disabled={isPublished}
            />
        </div>
    );
}
