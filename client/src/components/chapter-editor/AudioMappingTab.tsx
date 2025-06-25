import React, { useRef } from "react";
import { 
  Button, Card, CardContent, CardHeader, CardTitle,
  TabsContent, Input, Label, Progress
} from "@/components/design-system";
import { 
  Upload, Play, Pause, Square, MapPin, X, Trash2, Plus, 
  Music, Edit2, Save, Timer 
} from "@/lib/icons";

interface AudioMappingTabProps {
  // Chapter data
  chapterId: string;
  audioFiles: any[];
  selectedAudioFile: any;
  isPublished: boolean;
  
  // Audio player state
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  timeMarks: number[];
  selectedMark: number | null;
  
  // Editing state
  editingFileId: number | null;
  editingFileName: string;
  isDragOver: boolean;
  
  // Media segments
  mediaSegments: any[];
  editingSegmentId: number | null;
  editingSegmentData: any;
  
  // Actions
  onAudioFileSelect: (file: any) => void;
  onAudioUpload: (file: File) => void;
  onTogglePlayPause: () => void;
  onStop: () => void;
  onAddTimeMark: () => void;
  onClearSelectedMark: () => void;
  onClearAllMarks: () => void;
  onCreateSegments: () => void;
  onStartEditingFile: (file: any) => void;
  onSaveFileName: () => void;
  onCancelEditingFile: () => void;
  onFileNameChange: (name: string) => void;
  onDeleteAudioFile: (id: number) => void;
  onStartEditingSegment: (segment: any) => void;
  onSaveSegmentEdit: () => void;
  onCancelEditingSegment: () => void;
  onDeleteSegment: (id: number) => void;
  onSegmentDataChange: (data: any) => void;
  onDragOver: (isDragOver: boolean) => void;
  
  // Mutations
  audioUploadMutation: any;
  updateAudioFileMutation: any;
  deleteAudioFileMutation: any;
  createAudioSegmentsMutation: any;
  updateMediaSegmentMutation: any;
  deleteMediaSegmentMutation: any;
  
  // Utilities
  formatTime: (seconds: number) => string;
}

export function AudioMappingTab({
  chapterId,
  audioFiles,
  selectedAudioFile,
  isPublished,
  isPlaying,
  currentTime,
  duration,
  timeMarks,
  selectedMark,
  editingFileId,
  editingFileName,
  isDragOver,
  mediaSegments,
  editingSegmentId,
  editingSegmentData,
  onAudioFileSelect,
  onAudioUpload,
  onTogglePlayPause,
  onStop,
  onAddTimeMark,
  onClearSelectedMark,
  onClearAllMarks,
  onCreateSegments,
  onStartEditingFile,
  onSaveFileName,
  onCancelEditingFile,
  onFileNameChange,
  onDeleteAudioFile,
  onStartEditingSegment,
  onSaveSegmentEdit,
  onCancelEditingSegment,
  onDeleteSegment,
  onSegmentDataChange,
  onDragOver,
  audioUploadMutation,
  updateAudioFileMutation,
  deleteAudioFileMutation,
  createAudioSegmentsMutation,
  updateMediaSegmentMutation,
  deleteMediaSegmentMutation,
  formatTime,
}: AudioMappingTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver(true);
  };

  const handleDragLeave = () => {
    onDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const audioFile = files.find(file => file.type.startsWith('audio/'));
    
    if (audioFile) {
      onAudioUpload(audioFile);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAudioUpload(file);
    }
  };

  return (
    <TabsContent value="audio" className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Audio Files Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="w-5 h-5" />
              Audio Files
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Upload Area */}
            {!isPublished && (
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragOver
                    ? "border-primary bg-primary/10"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Drag and drop audio files here, or click to browse
                </p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={audioUploadMutation.isPending}
                >
                  Choose Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}

            {/* Audio Files List */}
            <div className="space-y-2">
              <Label className="text-sm">Available Audio Files</Label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {audioFiles && audioFiles.length > 0 ? (
                  audioFiles.map((file) => (
                    <div
                      key={file.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedAudioFile?.id === file.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => onAudioFileSelect(file)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          {editingFileId === file.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingFileName}
                                onChange={(e) => onFileNameChange(e.target.value)}
                                className="text-sm"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSaveFileName();
                                }}
                                disabled={updateAudioFileMutation.isPending}
                              >
                                <Save className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCancelEditingFile();
                                }}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <div>
                              <p className="font-medium text-sm truncate">
                                {file.filename}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Duration: {formatTime(file.duration)}
                              </p>
                            </div>
                          )}
                        </div>
                        {!isPublished && editingFileId !== file.id && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                onStartEditingFile(file);
                              }}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteAudioFile(file.id);
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No audio files uploaded yet</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audio Player and Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="w-5 h-5" />
              Audio Player
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedAudioFile ? (
              <>
                {/* Playback Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={onTogglePlayPause}
                    size="sm"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    onClick={onStop}
                    size="sm"
                    variant="outline"
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={onAddTimeMark}
                    size="sm"
                    variant="outline"
                    disabled={isPublished}
                  >
                    <MapPin className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={onClearSelectedMark}
                    size="sm"
                    variant="outline"
                    disabled={isPublished}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={onClearAllMarks}
                    size="sm"
                    variant="outline"
                    disabled={isPublished}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  <Progress 
                    value={(currentTime / duration) * 100} 
                    className="w-full" 
                  />
                </div>

                {/* Time Marks */}
                {timeMarks.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">Time Marks ({timeMarks.length})</Label>
                    <div className="flex flex-wrap gap-1">
                      {timeMarks.map((mark, index) => (
                        <Button
                          key={index}
                          variant={selectedMark === mark ? "default" : "outline"}
                          size="sm"
                          onClick={() => {/* Handle mark selection */}}
                        >
                          {formatTime(mark)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Create Segments Button */}
                {timeMarks.length > 1 && !isPublished && (
                  <div className="pt-4 border-t">
                    <Button
                      onClick={onCreateSegments}
                      disabled={createAudioSegmentsMutation.isPending}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create {timeMarks.length - 1} Audio Segments
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Timer className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select an audio file to begin</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Media Segments */}
      {selectedAudioFile && mediaSegments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Media Segments ({mediaSegments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mediaSegments.map((segment) => (
                <div
                  key={segment.id}
                  className="p-3 border rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {editingSegmentId === segment.id ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Start Time</Label>
                              <Input
                                value={editingSegmentData?.startTime || ""}
                                onChange={(e) => onSegmentDataChange({
                                  ...editingSegmentData,
                                  startTime: e.target.value
                                })}
                                placeholder="0:00"
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">End Time</Label>
                              <Input
                                value={editingSegmentData?.endTime || ""}
                                onChange={(e) => onSegmentDataChange({
                                  ...editingSegmentData,
                                  endTime: e.target.value
                                })}
                                placeholder="0:00"
                                className="text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={onSaveSegmentEdit}
                              disabled={updateMediaSegmentMutation.isPending}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={onCancelEditingSegment}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium text-sm">
                            {segment.name || `Segment ${segment.id}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                            ({formatTime(segment.endTime - segment.startTime)})
                          </p>
                        </div>
                      )}
                    </div>
                    {!isPublished && editingSegmentId !== segment.id && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onStartEditingSegment(segment)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDeleteSegment(segment.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </TabsContent>
  );
}