import React, { useState } from 'react';
import { useParams } from 'wouter';
import { Tabs, TabsContent } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRoleGuard } from '@/features/shared/hooks/useRoleGuard';
import { ChapterEditorProvider, useChapterEditor } from '@/features/content/context/ChapterEditorContext';
import { AudioPlayerProvider } from '@/features/content/context/AudioPlayerContext';
import { ChapterHeader } from '@/features/content/components/ChapterHeader';
import { TextSegmentationTab } from '@/features/content/components/TextSegmentationTab/TextSegmentationTab';
import { PreviewTab } from '@/features/content/components/PreviewTab';
import { MappingTab } from '@/features/content/components/MappingTab';


// Wrapper component - handles route parameters and context setup
export default function ChapterContentPage() {
    // Role guard - only content managers can access this page
    useRoleGuard(['content_manager']);

    // Get route parameters
    const params = useParams();
    const chapterId = params?.chapterId || '';
    const trackId = params?.trackId || '';

    return (
        <ChapterEditorProvider chapterId={chapterId} trackId={trackId}>
            <ChapterContentPageContent />
        </ChapterEditorProvider>
    );
}

// Content component - uses context for data
function ChapterContentPageContent() {
    const { isLoading, error, isPublished } = useChapterEditor();
    const [activeTab, setActiveTab] = useState('text-segmentation');
    const [textSegMode, setTextSegMode] = useState<'editor' | 'segmentation'>('editor');

    // Loading state
    if (isLoading) {
        return (
            <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
                <div className="bg-white dark:bg-gray-800 border-b px-4 py-3">
                    <Skeleton className="h-8 w-64 mb-2" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <div className="flex-1 p-4">
                    <Skeleton className="h-full w-full" />
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
                <div className="bg-white dark:bg-gray-800 border-b px-4 py-3">
                    <h1 className="text-xl font-semibold">Chapter Content Editor</h1>
                </div>
                <div className="flex-1 p-4 flex items-center justify-center">
                    <Alert variant="destructive" className="max-w-md">
                        <AlertDescription>
                            Failed to load chapter. Please try refreshing the page.
                        </AlertDescription>
                    </Alert>
                </div>
            </div>
        );
    }

    // Main render
    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className={`flex flex-col bg-gray-50 dark:bg-gray-900 h-[calc(100dvh-4rem)] ${isPublished ? 'cursor-not-allowed' : ''}`}>
            {/* Phase 1: ChapterHeader with integrated tabs / actions */}
            <ChapterHeader
                activeTab={activeTab}
                textSegMode={textSegMode}
                onTextSegModeChange={setTextSegMode}
            />

            {/* Tab content area - overflow-hidden to force internal scrolling in editor */}
            <div className={`flex-1 overflow-hidden min-h-0 flex flex-col ${isPublished ? 'pointer-events-none' : ''}`}>
                {/* Re-enable pointer events for scrolling containers inside tabs */}
                <div className={`h-full flex flex-col ${isPublished ? 'pointer-events-auto' : ''}`}>
                    <AudioPlayerProvider>
                        <TabsContent value="text-segmentation" className="flex-1 overflow-hidden h-full data-[state=active]:flex flex-col m-0 p-4">
                            <TextSegmentationTab mode={textSegMode} />
                        </TabsContent>

                        <TabsContent value="mapping" className="flex-1 overflow-hidden h-full data-[state=active]:flex flex-col m-0 p-4">
                            <MappingTab />
                        </TabsContent>

                        <TabsContent value="preview" className="flex-1 overflow-auto h-full m-0 p-4">
                            <PreviewTab />
                        </TabsContent>
                    </AudioPlayerProvider>
                </div>
            </div>
        </Tabs >
    );
}
