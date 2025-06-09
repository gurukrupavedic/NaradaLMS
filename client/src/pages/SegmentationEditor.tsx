import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Clock, 
  FileText, 
  Link, 
  Trash2,
  Plus,
  Save,
  Volume2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SegmentationEditor() {
  const [, params] = useRoute("/admin/chapters/:chapterId/segmentation");
  const chapterId = parseInt(params?.chapterId || "0");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Audio player state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedAudioFile, setSelectedAudioFile] = useState<any>(null);

  // Segmentation state
  const [mediaSegments, setMediaSegments] = useState<any[]>([]);
  const [selectedMediaSegment, setSelectedMediaSegment] = useState<any>(null);
  const [selectedTextSegment, setSelectedTextSegment] = useState<any>(null);
  const [segmentName, setSegmentName] = useState("");
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  // Fetch chapter data
  const { data: chapter } = useQuery<any>({
    queryKey: ["/api/admin/chapters", chapterId],
    enabled: !!chapterId,
  });

  // Fetch audio files for the chapter
  const { data: audioFiles = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/audio-files", chapterId],
    enabled: !!chapterId,
  });

  // Fetch text segments for the chapter with memoized sorting
  const { data: textSegmentsData = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/segments", chapterId],
    enabled: !!chapterId,
  });

  const textSegments = useMemo(() => 
    textSegmentsData.sort((a: any, b: any) => (a.order || 0) - (b.order || 0)), 
    [textSegmentsData]
  );

  // Fetch media segments for selected audio file
  const { data: mediaSegmentsData = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/media-segments", selectedAudioFile?.id],
    enabled: !!selectedAudioFile?.id,
  });

  // Fetch segment mappings for the chapter
  const { data: segmentMappings = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/segment-mappings", chapterId],
    enabled: !!chapterId,
  });

  // Memoized sorted media segments for performance
  const sortedMediaSegments = useMemo(() => 
    mediaSegmentsData.sort((a: any, b: any) => (a.startTime || 0) - (b.startTime || 0)), 
    [mediaSegmentsData]
  );

  // Update media segments when data changes
  useEffect(() => {
    setMediaSegments(sortedMediaSegments);
  }, [sortedMediaSegments]);

  // Create media segment mutation
  const createMediaSegmentMutation = useMutation({
    mutationFn: async (segment: any) => {
      const response = await fetch("/api/admin/media-segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(segment),
      });
      if (!response.ok) throw new Error("Failed to create media segment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media-segments"] });
      toast({ title: "Media segment created successfully" });
    },
  });

  // Create segment mapping mutation
  const createSegmentMappingMutation = useMutation({
    mutationFn: async (mapping: any) => {
      const response = await fetch("/api/admin/segment-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mapping),
      });
      if (!response.ok) throw new Error("Failed to create segment mapping");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/segment-mappings"] });
      toast({ title: "Segment mapping created successfully" });
    },
  });

  // Delete media segment mutation
  const deleteMediaSegmentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/media-segments/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete media segment");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media-segments"] });
      toast({ title: "Media segment deleted successfully" });
    },
  });

  // Delete segment mapping mutation
  const deleteSegmentMappingMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/segment-mappings/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete segment mapping");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/segment-mappings"] });
      toast({ title: "Segment mapping deleted successfully" });
    },
  });

  // Audio player handlers
  const handlePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handleSeek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const markCurrentTime = useCallback((isStart: boolean) => {
    if (isStart) {
      setStartTime(currentTime);
    } else {
      setEndTime(currentTime);
    }
  }, [currentTime]);

  const createMediaSegment = useCallback(() => {
    if (!selectedAudioFile || !segmentName || startTime >= endTime) {
      toast({ title: "Please provide valid segment details", variant: "destructive" });
      return;
    }

    createMediaSegmentMutation.mutate({
      audioFileId: selectedAudioFile.id,
      startTimestamp: startTime,
      endTimestamp: endTime,
      segmentName,
    });

    // Reset form
    setSegmentName("");
    setStartTime(0);
    setEndTime(0);
  }, [selectedAudioFile, segmentName, startTime, endTime, createMediaSegmentMutation, toast]);

  const createMapping = useCallback(() => {
    if (!selectedMediaSegment || !selectedTextSegment) {
      toast({ title: "Please select both media and text segments", variant: "destructive" });
      return;
    }

    createSegmentMappingMutation.mutate({
      mediaSegmentId: selectedMediaSegment.id,
      textSegmentId: selectedTextSegment.id,
    });

    setSelectedMediaSegment(null);
    setSelectedTextSegment(null);
  }, [selectedMediaSegment, selectedTextSegment, createSegmentMappingMutation, toast]);

  const formatTime = useCallback((time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  const playSegment = useCallback((segment: any) => {
    if (audioRef.current) {
      audioRef.current.currentTime = segment.startTimestamp;
      audioRef.current.play();
      setIsPlaying(true);
      
      // Auto-pause at end time
      const checkTime = () => {
        if (audioRef.current && audioRef.current.currentTime >= segment.endTimestamp) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          requestAnimationFrame(checkTime);
        }
      };
      requestAnimationFrame(checkTime);
    }
  }, []);

  // Get existing mappings for display
  const existingMappings = useMemo(() => {
    return segmentMappings.map((mapping: any) => ({
      id: mapping.id,
      mediaSegment: mapping.mediaSegment,
      textSegment: mapping.textSegment,
    }));
  }, [segmentMappings]);

  if (!chapter) {
    return <div>Loading chapter...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audio-Text Segmentation</h1>
          <p className="text-muted-foreground">Chapter: {chapter?.title || 'Loading...'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Audio Player Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Volume2 className="h-5 w-5" />
              Audio Player & Segmentation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Audio File Selection */}
            <div>
              <Label>Select Audio File</Label>
              <div className="grid grid-cols-1 gap-2 mt-2">
                {audioFiles.map((file: any) => (
                  <Button
                    key={file.id}
                    variant={selectedAudioFile?.id === file.id ? "default" : "outline"}
                    onClick={() => setSelectedAudioFile(file)}
                    className="justify-start"
                  >
                    {file.filename}
                  </Button>
                ))}
              </div>
            </div>

            {selectedAudioFile && (
              <>
                {/* Audio Player */}
                <div className="space-y-4">
                  <audio
                    ref={audioRef}
                    src={selectedAudioFile.filePath}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => setIsPlaying(false)}
                  />
                  
                  {/* Player Controls */}
                  <div className="flex items-center gap-4">
                    <Button onClick={() => handleSeek(Math.max(0, currentTime - 10))} size="sm">
                      <SkipBack className="h-4 w-4" />
                    </Button>
                    <Button onClick={handlePlay} size="sm">
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button onClick={() => handleSeek(Math.min(duration, currentTime + 10))} size="sm">
                      <SkipForward className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-mono">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  {/* Timeline */}
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="0"
                      max={duration || 0}
                      value={currentTime}
                      onChange={(e) => handleSeek(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="relative h-8 bg-muted rounded">
                      {mediaSegments.map((segment) => {
                        const left = (segment.startTimestamp / duration) * 100;
                        const width = ((segment.endTimestamp - segment.startTimestamp) / duration) * 100;
                        return (
                          <div
                            key={segment.id}
                            className="absolute bg-primary/60 h-full rounded cursor-pointer hover:bg-primary/80"
                            style={{ left: `${left}%`, width: `${width}%` }}
                            onClick={() => playSegment(segment)}
                            title={segment.segmentName}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Segment Creation */}
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Create Media Segment</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Time</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={startTime.toFixed(2)}
                          onChange={(e) => setStartTime(parseFloat(e.target.value))}
                          step="0.1"
                        />
                        <Button onClick={() => markCurrentTime(true)} size="sm">
                          <Clock className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>End Time</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={endTime.toFixed(2)}
                          onChange={(e) => setEndTime(parseFloat(e.target.value))}
                          step="0.1"
                        />
                        <Button onClick={() => markCurrentTime(false)} size="sm">
                          <Clock className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label>Segment Name</Label>
                    <Input
                      value={segmentName}
                      onChange={(e) => setSegmentName(e.target.value)}
                      placeholder="Enter segment name..."
                    />
                  </div>
                  <Button onClick={createMediaSegment} disabled={createMediaSegmentMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    Create Segment
                  </Button>
                </div>

                {/* Media Segments List */}
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Media Segments</h3>
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {mediaSegments.map((segment) => (
                        <Card
                          key={segment.id}
                          className={`p-3 cursor-pointer transition-colors ${
                            selectedMediaSegment?.id === segment.id ? "bg-primary/10 border-primary" : "hover:bg-muted"
                          }`}
                          onClick={() => setSelectedMediaSegment(segment)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{segment.segmentName}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatTime(segment.startTimestamp)} - {formatTime(segment.endTimestamp)}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => playSegment(segment)}>
                                <Play className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteMediaSegmentMutation.mutate(segment.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Text Segments & Mapping Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Text Segments & Mapping
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Text Segments */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Text Segments</h3>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {textSegments.map((segment: any) => (
                    <Card
                      key={segment.id}
                      className={`p-3 cursor-pointer transition-colors ${
                        selectedTextSegment?.id === segment.id ? "bg-primary/10 border-primary" : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedTextSegment(segment)}
                    >
                      <p className="font-medium">{segment.conceptualName}</p>
                      {segment.textReferences && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {segment.textReferences.te && <Badge variant="outline">Telugu</Badge>}
                          {segment.textReferences.hi && <Badge variant="outline">Hindi</Badge>}
                          {segment.textReferences.en && <Badge variant="outline">English</Badge>}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Create Mapping */}
            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Create Mapping</h3>
              {selectedMediaSegment && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium">Media Segment:</p>
                  <p className="text-sm">{selectedMediaSegment.segmentName}</p>
                </div>
              )}
              {selectedTextSegment && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium">Text Segment:</p>
                  <p className="text-sm">{selectedTextSegment.conceptualName}</p>
                </div>
              )}
              <Button
                onClick={createMapping}
                disabled={!selectedMediaSegment || !selectedTextSegment || createSegmentMappingMutation.isPending}
                className="w-full"
              >
                <Link className="h-4 w-4 mr-2" />
                Create Mapping
              </Button>
            </div>

            {/* Existing Mappings */}
            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Existing Mappings</h3>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {existingMappings.map((mapping) => (
                    <Card key={mapping.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs">
                          <p className="font-medium">{mapping.mediaSegment?.segmentName}</p>
                          <p className="text-muted-foreground">↔ {mapping.textSegment?.conceptualName}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteSegmentMappingMutation.mutate(mapping.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}