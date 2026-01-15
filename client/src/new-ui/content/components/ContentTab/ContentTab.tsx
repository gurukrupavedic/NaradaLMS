import React from 'react';
import { TiptapEditor } from '@/components/ui/tiptap-editor';
import { useChapterEditor } from '../../context/ChapterEditorContext';
import { useContentEditor } from '../../hooks/useContentEditor';
import '@/components/ui/tiptap-editor/styles/index.scss';

export function ContentTab() {
    const { isPublished } = useChapterEditor();
    const {
        content,
        contentScript,
        setContentScript,
        updateContent,
        saveStatus,
    } = useContentEditor();

    // Get current content for the active script
    const currentContent = content[contentScript] || '';

    return (
        <div className="flex flex-col h-full">
            {/* Tiptap Editor with integrated script selector, HTML/text toggle, and auto-save status */}
            <div className="flex-1 overflow-hidden">
                <TiptapEditor
                    content={currentContent}
                    onChange={(value) => updateContent(contentScript, value as string)}
                    disabled={isPublished}
                    output="html"
                    language={contentScript}
                    currentScript={contentScript}
                    onScriptChange={setContentScript}
                    autoSaveStatus={saveStatus}
                    className="h-full"
                />
            </div>
        </div>
    );
}
