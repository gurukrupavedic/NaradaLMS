import React from 'react';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useChapterEditor } from '../../context/ChapterEditorContext';
import { useContentEditor } from '../../hooks/useContentEditor';

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
            {/* Rich Text Editor with integrated ScriptSelector dropdown and bottom toolbar auto-save */}
            <div className="flex-1 overflow-hidden">
                <RichTextEditor
                    value={currentContent}
                    onChange={(value) => updateContent(contentScript, value)}
                    disabled={isPublished}
                    language={contentScript}
                    currentScript={contentScript}
                    onScriptChange={setContentScript}
                    availableScripts={['te', 'hi', 'en']}
                    autoSaveStatus={saveStatus}
                    className="h-full"
                />
            </div>
        </div>
    );
}
