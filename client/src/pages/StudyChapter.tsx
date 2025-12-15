import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/design-system/Badge";
import { Switch } from "@/components/design-system/Switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Music, FileText, List, Zap } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading";
import { ScriptSelector } from "@/components/common/ScriptSelector";
import { AudioControls } from "@/components/design-system/AudioControls";
import { SegmentedTextDisplay } from "@/components/text-segmentation/SegmentedTextDisplay";

interface ChapterData {
  id: number;
  trackId: number;
  title: string;
  description?: string;
  status: "draft" | "published";
  content: {
    te?: string;
    hi?: string;
    en?: string;
  };
}

interface TextSegment {
  id: number;
  chapterId: number;
  script: string;
  startPosition: number;
  endPosition: number;
  order: number;
  createdBy: string;
  createdAt: string;
}

interface AudioFile {
  id: number;
  chapterId: number;
  filename: string;
  displayName?: string;
  duration: number;
}

interface AudioTextMapping {
  mappingId: number;
  audioFileId: number;
  textSegmentId: number;
  startTime: number;
  endTime: number;
}

export function StudyChapter() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/chapter/:chapterId");
  const chapterId = params?.chapterId;

  const [contentScript, setContentScript] = useState<"te" | "hi" | "en">("te");
  const [selectedAudioFileId, setSelectedAudioFileId] = useState<number | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | undefined>(undefined);
  const [learnMode, setLearnMode] = useState<boolean>(() => {
    const stored = localStorage.getItem("study-learn-mode");
    return stored ? JSON.parse(stored) : true;
  });

  const previewAudioRef = useRef<HTMLAudioElement>(new Audio());
  const timeUpdateCleanupRef = useRef<(() => void) | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    localStorage.setItem("study-learn-mode", JSON.stringify(learnMode));
  }, [learnMode]);

  const { data: chapter, isLoading: chapterLoading } = useQuery<ChapterData>({
    queryKey: [`/api/chapters/${chapterId}/details`],
    enabled: !!chapterId,
  });

  const { data: textSegments = [] } = useQuery<TextSegment[]>({
    queryKey: [`/api/segments/${chapterId}/${contentScript}`],
    enabled: !!chapterId && !!contentScript,
  });

  const { data: audioFiles = [] } = useQuery<AudioFile[]>({
    queryKey: [`/api/audio-files/${chapterId}`],
    enabled: !!chapterId,
  });

  const { data: mappings = [] } = useQuery<AudioTextMapping[]>({
    queryKey: [`/api/segment-mappings/${chapterId}`],
    enabled: !!chapterId,
  });

  useEffect(() => {
    if (audioFiles.length > 0 && !selectedAudioFileId) {
      setSelectedAudioFileId(audioFiles[0].id);
      previewAudioRef.current.src = `/uploads/${audioFiles[0].filename}`;
    }
  }, [audioFiles, selectedAudioFileId]);

  useEffect(() => {
    const audio = previewAudioRef.current;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const handleSegmentClick = useCallback((segmentId: number | undefined) => {
    if (!segmentId) {
      setSelectedSegmentId(undefined);
      if (timeUpdateCleanupRef.current) {
        timeUpdateCleanupRef.current();
        timeUpdateCleanupRef.current = null;
      }
      return;
    }

    setSelectedSegmentId(segmentId);

    // Priority: selected audio file first, then fallback to any other mapping
    const mapping = mappings.find((m) => 
      m.textSegmentId === segmentId && m.audioFileId === selectedAudioFileId
    ) || mappings.find((m) => m.textSegmentId === segmentId);

    if (!mapping) return;

    if (timeUpdateCleanupRef.current) {
      timeUpdateCleanupRef.current();
      timeUpdateCleanupRef.current = null;
    }

    const audio = previewAudioRef.current;

    const playSegment = () => {
      audio.currentTime = mapping.startTime;
      setCurrentTime(mapping.startTime);

      const handleTimeUpdate = () => {
        if (audio.currentTime >= mapping.endTime) {
          audio.pause();
          setIsPlaying(false);
          audio.removeEventListener("timeupdate", handleTimeUpdate);
          timeUpdateCleanupRef.current = null;
        }
      };

      audio.addEventListener("timeupdate", handleTimeUpdate);
      timeUpdateCleanupRef.current = () => {
        audio.removeEventListener("timeupdate", handleTimeUpdate);
      };

      audio.play().catch(console.error);
      setIsPlaying(true);
    };

    if (selectedAudioFileId !== mapping.audioFileId) {
      const audioFile = audioFiles.find((f) => f.id === mapping.audioFileId);
      if (audioFile) {
        audio.src = `/uploads/${audioFile.filename}`;
        setSelectedAudioFileId(mapping.audioFileId);
        audio.addEventListener("loadedmetadata", () => playSegment(), { once: true });
      }
    } else {
      playSegment();
    }
  }, [mappings, selectedAudioFileId, audioFiles]);

  const chapterContent = chapter?.content || {};
  const currentScriptSegments = textSegments.filter((s) => s.script === contentScript);
  const mappedSegments = currentScriptSegments.filter((segment) =>
    mappings.some(
      (m) => m.textSegmentId === segment.id && m.audioFileId === selectedAudioFileId
    )
  );

  if (chapterLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation(`/tracks/${chapter?.trackId}`)}
              data-testid="button-back-chapters"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Chapters
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900" data-testid="text-chapter-title">
                {chapter?.title || "Study Chapter"}
              </h1>
              <p className="text-sm text-gray-600">{chapter?.description || ""}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex justify-between items-center mb-4 p-3 bg-white border rounded-lg">
          <div className="flex items-center gap-4">
            <ScriptSelector
              currentScript={contentScript}
              availableScripts={["te", "hi", "en"]}
              onScriptChange={setContentScript}
            />

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium">Audio File:</label>
              <Select
                value={selectedAudioFileId?.toString() || ""}
                onValueChange={(value) => {
                  const audioFileId = parseInt(value);
                  const audioFile = audioFiles.find((f) => f.id === audioFileId);
                  if (audioFile) {
                    previewAudioRef.current.src = `/uploads/${audioFile.filename}`;
                    setSelectedAudioFileId(audioFileId);
                  }
                }}
              >
                <SelectTrigger className="w-80 h-7 text-xs" data-testid="select-audio-file">
                  <SelectValue placeholder="Select audio file" />
                </SelectTrigger>
                <SelectContent>
                  {audioFiles.map((file) => (
                    <SelectItem key={file.id} value={file.id.toString()}>
                      {file.displayName || file.filename}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Badge variant="blue" badgeStyle="sharp" className="text-xs" icon={<List className="h-3 w-3" />}>
              {currentScriptSegments.length} segments
            </Badge>
            <Badge variant="green" badgeStyle="sharp" className="text-xs" icon={<Zap className="h-3 w-3" />}>
              {mappedSegments.length} mapped
            </Badge>
          </div>
        </div>

        <div className="mb-4">
          {selectedAudioFileId ? (
            <AudioControls
              title={
                audioFiles.find((f) => f.id === selectedAudioFileId)?.displayName ||
                audioFiles.find((f) => f.id === selectedAudioFileId)?.filename ||
                "Audio File"
              }
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              volume={volume}
              playbackRate={playbackRate}
              onPlay={() => {
                previewAudioRef.current.play().catch(console.error);
                setIsPlaying(true);
              }}
              onPause={() => {
                previewAudioRef.current.pause();
                setIsPlaying(false);
              }}
              onStop={() => {
                previewAudioRef.current.pause();
                previewAudioRef.current.currentTime = 0;
                setIsPlaying(false);
                setCurrentTime(0);
              }}
              onSeek={(time) => {
                previewAudioRef.current.currentTime = time;
                setCurrentTime(time);
              }}
              onVolumeUpdate={(vol) => {
                previewAudioRef.current.volume = vol / 100;
                setVolume(vol);
              }}
              onPlaybackRateChange={(rate) => {
                previewAudioRef.current.playbackRate = rate;
                setPlaybackRate(rate);
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-lg bg-white">
              <Music className="w-12 h-12 mb-4 opacity-50" />
              <p>Select an audio file to begin studying</p>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 flex flex-col border rounded-lg bg-white overflow-hidden">
          <div className="flex-shrink-0 p-4 border-b bg-gray-50 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-700">
              {chapter?.title || "Chapter"} (
              {contentScript === "te" ? "Telugu" : contentScript === "hi" ? "Hindi" : "English"})
            </h3>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600">Learn Mode:</span>
              <Switch
                checked={learnMode}
                onCheckedChange={setLearnMode}
                variant="orange"
                size="sm"
                data-testid="toggle-learn-mode"
              />
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-auto p-6" style={{ minHeight: "400px" }}>
            {chapterContent[contentScript] ? (
              learnMode ? (
                <SegmentedTextDisplay
                  content={chapterContent}
                  currentScript={contentScript}
                  segments={textSegments}
                  selectedSegmentId={selectedSegmentId}
                  onSegmentClick={handleSegmentClick}
                  mode="preview"
                  className=""
                />
              ) : (
                <div
                  className={`prose max-w-none ${
                    contentScript === "te"
                      ? "font-telugu"
                      : contentScript === "hi"
                      ? "font-devanagari"
                      : "font-iast"
                  }`}
                  style={{ lineHeight: "1.6" }}
                  dangerouslySetInnerHTML={{ __html: chapterContent[contentScript] || "" }}
                  data-testid="html-content-view"
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mb-4 opacity-50" />
                <p>No content available for this script</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
