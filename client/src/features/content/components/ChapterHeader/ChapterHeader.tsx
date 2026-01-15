import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { PencilLine, Slice } from 'lucide-react';
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

interface ChapterHeaderProps {
    activeTab: string;
    textSegMode: 'editor' | 'segmentation';
    onTextSegModeChange: (mode: 'editor' | 'segmentation') => void;
}

export function ChapterHeader({ activeTab, textSegMode, onTextSegModeChange }: ChapterHeaderProps) {
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
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white/95 dark:bg-black/95 backdrop-blur supports-[backdrop-filter]:backdrop-blur border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
                <div className="px-6 py-2 flex items-center justify-between">
                    {/* Left: Tabs */}
                    <TabsList className="h-9 bg-transparent p-0">
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
                        <TabsTrigger
                            value="text-segmentation"
                            className="data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-800 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-4"
                        >
                            Step 5: Text Segmentation (NEW)
                        </TabsTrigger>
                    </TabsList>

                    {/* Right: Actions (Status + Publish + Mode Toggle) */}
                    <div className="flex items-center gap-3">
                        {/* Mode Toggle (Only visible on Step 5) */}
                        {activeTab === 'text-segmentation' && (
                            <div className="flex items-center border rounded-lg p-0.5 bg-muted/20 mr-2">
                                <Button
                                    variant={textSegMode === 'editor' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => onTextSegModeChange('editor')}
                                    className="h-7 px-2 gap-1.5 text-xs font-medium"
                                >
                                    <PencilLine className="h-3.5 w-3.5" />
                                    Editor
                                </Button>
                                <Button
                                    variant={textSegMode === 'segmentation' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    onClick={() => onTextSegModeChange('segmentation')}
                                    className="h-7 px-2 gap-1.5 text-xs font-medium"
                                >
                                    <Slice className="h-3.5 w-3.5" />
                                    Segment
                                </Button>
                            </div>
                        )}

                        <div className="h-4 w-px bg-border" />

                        <div className="flex items-center gap-2">
                            <span className={isPublished ? "h-2 w-2 rounded-full bg-green-500" : "h-2 w-2 rounded-full bg-yellow-500"} />
                            <span className="text-sm font-medium text-muted-foreground">
                                {isPublished ? 'Published' : 'Draft'}
                            </span>
                        </div>

                        <Button
                            variant={isPublished ? 'outline' : 'default'}
                            size="sm"
                            onClick={handlePublishToggle}
                            disabled={isTogglingStatus}
                            className="h-8"
                        >
                            {isPublished ? 'Unpublish' : 'Publish'}
                        </Button>
                    </div>
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
