import React from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRoleGuard } from '@/features/shared-features/hooks/useRoleGuard';
import { useToast } from '@/features/shared-features/hooks/use-toast';

export default function ChapterContentPage() {
    // 1. Role guard - only content managers can access this page
    useRoleGuard(['content_manager']);

    // 2. Get route parameters
    const params = useParams();
    const chapterId = params?.chapterId || '';
    const trackId = params?.trackId || '';

    // 3. Toast for notifications
    const { toast } = useToast();

    // 4. Fetch chapter data (placeholder query - will be moved to context in Phase 1)
    const { data: chapter, isLoading, error } = useQuery({
        queryKey: ['content', 'chapters', chapterId, 'details'],
        queryFn: async () => {
            const response = await fetch(`/api/content/chapters/${chapterId}/details`);
            if (!response.ok) throw new Error('Failed to fetch chapter');
            return response.json();
        },
        enabled: !!chapterId,
    });

    // 5. Loading state
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

    // 6. Error state
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

    // 7. Main render
    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header placeholder - will be replaced with ChapterHeader in Phase 1 */}
            <div className="bg-white dark:bg-gray-800 border-b px-4 py-3">
                <h1 className="text-xl font-semibold">
                    {chapter?.title || 'Chapter Content Editor'} - Phase 0
                </h1>
                <p className="text-sm text-muted-foreground">
                    Chapter ID: {chapterId} | Track ID: {trackId} | Status: {chapter?.status || 'Unknown'}
                </p>
            </div>

            {/* Tab structure skeleton */}
            <Tabs defaultValue="content" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="m-4">
                    <TabsTrigger value="content">Step 1: Content</TabsTrigger>
                    <TabsTrigger value="media">Step 2: Audio</TabsTrigger>
                    <TabsTrigger value="segmentation">Step 3: Segmentation</TabsTrigger>
                    <TabsTrigger value="mapping">Step 4: Mapping</TabsTrigger>
                    <TabsTrigger value="preview">Step 5: Preview</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="flex-1 m-4 overflow-auto">
                    <Card className="p-6">
                        <h3 className="font-medium mb-2">Content Tab</h3>
                        <p className="text-muted-foreground">Coming in Phase 2</p>
                        <p className="text-xs text-muted-foreground mt-2">
                            Will include: RichTextEditor, ScriptSwitcher, AutoSaveIndicator
                        </p>
                    </Card>
                </TabsContent>

                <TabsContent value="media" className="flex-1 m-4 overflow-auto">
                    <Card className="p-6">
                        <h3 className="font-medium mb-2">Media Tab</h3>
                        <p className="text-muted-foreground">Coming in Phase 3</p>
                        <p className="text-xs text-muted-foreground mt-2">
                            Will include: AudioUploader, AudioFileList
                        </p>
                    </Card>
                </TabsContent>

                <TabsContent value="segmentation" className="flex-1 m-4 overflow-auto">
                    <Card className="p-6">
                        <h3 className="font-medium mb-2">Segmentation Tab</h3>
                        <p className="text-muted-foreground">Coming in Phase 6</p>
                        <p className="text-xs text-muted-foreground mt-2">
                            ⚠️ Critical: TextSelectionPanel, SegmentCreator, SegmentList
                        </p>
                    </Card>
                </TabsContent>

                <TabsContent value="mapping" className="flex-1 m-4 overflow-auto">
                    <Card className="p-6">
                        <h3 className="font-medium mb-2">Mapping Tab</h3>
                        <p className="text-muted-foreground">Coming in Phase 7</p>
                        <p className="text-xs text-muted-foreground mt-2">
                            ⚠️ Critical: ProgressiveMapper, MappingControls, AudioPlayerPanel
                        </p>
                    </Card>
                </TabsContent>

                <TabsContent value="preview" className="flex-1 m-4 overflow-auto">
                    <Card className="p-6">
                        <h3 className="font-medium mb-2">Preview Tab</h3>
                        <p className="text-muted-foreground">Coming in Phase 4</p>
                        <p className="text-xs text-muted-foreground mt-2">
                            Will include: PreviewPlayer, SegmentedTextDisplay
                        </p>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
