import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TabsList, TabsTrigger } from '@/components/ui/Tabs';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import { useChapterEditor } from '../../context/ChapterEditorContext';
import { useChapterMetadata } from '../../hooks/useChapterMetadata';

export function ChapterHeader() {
    const { chapter, isLoading } = useChapterEditor();
    const {
        isPublished,
        showUnpublishConfirm,
        handlePublishToggle,
        confirmUnpublish,
        cancelUnpublish,
        isTogglingStatus,
    } = useChapterMetadata();

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 border-b">
                <div className="px-4 py-3">
                    <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                    <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
                {/* Chapter metadata row */}
                <div className="px-4 py-3 border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <h1 className="text-xl font-semibold mb-1">
                                {chapter?.title || 'Chapter Content Editor'}
                            </h1>
                            {chapter?.description && (
                                <p className="text-sm text-muted-foreground">
                                    {chapter.description}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge variant={isPublished ? 'default' : 'secondary'}>
                                {isPublished ? 'Published' : 'Draft'}
                            </Badge>
                            <Button
                                variant={isPublished ? 'outline' : 'default'}
                                onClick={handlePublishToggle}
                                disabled={isTogglingStatus}
                            >
                                {isPublished ? 'Unpublish' : 'Publish'}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* 5-step tabs integrated into header */}
                <div className="px-4">
                    <TabsList className="w-full justify-start">
                        <TabsTrigger value="content">Step 1: Content</TabsTrigger>
                        <TabsTrigger value="media">Step 2: Audio</TabsTrigger>
                        <TabsTrigger value="segmentation">Step 3: Segmentation</TabsTrigger>
                        <TabsTrigger value="mapping">Step 4: Mapping</TabsTrigger>
                        <TabsTrigger value="preview">Step 5: Preview</TabsTrigger>
                    </TabsList>
                </div>
            </div>

            {/* Unpublish confirmation dialog */}
            <AlertDialog open={showUnpublishConfirm} onOpenChange={cancelUnpublish}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Unpublish Chapter?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will change the chapter status to "Draft" and it will no longer be
                            visible to students. You can publish it again at any time.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={cancelUnpublish}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmUnpublish}>
                            Unpublish
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
