import React, { useState } from 'react';
import { useParams } from 'wouter';
import { Tabs, TabsContent } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRoleGuard } from '@/features/shared-features/hooks/useRoleGuard';
import { ChapterEditorProvider, useChapterEditor } from '@/new-ui/content/context/ChapterEditorContext';
import { ChapterHeader } from '@/new-ui/content/components/ChapterHeader';


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
    const { isLoading, error } = useChapterEditor();
    const [activeTab, setActiveTab] = useState('content');

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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
            {/* Phase 1: ChapterHeader with integrated tabs */}
            <ChapterHeader />

            {/* Tab content area */}
            <div className="flex-1 overflow-hidden">
                <TabsContent value="content" className="flex-1 m-4 overflow-auto h-full">
                    <Card className="p-6">
                        <h3 className="font-medium mb-2">Content Tab</h3>
                        <p className="text-muted-foreground">Coming in Phase 2</p>
                        <p className="text-xs text-muted-foreground mt-2">
                            Will include: RichTextEditor, ScriptSwitcher, AutoSaveIndicator
                        </p>
                    </Card>
                </TabsContent>

                <TabsContent value="media" className="flex-1 m-4 overflow-auto h-full">
                    <Card className="p-6">
                        <h3 className="font-medium mb-2">Media Tab</h3>
                        <p className="text-muted-foreground">Coming in Phase 3</p>
                        <p className="text-xs text-muted-foreground mt-2">
                            Will include: AudioUploader, AudioFileList
                        </p>
                    </Card>
                </TabsContent>

                <TabsContent value="segmentation" className="flex-1 m-4 overflow-auto h-full">
                    <Card className="p-6">
                        <h3 className="font-medium mb-2">Segmentation Tab</h3>
                        <p className="text-muted-foreground">Coming in Phase 6</p>
                        <p className="text-xs text-muted-foreground mt-2">
                            ⚠️ Critical: TextSelectionPanel, SegmentCreator, SegmentList
                        </p>
                    </Card>
                </TabsContent>

                <TabsContent value="mapping" className="flex-1 m-4 overflow-auto h-full">
                    <Card className="p-6">
                        <h3 className="font-medium mb-2">Mapping Tab</h3>
                        <p className="text-muted-foreground">Coming in Phase 7</p>
                        <p className="text-xs text-muted-foreground mt-2">
                            ⚠️ Critical: ProgressiveMapper, MappingControls, AudioPlayerPanel
                        </p>
                    </Card>
                </TabsContent>

                <TabsContent value="preview" className="flex-1 m-4 overflow-auto h-full">
                    <Card className="p-6">
                        <h3 className="font-medium mb-2">Preview Tab</h3>
                        <p className="text-muted-foreground">Coming in Phase 4</p>
                        <p className="text-xs text-muted-foreground mt-2">
                            Will include: PreviewPlayer, SegmentedTextDisplay
                        </p>
                    </Card>
                </TabsContent>
            </div>
        </Tabs>
    );
}
