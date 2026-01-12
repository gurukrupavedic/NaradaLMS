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
            <div className="bg-white/95 dark:bg-black/95 backdrop-blur supports-[backdrop-filter]:backdrop-blur border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
                <div className="w-full mx-auto px-6 py-3">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                                {chapter?.track ? `TRACK ${chapter.track.order} - ${chapter.track.title}` : 'CHAPTER STUDIO'}
                            </p>
                            <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                                {chapter ? `Chapter ${chapter.order || '?'} - ${chapter.title}` : 'Chapter Content Editor'}
                            </h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <span className={isPublished ? "h-2 w-2 rounded-full bg-green-500" : "h-2 w-2 rounded-full bg-yellow-500"} />
                                <span className="text-sm font-medium text-muted-foreground mr-2">
                                    {isPublished ? 'Published' : 'Draft'}
                                </span>
                            </div>
                            <Button
                                variant={isPublished ? 'outline' : 'default'}
                                size="sm"
                                onClick={handlePublishToggle}
                                disabled={isTogglingStatus}
                            >
                                {isPublished ? 'Unpublish' : 'Publish Chapter'}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* 5-step tabs integrated into header - cleaner look */}
                <div className="px-6 pb-2">
                    <TabsList className="w-full justify-start h-9 bg-transparent p-0">
                        <TabsTrigger
                            value="content"
                            className="data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-4"
                        >
                            Step 1: Content
                        </TabsTrigger>
                        <TabsTrigger
                            value="segmentation"
                            className="data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-4"
                        >
                            Step 2: Segmentation
                        </TabsTrigger>
                        <TabsTrigger
                            value="mapping"
                            className="data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-4"
                        >
                            Step 3: Audio Mapping
                        </TabsTrigger>
                        <TabsTrigger
                            value="preview"
                            className="data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-4"
                        >
                            Step 4: Preview
                        </TabsTrigger>
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
