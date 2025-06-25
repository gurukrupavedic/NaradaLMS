import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/Tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/design-system";
import { ScriptSelector } from "@/components/common/ScriptSelector";
import { AnnotationLayer } from "@/components/text-segmentation/AnnotationLayer";
import { LinkStatusIcon } from "@/components/ui/link-status-icon";
import { FileText, Plus, Trash2, Type, Ruler } from "@/lib/icons";

interface SegmentationTabProps {
  // Chapter data
  chapterId: string;
  chapterContent: { te?: string; hi?: string; en?: string };
  isPublished: boolean;
  
  // Segmentation state
  selectedScript: "te" | "hi" | "en";
  segmentName: string;
  textSegments: any[];
  allChapterMappings: any[];
  
  // Text selection
  currentSelection: any;
  hasSelection: boolean;
  
  // Actions
  onScriptChange: (script: "te" | "hi" | "en") => void;
  onSegmentNameChange: (name: string) => void;
  onCreateSegment: () => void;
  onDeleteSegment: (id: number) => void;
  onTextSelection: (e: React.MouseEvent<HTMLDivElement>) => void;
  
  // Mutations
  createSegmentMutation: any;
  deleteSegmentMutation: any;
  
  // Utilities
  renderSegmentedText: (
    text: string,
    segments: any[],
    mappings: any[],
    onSegmentClick?: (segment: any) => void
  ) => React.ReactNode;
  getMappingStatus: (segmentId: number, mappings: any[]) => string;
}

// Phase 5B: React Performance Optimization - Add memoization
export const SegmentationTab = React.memo(function SegmentationTab({
  chapterId,
  chapterContent,
  isPublished,
  selectedScript,
  segmentName,
  textSegments,
  allChapterMappings,
  currentSelection,
  hasSelection,
  onScriptChange,
  onSegmentNameChange,
  onCreateSegment,
  onDeleteSegment,
  onTextSelection,
  createSegmentMutation,
  deleteSegmentMutation,
  renderSegmentedText,
  getMappingStatus,
}: SegmentationTabProps) {
  // Phase 5B: Memoize expensive computations
  const scriptSegments = React.useMemo(() => 
    textSegments.filter((segment) => segment.script === selectedScript),
    [textSegments, selectedScript]
  );

  const segmentCounts = React.useMemo(() => ({
    te: textSegments.filter(s => s.script === 'te').length,
    hi: textSegments.filter(s => s.script === 'hi').length,
    en: textSegments.filter(s => s.script === 'en').length,
  }), [textSegments]);

  const { totalMappings, scriptMappings } = React.useMemo(() => {
    const total = allChapterMappings.length;
    const script = allChapterMappings.filter(mapping => {
      const segment = textSegments.find(s => s.id === mapping.textSegmentId);
      return segment?.script === selectedScript;
    }).length;
    return { totalMappings: total, scriptMappings: script };
  }, [allChapterMappings, textSegments, selectedScript]);

  // Phase 5B: Memoized callbacks
  const handleScriptChange = React.useCallback((script: "te" | "hi" | "en") => {
    onScriptChange(script);
  }, [onScriptChange]);

  const handleSegmentNameChange = React.useCallback((name: string) => {
    onSegmentNameChange(name);
  }, [onSegmentNameChange]);

  const handleCreateSegment = React.useCallback(() => {
    onCreateSegment();
  }, [onCreateSegment]);

  const handleDeleteSegment = React.useCallback((id: number) => {
    onDeleteSegment(id);
  }, [onDeleteSegment]);

  return (
    <TabsContent value="segmentation" className="space-y-6">
      <div className="grid gap-6">
        {/* Script Selection and Stats */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Type className="w-5 h-5" />
                Text Segmentation
              </CardTitle>
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Total Mappings: {totalMappings}
                </div>
                <ScriptSelector
                  value={selectedScript}
                  onValueChange={handleScriptChange}
                  disabled={isPublished}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {(['te', 'hi', 'en'] as const).map((script) => (
                <div
                  key={script}
                  className={`p-3 rounded-lg border ${
                    selectedScript === script
                      ? "border-primary bg-primary/10"
                      : "border-border"
                  }`}
                >
                  <div className="text-sm font-medium text-center">
                    {script.toUpperCase()}
                  </div>
                  <div className="text-xl font-bold text-center">
                    {segmentCounts[script]}
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    segments
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="text-sm">
                Current Script: <strong>{selectedScript.toUpperCase()}</strong>
              </div>
              <div className="text-sm">
                Segments: {scriptSegments.length} | Mapped: {scriptMappings}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Text Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ruler className="w-5 h-5" />
                  Text Content ({selectedScript.toUpperCase()})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isPublished && (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        This chapter is published. Text segmentation is disabled.
                      </p>
                    </div>
                  )}

                  {hasSelection && !isPublished && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Text selected: "{currentSelection?.selectedText}"
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                        Position: {currentSelection?.start} - {currentSelection?.end}
                      </p>
                    </div>
                  )}

                  <div className="relative">
                    <AnnotationLayer
                      content={chapterContent[selectedScript] || ""}
                      segments={scriptSegments}
                      onTextSelection={onTextSelection}
                      readOnly={isPublished}
                      renderSegmentedText={renderSegmentedText}
                      allChapterMappings={allChapterMappings}
                    />
                  </div>

                  {!chapterContent[selectedScript] && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        No content available for {selectedScript.toUpperCase()}
                      </p>
                      <p className="text-xs">
                        Add content in the Content tab first
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Segment Creation and Management */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Segments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Segment Creation */}
                {!isPublished && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="segmentName" className="text-sm">
                        Segment Name
                      </Label>
                      <Input
                        id="segmentName"
                        value={segmentName}
                        onChange={(e) => handleSegmentNameChange(e.target.value)}
                        placeholder="Enter segment name"
                        className="text-sm"
                      />
                    </div>
                    
                    {hasSelection && (
                      <div className="p-2 bg-muted rounded text-xs">
                        Selection: {currentSelection?.start} - {currentSelection?.end}
                      </div>
                    )}
                    
                    <Button
                      onClick={handleCreateSegment}
                      disabled={
                        !hasSelection ||
                        !segmentName.trim() ||
                        createSegmentMutation.isPending ||
                        isPublished
                      }
                      size="sm"
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Text Segment
                    </Button>
                  </div>
                )}

                {/* Segment List */}
                <div className="space-y-2">
                  <Label className="text-sm">
                    Text Segments ({scriptSegments.length})
                  </Label>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {scriptSegments.length > 0 ? (
                      scriptSegments.map((segment) => (
                        <div
                          key={segment.id}
                          className="p-3 border rounded-lg bg-white dark:bg-gray-800"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <div className="font-medium text-sm">
                                  {segment.conceptualName || `Segment ${segment.id}`}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {segment.script === selectedScript
                                    ? `${segment.script.toUpperCase()}: ${segment.startPosition}-${segment.endPosition}`
                                    : `Script: ${segment.script} (${segment.startPosition}-${segment.endPosition})`}
                                </div>
                              </div>
                              <div className="flex-shrink-0">
                                <LinkStatusIcon 
                                  status={getMappingStatus(segment.id, allChapterMappings)}
                                  size="md"
                                />
                              </div>
                            </div>
                            {!isPublished && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDeleteSegment(segment.id)}
                                disabled={deleteSegmentMutation.isPending}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">
                          No text segments created yet
                        </p>
                        <p className="text-xs">
                          Select text above to create segments
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TabsContent>
  );
});