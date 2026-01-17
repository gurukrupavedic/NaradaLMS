import { useState } from 'react';
import { useChapterEditor } from '../../context/ChapterEditorContext';
import { useContentEditor } from '../../hooks/useContentEditor';
import { useTextSegmentationEditor } from '../../hooks/useTextSegmentationEditor';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from '@/components/ui/resizable';
import { PencilLine, Slice, FileText, StretchHorizontal, RotateCcw } from 'lucide-react';
import { TiptapEditor } from '@/components/ui/tiptap-editor';

import { SelectableTextPanel } from './SelectableTextPanel';
import { SegmentList } from './SegmentList';
import {
    DndContext,
    DragEndEvent,
    PointerSensor,
    KeyboardSensor,
    closestCenter,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/AlertDialog';
import '@/components/ui/tiptap-editor/styles/index.scss';

interface TextSegmentationTabProps {
    mode: 'editor' | 'segmentation';
}

export function TextSegmentationTab({ mode }: TextSegmentationTabProps) {
    const { isPublished } = useChapterEditor();

    return (
        mode === 'editor' ? (
            <EditorMode />
        ) : (
            <SegmentationMode />
        )
    );
}

function EditorMode() {
    const { isPublished } = useChapterEditor();
    const {
        content,
        contentScript,
        setContentScript,
        updateContent,
        saveStatus,
    } = useContentEditor();

    const currentContent = content[contentScript] || '';

    return (
        <div className="flex flex-col h-full">
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
                    maxHeight="100%"
                    minHeight="100%"
                />
            </div>
        </div>
    );
}

function SegmentationMode() {
    const { chapter, chapterId, isPublished } = useChapterEditor();
    const {
        selectedScript,
        setSelectedScript,
        scriptSegments,
        allChapterMappings,
        selectedSegmentId,
        setSelectedSegmentId,
        createSegmentFromSelection,
        deleteSegment,
        getMappingStatus,
        reorderSegments,
        clearAllSegments,
        isClearing,
    } = useTextSegmentationEditor();

    const [panelSizes, setPanelSizes] = useLocalStorage('text-segmentation-panel-sizes', {
        text: 50,
        segments: 50,
    });

    const handleLayoutChange = (sizes: number[]) => {
        if (sizes.length === 2) {
            setPanelSizes({ text: sizes[0], segments: sizes[1] });
        }
    };

    // Set up drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Handle drag end
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = scriptSegments.findIndex(s => s.id === active.id);
        const newIndex = scriptSegments.findIndex(s => s.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(scriptSegments, oldIndex, newIndex);
        reorderSegments(reordered);
    };

    return (
        <div className="h-full">
            <ResizablePanelGroup
                direction="horizontal"
                onLayout={handleLayoutChange}
                className="h-full gap-4"
            >
                {/* Left Panel: Selectable Text */}
                <ResizablePanel
                    defaultSize={panelSizes.text}
                    minSize={40}
                    maxSize={80}
                >
                    <Card className="h-full flex flex-col overflow-hidden">
                        <div className="px-4 h-11 bg-gray-50/50 dark:bg-gray-900/50 border-b flex-shrink-0 flex items-center">
                            <div className="flex items-center justify-between w-full">
                                <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Content Text ({selectedScript.toUpperCase()})
                                </h2>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground">Script:</span>
                                    <Select
                                        value={selectedScript}
                                        onValueChange={(value) => setSelectedScript(value as 'te' | 'hi' | 'en')}
                                        disabled={isPublished}
                                    >
                                        <SelectTrigger className="h-7 w-40 text-xs bg-white dark:bg-black border border-gray-200 dark:border-gray-700">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="text-sm">
                                            <SelectItem value="te">Telugu</SelectItem>
                                            <SelectItem value="hi">Devanagari (Hindi)</SelectItem>
                                            <SelectItem value="en">English (IAST)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden">
                            {chapter?.content?.[selectedScript] ? (
                                <SelectableTextPanel
                                    content={chapter.content}
                                    script={selectedScript}
                                    segments={scriptSegments}
                                    selectedSegmentId={selectedSegmentId}
                                    onSegmentSelect={setSelectedSegmentId}
                                    onCreateSegment={createSegmentFromSelection}
                                    disabled={isPublished}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                                    <FileText className="w-12 h-12 mb-4 opacity-50" />
                                    <p className="text-sm font-medium">No content available for {selectedScript.toUpperCase()}</p>
                                    <p className="text-xs mt-1">Switch to Editor Mode to add content first</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Right Panel: Segments */}
                <ResizablePanel
                    defaultSize={panelSizes.segments}
                    minSize={20}
                    maxSize={60}
                >
                    <Card className="h-full flex flex-col overflow-hidden">
                        <div className="px-4 h-11 bg-gray-50/50 dark:bg-gray-900/50 border-b flex-shrink-0 flex items-center">
                            <div className="flex items-center justify-between w-full">
                                <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <StretchHorizontal className="w-4 h-4 text-orange-600/70 fill-orange-500/70" />
                                    Text Segments ({scriptSegments.length})
                                </h2>
                                <div>
                                    {scriptSegments.length > 0 && !isPublished && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 text-xs text-muted-foreground hover:text-destructive px-2"
                                                    disabled={isClearing}
                                                >
                                                    <RotateCcw className="h-3 w-3 mr-1" />
                                                    Clear All
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete all {scriptSegments.length} text segments for the <strong>{selectedScript.toUpperCase()}</strong> script.
                                                        <br /><br />
                                                        Note: Any audio mappings associated with these segments will also be removed.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={clearAllSegments} className="bg-destructive hover:bg-destructive/90">
                                                        {isClearing ? 'Clearing...' : 'Yes, clear all segments'}
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </div>
                            </div>
                        </div>
                        <CardContent className="flex-1 overflow-auto p-4">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={scriptSegments.map(s => s.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <SegmentList
                                        segments={scriptSegments}
                                        mappings={allChapterMappings}
                                        onDelete={deleteSegment}
                                        getMappingStatus={getMappingStatus}
                                        isPublished={isPublished}
                                        selectedSegmentId={selectedSegmentId}
                                        onSelect={setSelectedSegmentId}
                                        content={chapter?.content}
                                        script={selectedScript}
                                    />
                                </SortableContext>
                            </DndContext>
                        </CardContent>
                    </Card>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
}
