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
import { PencilLine, Slice, FileText, StretchHorizontal } from 'lucide-react';
import { TiptapEditor } from '@/components/ui/tiptap-editor';
import { SelectableTextPanel } from './SelectableTextPanel';
import { SegmentList } from '../SegmentationTab/SegmentList';
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
import '@/components/ui/tiptap-editor/styles/index.scss';

interface TextSegmentationTabProps {
    mode: 'editor' | 'segmentation';
}

export function TextSegmentationTab({ mode }: TextSegmentationTabProps) {
    const { isPublished } = useChapterEditor();

    return (
        <div className="flex flex-col h-full">
            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
                {mode === 'editor' ? (
                    <EditorMode />
                ) : (
                    <SegmentationMode />
                )}
            </div>
        </div>
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
        <div className="h-full p-4">
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
                        <div className="px-6 h-14 bg-gray-50 dark:bg-gray-900 border-b flex-shrink-0 flex items-center">
                            <div className="flex items-center justify-between w-full">
                                <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Text Content ({selectedScript.toUpperCase()})
                                </h2>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Script</span>
                                    <Select
                                        value={selectedScript}
                                        onValueChange={(value) => setSelectedScript(value as 'te' | 'hi' | 'en')}
                                        disabled={isPublished}
                                    >
                                        <SelectTrigger className="h-8 w-48 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                                            <SelectValue placeholder="Select script" />
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
                        <div className="px-6 h-14 bg-gray-50 dark:bg-gray-900 border-b flex-shrink-0 flex items-center">
                            <div className="flex items-center justify-between w-full">
                                <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                    <StretchHorizontal className="w-5 h-5 text-orange-500" />
                                    Text Segments ({scriptSegments.length})
                                </h2>
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
