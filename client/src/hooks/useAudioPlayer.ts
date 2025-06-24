import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AudioFile {
  id: number;
  filename: string;
  duration: number;
  url: string;
}

export function useAudioPlayer(chapterId: string, audioRef: React.RefObject<HTMLAudioElement>) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const segmentBoundaryListenerRef = useRef<(() => void) | null>(null);

  // Audio state
  const [selectedAudioFile, setSelectedAudioFile] = useState<AudioFile | null>(null);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Timeline and marking state
  const [timeMarks, setTimeMarks] = useState<number[]>([]);
  const [selectedMark, setSelectedMark] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingTimestamp, setEditingTimestamp] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Audio segment editing state
  const [editingSegmentId, setEditingSegmentId] = useState<number | null>(null);
  const [editingSegmentData, setEditingSegmentData] = useState<{
    startTime: string;
    endTime: string;
  } | null>(null);
  const [editingFileName, setEditingFileName] = useState("");
  const [editingFileId, setEditingFileId] = useState<number | null>(null);

  // Media segmentation state
  const [selectedMediaSegment, setSelectedMediaSegment] = useState<any>(null);
  const [mediaSegmentName, setMediaSegmentName] = useState("");
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  // Safe time formatting function
  const formatTime = useCallback((seconds: number): string => {
    if (!seconds || seconds < 0 || !isFinite(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }, []);

  // Safe audio playback function for segments with boundary enforcement
  const playAudioSegment = useCallback((segment: any) => {
    if (!audioPlayer) {
      toast({
        title: "Audio Not Ready",
        description: "Please select an audio file first",
        variant: "destructive",
      });
      return;
    }

    const startTime = segment.startTime || 0;
    const endTime = segment.endTime || segment.startTime + 5;

    if (startTime >= duration || endTime > duration) {
      toast({
        title: "Invalid Segment",
        description: "Segment time exceeds audio duration",
        variant: "destructive",
      });
      return;
    }

    try {
      // Clean up any existing boundary listener
      if (segmentBoundaryListenerRef.current) {
        audioPlayer.removeEventListener("timeupdate", segmentBoundaryListenerRef.current);
        segmentBoundaryListenerRef.current = null;
      }

      // Create new boundary enforcement listener
      const boundaryListener = () => {
        if (audioPlayer.currentTime >= endTime) {
          audioPlayer.pause();
          setIsPlaying(false);
          // Clean up listener
          audioPlayer.removeEventListener("timeupdate", boundaryListener);
          segmentBoundaryListenerRef.current = null;
        }
      };

      // Store listener reference and add it
      segmentBoundaryListenerRef.current = boundaryListener;
      audioPlayer.addEventListener("timeupdate", boundaryListener);

      // Set playback position and start playing
      audioPlayer.currentTime = startTime;
      setCurrentTime(startTime);
      audioPlayer.play();
      setIsPlaying(true);

      toast({
        title: "Playing Segment",
        description: `${formatTime(startTime)} - ${formatTime(endTime)} (${Math.round(endTime - startTime)}s)`,
      });
    } catch (error) {
      console.error("Error playing segment:", error);
      toast({
        title: "Playback Error",
        description: "Failed to play audio segment",
        variant: "destructive",
      });
    }
  }, [audioPlayer, duration, formatTime, toast]);

  // Audio file upload mutation
  const audioUploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/chapters/${chapterId}/audio`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "Upload failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Audio uploaded successfully",
        description: `File: ${data.filename}, Duration: ${Math.round(data.duration)}s`,
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/chapters/${chapterId}/audio`],
      });
    },
    onError: (error: any) => {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update audio file mutation
  const updateAudioFileMutation = useMutation({
    mutationFn: async ({ id, filename }: { id: number; filename: string }) => {
      await apiRequest("PATCH", `/api/audio/${id}`, { filename });
    },
    onSuccess: () => {
      toast({ title: "Audio file updated successfully" });
      setEditingFileId(null);
      setEditingFileName("");
      queryClient.invalidateQueries({
        queryKey: [`/api/chapters/${chapterId}/audio`],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update audio file",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete audio file mutation
  const deleteAudioFileMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/audio/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Audio file deleted successfully" });
      queryClient.invalidateQueries({
        queryKey: [`/api/chapters/${chapterId}/audio`],
      });
      setSelectedAudioFile(null);
      setAudioPlayer(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete audio file",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create audio segments mutation
  const createAudioSegmentsMutation = useMutation({
    mutationFn: async (audioFileId: number) => {
      const segments = [];
      for (let i = 0; i < timeMarks.length - 1; i++) {
        segments.push({
          audioFileId,
          startTime: timeMarks[i],
          endTime: timeMarks[i + 1],
          name: `Segment ${i + 1}`,
        });
      }

      await apiRequest("POST", `/api/audio/${audioFileId}/segments`, { segments });
    },
    onSuccess: () => {
      toast({
        title: "Audio segments created successfully",
        description: `Created ${timeMarks.length - 1} segments`,
      });
      setTimeMarks([]);
      setSelectedMark(null);
      queryClient.invalidateQueries({
        queryKey: [`/api/audio/${selectedAudioFile?.id}/segments`],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create audio segments",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update media segment mutation
  const updateMediaSegmentMutation = useMutation({
    mutationFn: async ({ id, startTime, endTime }: { id: number; startTime: number; endTime: number }) => {
      await apiRequest("PATCH", `/api/media-segments/${id}`, {
        startTime,
        endTime,
      });
    },
    onSuccess: () => {
      toast({ title: "Segment updated successfully" });
      setEditingSegmentId(null);
      setEditingSegmentData(null);
      queryClient.invalidateQueries({
        queryKey: [`/api/audio/${selectedAudioFile?.id}/segments`],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update segment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete media segment mutation
  const deleteMediaSegmentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/media-segments/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Segment deleted successfully" });
      queryClient.invalidateQueries({
        queryKey: [`/api/audio/${selectedAudioFile?.id}/segments`],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete segment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize audio player when audio file is selected
  useEffect(() => {
    if (selectedAudioFile && audioRef.current) {
      const audio = audioRef.current;
      audio.src = selectedAudioFile.url;
      setAudioPlayer(audio);
      setDuration(selectedAudioFile.duration);

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
    }
  }, [selectedAudioFile, audioRef]);

  // Handle dragging for timeline
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !audioPlayer) return;
    // Timeline dragging logic would go here
  }, [isDragging, audioPlayer]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Audio control functions
  const togglePlayPause = () => {
    if (audioPlayer) {
      if (isPlaying) {
        audioPlayer.pause();
        setIsPlaying(false);
      } else {
        audioPlayer.play();
        setIsPlaying(true);
      }
    }
  };

  const stopAudio = () => {
    if (audioPlayer) {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const addTimeMark = () => {
    if (audioPlayer) {
      const newMark = audioPlayer.currentTime;
      setTimeMarks((prev) => [...prev, newMark].sort((a, b) => a - b));
      toast({
        title: "Time Mark Added",
        description: `Mark added at ${formatTime(newMark)}`,
      });
    }
  };

  const clearSelectedMark = () => {
    if (selectedMark !== null) {
      setTimeMarks((prev) => prev.filter((mark) => mark !== selectedMark));
      setSelectedMark(null);
      toast({
        title: "Time Mark Cleared",
        description: "Selected mark has been removed",
      });
    } else {
      toast({
        title: "No Mark Selected",
        description: "Please select a mark on the timeline first",
        variant: "destructive",
      });
    }
  };

  const clearAllMarks = () => {
    setTimeMarks([]);
    setSelectedMark(null);
    toast({
      title: "All Marks Cleared",
      description: "All time marks have been removed",
    });
  };

  const createAudioSegments = () => {
    if (!selectedAudioFile || timeMarks.length < 2) {
      toast({
        title: "Cannot Create Segments",
        description: "Need at least 2 time marks to create segments",
        variant: "destructive",
      });
      return;
    }
    createAudioSegmentsMutation.mutate(selectedAudioFile.id);
  };

  return {
    // State
    selectedAudioFile,
    audioPlayer,
    isPlaying,
    currentTime,
    duration,
    timeMarks,
    selectedMark,
    isDragging,
    editingTimestamp,
    isDragOver,
    editingSegmentId,
    editingSegmentData,
    editingFileName,
    editingFileId,
    selectedMediaSegment,
    mediaSegmentName,
    startTime,
    endTime,

    // Actions
    setSelectedAudioFile,
    setIsPlaying,
    setCurrentTime,
    setTimeMarks,
    setSelectedMark,
    setIsDragging,
    setEditingTimestamp,
    setIsDragOver,
    setEditingSegmentId,
    setEditingSegmentData,
    setEditingFileName,
    setEditingFileId,
    setSelectedMediaSegment,
    setMediaSegmentName,
    setStartTime,
    setEndTime,

    // Functions
    formatTime,
    playAudioSegment,
    togglePlayPause,
    stopAudio,
    addTimeMark,
    clearSelectedMark,
    clearAllMarks,
    createAudioSegments,

    // Mutations
    audioUploadMutation,
    updateAudioFileMutation,
    deleteAudioFileMutation,
    createAudioSegmentsMutation,
    updateMediaSegmentMutation,
    deleteMediaSegmentMutation,
  };
}