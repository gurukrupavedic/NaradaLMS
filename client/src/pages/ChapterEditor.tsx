import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, Upload, Music, Eye, ChevronLeft, Play, Pause, Square, 
  MapPin, X, Trash2, Plus, ArrowRight, Save, Edit2, Link2, Clock, Edit, Timer, Ruler
} from "lucide-react";
import { useLocation } from "wouter";

interface ChapterData {
  id: number;
  trackId: number;
  title: string;
  status: "draft" | "published";
  content: {
    te?: string;
    hi?: string;
    en?: string;
  };
  audioFiles?: Array<{
    id: number;
    filename: string;
    duration: number;
    url: string;
  }>;
  segments?: Array<{
    id: number;
    audioFileId: number;
    startTime: number;
    endTime: number;
    textStart: number;
    textEnd: number;
    language: string;
  }>;
}

interface TextSegment {
  id: number;
  chapterId: number;
  conceptualName: string;
  textReferences: {
    te?: { start: number; end: number };
    hi?: { start: number; end: number };
    en?: { start: number; end: number };
  };
  startTime?: number;
  endTime?: number;
  audioFileId?: number;
}

export default function ChapterEditor() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const audioRef = useRef<HTMLAudioElement>(null);

  // Safe time formatting function
  const formatTime = (seconds: number): string => {
    if (!seconds || seconds < 0 || !isFinite(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Safe audio playback function for segments
  const playAudioSegment = (segment: any) => {
    if (!audioPlayer) {
      toast({
        title: "Audio Not Ready",
        description: "Please wait for audio to load",
        variant: "destructive"
      });
      return;
    }

    const startTime = segment.startTimestamp || segment.startTime || 0;
    
    // Validate timestamp
    if (typeof startTime !== 'number' || !isFinite(startTime) || startTime < 0) {
      console.warn('Invalid start time for segment:', segment);
      toast({
        title: "Invalid Timestamp", 
        description: "This segment has an invalid start time",
        variant: "destructive"
      });
      return;
    }

    try {
      audioPlayer.currentTime = startTime;
      setCurrentTime(startTime);
      if (!isPlaying) {
        audioPlayer.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing segment:', error);
      toast({
        title: "Playback Error",
        description: "Failed to play audio segment", 
        variant: "destructive"
      });
    }
  };

  // State management
  const [textContent, setTextContent] = useState({
    te: "",
    hi: "",
    en: ""
  });
  
  // Audio and segmentation state
  const [selectedAudioFile, setSelectedAudioFile] = useState<any | null>(null);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [timeMarks, setTimeMarks] = useState<number[]>([]);
  const [selectedMark, setSelectedMark] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingTimestamp, setEditingTimestamp] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const timelineRef = useRef<HTMLInputElement>(null);
  const [editingFileId, setEditingFileId] = useState<number | null>(null);
  
  // Audio segment editing state
  const [editingSegmentId, setEditingSegmentId] = useState<number | null>(null);
  const [editingSegmentData, setEditingSegmentData] = useState<{
    startTime: string;
    endTime: string;
  } | null>(null);

  // Helper functions for drag operations
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !selectedMark || !timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * duration;
    
    setTimeMarks(prev => 
      prev.map(mark => mark === selectedMark ? newTime : mark).sort((a, b) => a - b)
    );
    setSelectedMark(newTime);
  }, [isDragging, selectedMark, duration]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const updateMarkTimestamp = (oldMark: number, newTimestamp: string) => {
    const [minutes, seconds] = newTimestamp.split(':').map(Number);
    if (isNaN(minutes) || isNaN(seconds) || minutes < 0 || seconds < 0 || seconds >= 60) {
      toast({
        title: "Invalid Timestamp",
        description: "Please enter a valid timestamp in MM:SS format",
        variant: "destructive"
      });
      return;
    }
    
    const newTime = minutes * 60 + seconds;
    if (newTime > duration) {
      toast({
        title: "Timestamp Too Large",
        description: "Timestamp cannot exceed audio duration",
        variant: "destructive"
      });
      return;
    }
    
    setTimeMarks(prev => 
      prev.map(mark => mark === oldMark ? newTime : mark).sort((a, b) => a - b)
    );
    setSelectedMark(newTime);
    setEditingTimestamp(null);
    
    toast({
      title: "Timestamp Updated",
      description: `Mark updated to ${Math.floor(newTime / 60)}:${Math.floor(newTime % 60).toString().padStart(2, '0')}`
    });
  };

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Cleanup audio player on unmount
  useEffect(() => {
    return () => {
      if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.removeEventListener('loadedmetadata', () => {});
        audioPlayer.removeEventListener('timeupdate', () => {});
        audioPlayer.removeEventListener('error', () => {});
        setAudioPlayer(null);
      }
    };
  }, [audioPlayer]);
  const [editingFileName, setEditingFileName] = useState("");



  // Media segmentation state
  const [selectedMediaSegment, setSelectedMediaSegment] = useState<any>(null);
  const [selectedTextSegment, setSelectedTextSegment] = useState<any>(null);
  const [mediaSegmentName, setMediaSegmentName] = useState("");
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  
  // Text segmentation state
  const [selectedLanguage, setSelectedLanguage] = useState<'te' | 'hi' | 'en'>('te');
  const [textSelection, setTextSelection] = useState<{start: number; end: number; text: string} | null>(null);
  const [segmentName, setSegmentName] = useState("");
  const [showTextSegmentation, setShowTextSegmentation] = useState(false);

  // Content editor language state
  const [contentLanguage, setContentLanguage] = useState<'te' | 'hi' | 'en'>('te');

  // Helper functions for segment editing
  const startEditingSegment = (segment: any) => {
    const startTime = segment.startTimestamp || segment.startTime || 0;
    const endTime = segment.endTimestamp || segment.endTime || 0;
    
    setEditingSegmentId(segment.id);
    setEditingSegmentData({
      startTime: formatTime(startTime),
      endTime: formatTime(endTime)
    });
  };

  const cancelEditingSegment = () => {
    setEditingSegmentId(null);
    setEditingSegmentData(null);
  };

  const saveSegmentEdit = () => {
    if (!editingSegmentData || editingSegmentId === null) return;

    // Parse start time
    const [startMin, startSec] = editingSegmentData.startTime.split(':').map(Number);
    if (isNaN(startMin) || isNaN(startSec)) {
      toast({
        title: "Invalid Start Time",
        description: "Please enter a valid start time in MM:SS format",
        variant: "destructive"
      });
      return;
    }
    const startTime = startMin * 60 + startSec;

    // Parse end time
    const [endMin, endSec] = editingSegmentData.endTime.split(':').map(Number);
    if (isNaN(endMin) || isNaN(endSec)) {
      toast({
        title: "Invalid End Time",
        description: "Please enter a valid end time in MM:SS format",
        variant: "destructive"
      });
      return;
    }
    const endTime = endMin * 60 + endSec;

    // Validate times
    if (startTime >= endTime) {
      toast({
        title: "Invalid Time Range",
        description: "Start time must be before end time",
        variant: "destructive"
      });
      return;
    }

    if (endTime > duration) {
      toast({
        title: "Time Exceeds Duration",
        description: "End time cannot exceed audio duration",
        variant: "destructive"
      });
      return;
    }

    updateMediaSegmentMutation.mutate({
      id: editingSegmentId,
      startTime,
      endTime
    });
  };

  const deleteSegment = (segmentId: number) => {
    if (window.confirm("Are you sure you want to delete this segment? This action cannot be undone.")) {
      deleteMediaSegmentMutation.mutate(segmentId);
    }
  };

  // Chapter status toggle mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (newStatus: 'draft' | 'published') => {
      await apiRequest("PATCH", `/api/admin/chapters/${chapterId}/status`, { status: newStatus });
    },
    onSuccess: () => {
      toast({ title: "Chapter status updated successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/chapters/${chapterId}/details`] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update chapter status", description: error.message, variant: "destructive" });
    },
  });

  // Fetch chapter details
  const { data: chapter, isLoading: chapterLoading } = useQuery<ChapterData>({
    queryKey: [`/api/admin/chapters/${chapterId}/details`],
    enabled: !!chapterId,
  });

  // Fetch audio files
  const { data: audioFiles, refetch: refetchAudioFiles } = useQuery<any[]>({
    queryKey: [`/api/admin/audio-files/${chapterId}`],
    enabled: !!chapterId,
  });

  // Fetch segments
  const { data: segments } = useQuery<TextSegment[]>({
    queryKey: [`/api/admin/segments/${chapterId}`],
    enabled: !!chapterId,
  });

  // Fetch media segments for selected audio file
  const selectedAudioFileId = typeof selectedAudioFile === 'object' ? selectedAudioFile?.id : selectedAudioFile;
  const { data: mediaSegments } = useQuery({
    queryKey: [`/api/admin/media-segments/${selectedAudioFileId}`],
    enabled: !!selectedAudioFileId,
  });

  const isPublished = chapter?.status === "published";

  // Initialize text content when chapter loads
  useEffect(() => {
    if (chapter?.content) {
      setTextContent({
        te: chapter.content.te || "",
        hi: chapter.content.hi || "",
        en: chapter.content.en || ""
      });
    }
  }, [chapter]);

  // Audio file upload mutation
  const audioUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("audio", file);
      
      const response = await fetch(`/api/admin/audio-files/${chapterId}/upload`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Audio file uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/audio-files/${chapterId}`] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to upload audio file", description: error.message, variant: "destructive" });
    },
  });

  // Update media segment mutation
  const updateMediaSegmentMutation = useMutation({
    mutationFn: async ({ id, startTime, endTime }: { id: number; startTime: number; endTime: number }) => {
      await apiRequest("PATCH", `/api/admin/media-segments/${id}`, {
        startTimestamp: startTime,
        endTimestamp: endTime
      });
    },
    onSuccess: () => {
      toast({ title: "Segment updated successfully" });
      setEditingSegmentId(null);
      setEditingSegmentData(null);
      if (selectedAudioFile?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/admin/media-segments/${selectedAudioFile.id}`] });
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update segment", 
        description: error.message || "Unknown error occurred", 
        variant: "destructive" 
      });
    },
  });

  // Delete media segment mutation
  const deleteMediaSegmentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/media-segments/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Segment deleted successfully" });
      if (selectedAudioFile?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/admin/media-segments/${selectedAudioFile.id}`] });
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete segment", 
        description: error.message || "Unknown error occurred", 
        variant: "destructive" 
      });
    },
  });

  // Content update mutation
  const updateContentMutation = useMutation({
    mutationFn: async (content: any) => {
      await apiRequest("PATCH", `/api/admin/chapters/${chapterId}`, { content });
    },
    onSuccess: () => {
      toast({ title: "Content updated successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/chapters/${chapterId}/details`] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update content", description: error.message, variant: "destructive" });
    },
  });

  // Create audio segments from marks mutation
  const createAudioSegmentsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAudioFile || timeMarks.length === 0) {
        throw new Error("No audio file selected or no time marks");
      }

      const segments = [];
      const sortedMarks = [...timeMarks].sort((a, b) => a - b);
      
      // Create segments from start to each mark, and between marks
      for (let i = 0; i <= sortedMarks.length; i++) {
        const startTime = i === 0 ? 0 : sortedMarks[i - 1];
        const endTime = i === sortedMarks.length ? duration : sortedMarks[i];
        
        segments.push({
          audioFileId: typeof selectedAudioFile === 'object' ? selectedAudioFile.id : selectedAudioFile,
          startTime,
          endTime,
          name: `Segment ${i + 1}`
        });
      }

      const response = await apiRequest("POST", "/api/admin/media-segments/bulk", { segments });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/media-segments/${selectedAudioFileId}`] });
      setTimeMarks([]);
      setSelectedMark(null);
      toast({
        title: "Audio Segments Created",
        description: `Successfully created ${timeMarks.length + 1} audio segments`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Segments",
        description: error.message || "Failed to create audio segments",
        variant: "destructive"
      });
    }
  });

  // Delete audio file mutation
  const deleteAudioMutation = useMutation({
    mutationFn: async (fileId: number) => {
      await apiRequest("DELETE", `/api/admin/audio-files/${fileId}`);
      return fileId;
    },
    onSuccess: (deletedFileId) => {
      toast({ title: "Audio file deleted successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/audio-files/${chapterId}`] });
      if (selectedAudioFile === deletedFileId) {
        setSelectedAudioFile(null);
        setAudioPlayer(null);
        setIsPlaying(false);
      }
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete audio file", description: error.message, variant: "destructive" });
    },
  });

  // Update filename mutation
  const updateFileNameMutation = useMutation({
    mutationFn: async ({ fileId, newName }: { fileId: number; newName: string }) => {
      await apiRequest("PATCH", `/api/admin/audio-files/${fileId}`, { displayName: newName });
    },
    onSuccess: () => {
      toast({ title: "Filename updated successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/audio-files/${chapterId}`] });
      setEditingFileId(null);
      setEditingFileName("");
    },
    onError: (error: any) => {
      toast({ title: "Failed to update filename", description: error.message, variant: "destructive" });
    },
  });

  // Audio control functions
  const handlePlayPause = async () => {
    if (!audioPlayer) return;
    
    try {
      if (isPlaying) {
        audioPlayer.pause();
        setIsPlaying(false);
      } else {
        await audioPlayer.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Audio play error:", error);
      setIsPlaying(false);
      toast({
        title: "Playback Error",
        description: "Failed to play audio. Please check the file format.",
        variant: "destructive",
      });
    }
  };

  const handleStop = () => {
    if (!audioPlayer) return;
    
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleMarkTime = () => {
    if (!audioPlayer) return;
    
    const markTime = audioPlayer.currentTime;
    setTimeMarks(prev => [...prev, markTime].sort((a, b) => a - b));
    toast({ title: `Time mark added at ${formatTime(markTime)}` });
  };

  const handleClearMark = () => {
    if (selectedMark === null) return;
    
    setTimeMarks(prev => prev.filter(mark => mark !== selectedMark));
    setSelectedMark(null);
    toast({ title: "Time mark cleared" });
  };

  const handleClearAllMarks = () => {
    setTimeMarks([]);
    setSelectedMark(null);
    toast({ title: "All time marks cleared" });
  };



  const handleCreateAudioSegments = () => {
    if (timeMarks.length === 0) {
      toast({
        title: "No Time Marks",
        description: "Please add time marks to create segments",
        variant: "destructive"
      });
      return;
    }
    createAudioSegmentsMutation.mutate();
  };

  // Audio file selection and setup
  const handleAudioFileSelect = (fileId: number) => {
    setSelectedAudioFile(fileId);
    setTimeMarks([]);
    setSelectedMark(null);
    setCurrentTime(0);
    setIsPlaying(false);
    
    const file = (audioFiles as any)?.find((f: any) => f.id === fileId);
    if (file && audioRef.current) {
      audioRef.current.src = file.url;
      audioRef.current.load();
      setAudioPlayer(audioRef.current);
    }
  };

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const validateFileType = (file: File) => {
    const allowedTypes = ['audio/', 'video/'];
    if (!allowedTypes.some(type => file.type.startsWith(type))) {
      toast({ 
        title: "Invalid file type", 
        description: "Please upload audio or video files only", 
        variant: "destructive" 
      });
      return false;
    }
    return true;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && validateFileType(file)) {
      audioUploadMutation.mutate(file);
    }
  };

  const startEditing = (fileId: number, currentName: string) => {
    setEditingFileId(fileId);
    setEditingFileName(currentName);
  };

  const cancelEditing = () => {
    setEditingFileId(null);
    setEditingFileName("");
  };

  const handleSaveFileName = (fileId: number) => {
    if (editingFileName.trim()) {
      updateFileNameMutation.mutate({ fileId, newName: editingFileName.trim() });
    }
  };

  const handleContentSave = (language: string) => {
    updateContentMutation.mutate({
      ...chapter?.content,
      [language]: textContent[language as keyof typeof textContent]
    });
  };

  // Text segmentation functions
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    let element: Element | null = null;
    
    if (container.nodeType === Node.TEXT_NODE) {
      element = container.parentElement;
    } else if (container.nodeType === Node.ELEMENT_NODE) {
      element = container as Element;
    }
    
    if (!element?.closest('[data-segmentable]')) return;

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    // Calculate character positions within the full text
    const fullText = textContent[selectedLanguage] || "";
    const beforeText = range.startContainer.textContent?.substring(0, range.startOffset) || "";
    const startPos = fullText.indexOf(beforeText + selectedText.charAt(0));
    const endPos = startPos + selectedText.length;

    setTextSelection({
      start: startPos,
      end: endPos,
      text: selectedText
    });

    setSegmentName(`${selectedText.substring(0, 30)}${selectedText.length > 30 ? '...' : ''}`);
  };

  const createTextSegmentMutation = useMutation({
    mutationFn: async (segmentData: {
      chapterId: number;
      conceptualName: string;
      textReferences: Record<string, { start: number; end: number }>;
    }) => {
      return await apiRequest("POST", "/api/admin/segments", segmentData);
    },
    onSuccess: () => {
      toast({ title: "Text segment created successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/segments/${chapterId}`] });
      setTextSelection(null);
      setSegmentName("");
    },
    onError: (error: any) => {
      toast({ title: "Failed to create text segment", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateTextSegment = () => {
    if (!textSelection || !segmentName.trim()) {
      toast({ title: "Please select text and provide a segment name", variant: "destructive" });
      return;
    }

    createTextSegmentMutation.mutate({
      chapterId: parseInt(chapterId!),
      conceptualName: segmentName.trim(),
      textReferences: {
        [selectedLanguage]: {
          start: textSelection.start,
          end: textSelection.end
        }
      }
    });
  };

  const deleteSegmentMutation = useMutation({
    mutationFn: async (segmentId: number) => {
      return await apiRequest("DELETE", `/api/admin/segments/${segmentId}`);
    },
    onSuccess: () => {
      toast({ title: "Segment deleted successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/segments/${chapterId}`] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete segment", description: error.message, variant: "destructive" });
    },
  });

  const createAudioMappingMutation = useMutation({
    mutationFn: async (mappingData: {
      audioFileId: number;
      segmentId: number;
      startTime: number;
      endTime: number;
    }) => {
      return await apiRequest("POST", "/api/admin/mappings", mappingData);
    },
    onSuccess: () => {
      toast({ title: "Audio mapping created successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/segments/${chapterId}`] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create audio mapping", description: error.message, variant: "destructive" });
    },
  });

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
      setMediaSegmentName("");
      setStartTime(0);
      setEndTime(0);
    },
  });

  // Fetch media segments for selected audio file
  const { data: mediaSegmentsData = [] } = useQuery({
    queryKey: ["/api/admin/media-segments", selectedAudioFile?.id],
    enabled: !!selectedAudioFile?.id,
  });



  // Enhanced segment rendering with text highlighting
  const renderTextWithSegments = (text: string, language: 'te' | 'hi' | 'en') => {
    if (!segments || segments.length === 0) {
      return <div data-segmentable className="whitespace-pre-wrap cursor-text" onMouseUp={handleTextSelection}>{text}</div>;
    }

    const segmentsForLang = segments.filter(seg => seg.textReferences[language]);
    if (segmentsForLang.length === 0) {
      return <div data-segmentable className="whitespace-pre-wrap cursor-text" onMouseUp={handleTextSelection}>{text}</div>;
    }

    // Sort segments by start position
    const sortedSegments = segmentsForLang.sort((a, b) => 
      (a.textReferences[language]?.start || 0) - (b.textReferences[language]?.start || 0)
    );

    const parts = [];
    let lastEnd = 0;

    sortedSegments.forEach((segment, index) => {
      const ref = segment.textReferences[language];
      if (!ref) return;

      // Add text before this segment
      if (ref.start > lastEnd) {
        parts.push(
          <span key={`before-${index}`} className="cursor-text">
            {text.substring(lastEnd, ref.start)}
          </span>
        );
      }

      // Add the segmented text with highlighting
      const hasAudioMapping = segment.audioFileId && segment.startTime !== undefined;
      parts.push(
        <span
          key={`segment-${segment.id}`}
          className={`px-1 py-0.5 rounded cursor-pointer transition-colors ${
            hasAudioMapping 
              ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700' 
              : 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700'
          } hover:opacity-80`}
          title={`${segment.conceptualName}${hasAudioMapping ? ' (Audio Mapped)' : ' (No Audio)'}`}
          onClick={() => {
            if (hasAudioMapping && audioPlayer && segment.startTime !== undefined) {
              audioPlayer.currentTime = segment.startTime;
              audioPlayer.play();
              setIsPlaying(true);
            }
          }}
        >
          {text.substring(ref.start, ref.end)}
        </span>
      );

      lastEnd = ref.end;
    });

    // Add remaining text
    if (lastEnd < text.length) {
      parts.push(
        <span key="after" className="cursor-text">
          {text.substring(lastEnd)}
        </span>
      );
    }

    return (
      <div data-segmentable className="whitespace-pre-wrap" onMouseUp={handleTextSelection}>
        {parts}
      </div>
    );
  };

  if (chapterLoading) {
    return <div className="p-6">Loading chapter...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <audio ref={audioRef} preload="metadata" />
      
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => {
                // Get the track ID from the chapter data
                if (chapter?.trackId) {
                  // Invalidate chapters query to refresh data
                  queryClient.invalidateQueries({ queryKey: [`/api/admin/chapters/${chapter.trackId}`] });
                  // Navigate to content management track page
                  setLocation(`/content-management/track/${chapter.trackId}`);
                } else {
                  // Fallback to content management dashboard if no track ID
                  setLocation('/content-management');
                }
              }}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Chapters
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{chapter?.title}</h1>
                <p className="text-sm text-muted-foreground">
                  Status: <span className={`capitalize ${chapter?.status === 'published' ? 'text-green-600' : 'text-orange-600'}`}>
                    {chapter?.status}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant={chapter?.status === 'published' ? 'destructive' : 'default'}
                  onClick={() => {
                    const newStatus = chapter?.status === 'published' ? 'draft' : 'published';
                    toggleStatusMutation.mutate(newStatus);
                  }}
                  disabled={toggleStatusMutation.isPending}
                >
                  {chapter?.status === 'published' ? 'Unpublish' : 'Publish'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="content" className="space-y-6">
          <TabsList>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Text Content
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Media Content
            </TabsTrigger>
            <TabsTrigger value="segmentation" className="flex items-center gap-2">
              <Music className="w-4 h-4" />
              Segmentation & Mapping
            </TabsTrigger>

          </TabsList>

          {/* Text Content Tab */}
          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <CardTitle>Text Content Editor</CardTitle>
                    <Select value={contentLanguage} onValueChange={(value: 'te' | 'hi' | 'en') => setContentLanguage(value)}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="te">తెలుగు (Telugu)</SelectItem>
                        <SelectItem value="hi">देवनागरी (Hindi)</SelectItem>
                        <SelectItem value="en">English/IAST</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => handleContentSave(contentLanguage)}
                    disabled={updateContentMutation.isPending || isPublished}
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save {contentLanguage === 'te' ? 'Telugu' : contentLanguage === 'hi' ? 'Hindi' : 'English/IAST'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={textContent[contentLanguage]}
                  onChange={(e) => setTextContent(prev => ({ ...prev, [contentLanguage]: e.target.value }))}
                  disabled={isPublished}
                  placeholder={`Enter ${contentLanguage === 'te' ? 'Telugu' : contentLanguage === 'hi' ? 'Hindi' : 'English/IAST'} content...`}
                  className="min-h-[400px] text-base leading-relaxed"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Media Content Tab */}
          <TabsContent value="media" className="space-y-6">
            <Card>
              <CardContent>
                <div className="space-y-4">
                  {!isPublished && (
                    <div 
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        isDragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOver(false);
                        const files = Array.from(e.dataTransfer.files);
                        if (files.length > 0) {
                          const file = files[0];
                          if (validateFileType(file)) {
                            audioUploadMutation.mutate(file);
                          }
                        }
                      }}
                    >
                      <Upload className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Upload Audio Files</p>
                        <p className="text-xs text-muted-foreground">
                          Drag and drop files here, or click to browse
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Supports: MP3, WAV, M4A, MP4, and other audio/video formats
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="mt-2"
                        onClick={() => document.getElementById('audio-upload-input')?.click()}
                        disabled={audioUploadMutation.isPending}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Browse Files
                      </Button>
                      <input
                        id="audio-upload-input"
                        type="file"
                        accept="audio/*,video/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={audioUploadMutation.isPending}
                      />
                    </div>
                  )}

                  {audioFiles && Array.isArray(audioFiles) && audioFiles.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        Uploaded Files ({audioFiles.length})
                      </h4>
                      
                      {(audioFiles as any).map((file: any) => (
                        <div key={file.id} className="group border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              {editingFileId === file.id ? (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={editingFileName}
                                    onChange={(e) => setEditingFileName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleSaveFileName(file.id);
                                      } else if (e.key === 'Escape') {
                                        cancelEditing();
                                      }
                                    }}
                                    className="w-full px-2 py-1 text-sm border rounded"
                                    autoFocus
                                  />
                                  <div className="flex gap-2">
                                    <Button 
                                      size="sm" 
                                      onClick={() => handleSaveFileName(file.id)}
                                      disabled={updateFileNameMutation.isPending}
                                    >
                                      <Save className="w-3 h-3 mr-1" />
                                      Save
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      onClick={cancelEditing}
                                    >
                                      <X className="w-3 h-3 mr-1" />
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2">
                                    <Music className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                    <p className="font-medium text-sm truncate">
                                      {file.displayName || file.filename}
                                    </p>
                                  </div>
                                  <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                                    <span>Duration: {file.duration ? `${file.duration.toFixed(2)}s` : 'Unknown'}</span>
                                    <span>Size: {file.fileSize ? `${(file.fileSize / (1024 * 1024)).toFixed(1)} MB` : 'Unknown'}</span>
                                  </div>
                                </>
                              )}
                            </div>
                            
                            {!isPublished && editingFileId !== file.id && (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditing(file.id, file.displayName || file.filename)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteAudioMutation.mutate(file.id)}
                                  disabled={deleteAudioMutation.isPending}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-medium mb-2">No Audio Files</h3>
                        <p className="text-muted-foreground">
                          Upload audio files to start creating segments for this chapter.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Segmentation & Mapping Tab */}
          <TabsContent value="segmentation" className="space-y-6">
            {/* Shared Audio File Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  Audio File Selection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Select Audio File for Segmentation</Label>
                  <Select
                    value={selectedAudioFile?.id?.toString() || ""}
                    onValueChange={(value) => {
                      const file = audioFiles && Array.isArray(audioFiles) 
                        ? audioFiles.find((f: any) => f.id.toString() === value)
                        : null;
                      setSelectedAudioFile(file);
                      
                      // Load the audio file for playback
                      if (file && file.filename) {
                        // Clean up existing audio player
                        if (audioPlayer) {
                          audioPlayer.pause();
                          audioPlayer.removeEventListener('loadedmetadata', () => {});
                          audioPlayer.removeEventListener('timeupdate', () => {});
                        }
                        
                        const audio = new Audio(`/uploads/${file.filename}`);
                        audio.addEventListener('loadedmetadata', () => {
                          setDuration(audio.duration);
                          setCurrentTime(0);
                          setIsPlaying(false);
                          console.log('Audio loaded successfully');
                        });
                        audio.addEventListener('error', (e) => {
                          console.error('Audio loading error:', e);
                          toast({
                            title: "Audio Load Error",
                            description: "Failed to load audio file",
                            variant: "destructive"
                          });
                        });
                        setAudioPlayer(audio);
                      }
                      
                      // Refresh media segments for the selected audio file
                      if (file?.id) {
                        queryClient.invalidateQueries({ queryKey: [`/api/admin/media-segments/${file.id}`] });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an audio file" />
                    </SelectTrigger>
                    <SelectContent>
                      {audioFiles && Array.isArray(audioFiles) && audioFiles.map((file: any) => (
                        <SelectItem key={file.id} value={file.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Music className="h-4 w-4" />
                            {file.displayName || file.filename}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedAudioFile && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Selected: {selectedAudioFile.displayName || selectedAudioFile.filename}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Audio Segmentation Panel */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Music className="h-5 w-5" />
                    Audio Segmentation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedAudioFile && (
                    <>
                      {/* Audio Player */}
                      <div className="space-y-4">
                        <audio
                          ref={audioRef}
                          src={`/uploads/${selectedAudioFile.hashedFilename || selectedAudioFile.filename}`}
                          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
                          onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
                          onEnded={() => setIsPlaying(false)}
                          onError={(e) => {
                            console.error("Audio play error:", e, "Trying path:", `/uploads/${selectedAudioFile.hashedFilename || selectedAudioFile.filename}`);
                            toast({ 
                              title: "Audio Playback Error", 
                              description: "Failed to play audio. Please check the file format and path.", 
                              variant: "destructive" 
                            });
                          }}
                          onCanPlayThrough={() => {
                            console.log("Audio loaded successfully");
                          }}
                          crossOrigin="anonymous"
                          preload="metadata"
                        />
                        
                        {/* Time Display */}
                        <div className="text-center">
                          <span className="text-sm font-mono">
                            {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} / 
                            {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
                          </span>
                        </div>

                        {/* Timeline */}
                        <div className="space-y-2">
                          <div className="relative mb-8">
                            <input
                              ref={timelineRef}
                              type="range"
                              min="0"
                              max={duration || 0}
                              value={currentTime}
                              onChange={(e) => {
                                if (audioRef.current) {
                                  audioRef.current.currentTime = parseFloat(e.target.value);
                                  setCurrentTime(parseFloat(e.target.value));
                                }
                              }}
                              className="w-full"
                            />
                            {/* Time Mark Triangles */}
                            {timeMarks.map((mark, index) => {
                              const position = (mark / duration) * 100;
                              const timestamp = `${Math.floor(mark / 60)}:${Math.floor(mark % 60).toString().padStart(2, '0')}`;
                              return (
                                <div
                                  key={index}
                                  className="absolute top-full flex flex-col items-center"
                                  style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
                                >
                                  {/* Triangle pointing up */}
                                  <div 
                                    className={`w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] cursor-pointer ${
                                      selectedMark === mark 
                                        ? 'border-l-transparent border-r-transparent border-b-red-500 hover:border-b-red-600' 
                                        : 'border-l-transparent border-r-transparent border-b-green-500 hover:border-b-green-600'
                                    } transition-colors ${isDragging && selectedMark === mark ? 'cursor-grabbing' : 'cursor-grab'}`}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      setSelectedMark(mark);
                                      setIsDragging(true);
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isDragging) {
                                        setSelectedMark(selectedMark === mark ? null : mark);
                                        if (audioRef.current) {
                                          audioRef.current.currentTime = mark;
                                          setCurrentTime(mark);
                                        }
                                      }
                                    }}
                                    title={`Mark at ${timestamp} - Click to select, drag to move`}
                                  />
                                  {/* Editable Timestamp label */}
                                  {editingTimestamp === mark ? (
                                    <input
                                      type="text"
                                      defaultValue={timestamp}
                                      className="text-xs mt-1 font-mono w-12 text-center border rounded px-1"
                                      autoFocus
                                      onBlur={(e) => {
                                        updateMarkTimestamp(mark, e.target.value);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          updateMarkTimestamp(mark, e.currentTarget.value);
                                        } else if (e.key === 'Escape') {
                                          setEditingTimestamp(null);
                                        }
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  ) : (
                                    <div 
                                      className={`text-xs mt-1 font-mono cursor-pointer hover:underline ${
                                        selectedMark === mark ? 'text-red-600 font-semibold' : 'text-green-600'
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingTimestamp(mark);
                                      }}
                                      title="Click to edit timestamp"
                                    >
                                      {timestamp}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Player Controls */}
                        <div className="flex items-center gap-2">
                          <Button onClick={() => {
                            if (audioRef.current) {
                              if (isPlaying) {
                                audioRef.current.pause();
                              } else {
                                audioRef.current.play();
                              }
                              setIsPlaying(!isPlaying);
                            }
                          }} size="sm">
                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <Button 
                            onClick={() => {
                              if (audioRef.current) {
                                audioRef.current.pause();
                                audioRef.current.currentTime = 0;
                                setIsPlaying(false);
                                setCurrentTime(0);
                              }
                            }}
                            size="sm" 
                            variant="outline"
                          >
                            <Square className="h-4 w-4" />
                          </Button>
                          <Button 
                            onClick={() => {
                              if (audioRef.current) {
                                const newMark = audioRef.current.currentTime;
                                setTimeMarks(prev => [...prev, newMark].sort((a, b) => a - b));
                                toast({
                                  title: "Time Mark Added",
                                  description: `Mark added at ${Math.floor(newMark / 60)}:${Math.floor(newMark % 60).toString().padStart(2, '0')}`
                                });
                              }
                            }}
                            size="sm" 
                            variant="outline"
                          >
                            <MapPin className="h-4 w-4" />
                          </Button>
                          <Button 
                            onClick={() => {
                              if (selectedMark !== null) {
                                setTimeMarks(prev => prev.filter(mark => mark !== selectedMark));
                                setSelectedMark(null);
                                toast({
                                  title: "Time Mark Cleared",
                                  description: "Selected mark has been removed"
                                });
                              } else {
                                toast({
                                  title: "No Mark Selected",
                                  description: "Please select a mark on the timeline first",
                                  variant: "destructive"
                                });
                              }
                            }}
                            size="sm" 
                            variant="outline"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button 
                            onClick={() => {
                              setTimeMarks([]);
                              setSelectedMark(null);
                              toast({
                                title: "All Marks Cleared",
                                description: "All time marks have been removed"
                              });
                            }}
                            size="sm" 
                            variant="outline"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Create Segments Button */}
                        {timeMarks.length > 0 && (
                          <div className="mt-4 flex justify-center">
                            <Button 
                              onClick={handleCreateAudioSegments}
                              disabled={createAudioSegmentsMutation.isPending || isPublished}
                              className="flex items-center gap-2"
                            >
                              <Clock className="h-4 w-4" />
                              {createAudioSegmentsMutation.isPending ? 'Creating...' : 'Create Audio Segments'}
                            </Button>
                          </div>
                        )}
                      </div>


                    </>
                  )}
                </CardContent>
              </Card>

              {/* Audio Segments Panel */}
              {selectedAudioFile && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Audio Segments
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Segments List */}
                    <div className="space-y-2">
                      <Label className="text-sm">Media Segments ({Array.isArray(mediaSegments) ? mediaSegments.length : 0})</Label>
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {Array.isArray(mediaSegments) && mediaSegments.length > 0 ? (
                          (mediaSegments as any[]).map((segment, index) => (
                            <div key={segment.id} className="p-3 border rounded-lg bg-white dark:bg-gray-800">
                              {editingSegmentId === segment.id ? (
                                // Edit mode
                                <div className="space-y-3">
                                  <div className="font-medium text-sm">{segment.segmentName || segment.name}</div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Start Time (MM:SS)</Label>
                                      <Input
                                        type="text"
                                        value={editingSegmentData?.startTime || ""}
                                        onChange={(e) => setEditingSegmentData(prev => prev ? {...prev, startTime: e.target.value} : null)}
                                        placeholder="0:00"
                                        className="text-sm h-8"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">End Time (MM:SS)</Label>
                                      <Input
                                        type="text"
                                        value={editingSegmentData?.endTime || ""}
                                        onChange={(e) => setEditingSegmentData(prev => prev ? {...prev, endTime: e.target.value} : null)}
                                        placeholder="0:00"
                                        className="text-sm h-8"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={cancelEditingSegment}
                                      className="h-7 px-2 text-xs"
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={saveSegmentEdit}
                                      disabled={updateMediaSegmentMutation.isPending}
                                      className="h-7 px-2 text-xs"
                                    >
                                      {updateMediaSegmentMutation.isPending ? "Saving..." : "Save"}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                // View mode
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{segment.segmentName || segment.name}</div>
                                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-4">
                                      <span className="flex items-center gap-1">
                                        <Timer className="w-3 h-3" />
                                        {formatTime(segment.startTimestamp || segment.startTime || 0)} - {formatTime(segment.endTimestamp || segment.endTime || 0)}
                                      </span>
                                      <span className="text-blue-600 flex items-center gap-1">
                                        <Ruler className="w-3 h-3" />
                                        {(() => {
                                          const start = segment.startTimestamp || segment.startTime || 0;
                                          const end = segment.endTimestamp || segment.endTime || 0;
                                          const length = Math.max(0, end - start);
                                          return formatTime(length);
                                        })()}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        if (audioPlayer) {
                                          playAudioSegment(segment);
                                        }
                                      }}
                                      className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700"
                                      title="Play segment"
                                    >
                                      <Play className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => startEditingSegment(segment)}
                                      disabled={isPublished}
                                      className="h-7 w-7 p-0 text-gray-600 hover:text-gray-700"
                                      title="Edit segment"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteSegment(segment.id)}
                                      disabled={isPublished || deleteMediaSegmentMutation.isPending}
                                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                      title="Delete segment"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No audio segments created yet</p>
                            <p className="text-xs">Add time marks and create segments</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Text Segmentation Panel */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Text Segmentation & Mapping
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTextSegmentation(!showTextSegmentation)}
                    >
                      {showTextSegmentation ? 'Hide' : 'Show'} Text
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Language Selection */}
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select 
                      value={selectedLanguage} 
                      onValueChange={(value: 'te' | 'hi' | 'en') => setSelectedLanguage(value)}
                      disabled={isPublished}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="te">Telugu</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                        <SelectItem value="en">English/IAST</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Text Content with Segmentation */}
                  {showTextSegmentation && (
                    <div className="space-y-3">
                      <Label>Text Content (Click and drag to select)</Label>
                      <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 max-h-96 overflow-y-auto">
                        <div className={`text-sm leading-relaxed ${
                          selectedLanguage === 'te' ? 'font-telugu' : 
                          selectedLanguage === 'hi' ? 'font-devanagari' : 
                          'font-mono'
                        }`}>
                          {textContent[selectedLanguage] ? 
                            renderTextWithSegments(textContent[selectedLanguage], selectedLanguage) :
                            <div className="text-muted-foreground italic">No content available for this language</div>
                          }
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Text Selection Info */}
                  {textSelection && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <Label className="text-sm font-medium">Selected Text</Label>
                      <div className="text-sm text-muted-foreground mt-1">
                        Characters {textSelection.start}-{textSelection.end}
                      </div>
                      <div className="text-sm mt-2 p-2 bg-white dark:bg-gray-800 rounded border">
                        "{textSelection.text}"
                      </div>
                    </div>
                  )}

                  {/* Segment Creation */}
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Segment Name</Label>
                      <input
                        type="text"
                        value={segmentName}
                        onChange={(e) => setSegmentName(e.target.value)}
                        placeholder="Enter segment name..."
                        disabled={isPublished}
                        className="w-full px-3 py-2 border rounded-md text-sm"
                      />
                    </div>
                    
                    <Button
                      onClick={handleCreateTextSegment}
                      disabled={!textSelection || !segmentName.trim() || createTextSegmentMutation.isPending || isPublished}
                      size="sm"
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Text Segment
                    </Button>
                  </div>

                  {/* Segment List */}
                  <div className="space-y-2">
                    <Label className="text-sm">Text Segments ({segments?.length || 0})</Label>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {segments && segments.length > 0 ? (
                        segments.map((segment) => (
                          <div key={segment.id} className="p-3 border rounded-lg bg-white dark:bg-gray-800">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-sm">{segment.conceptualName}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {segment.textReferences[selectedLanguage] ? 
                                    `${selectedLanguage.toUpperCase()}: ${segment.textReferences[selectedLanguage]?.start}-${segment.textReferences[selectedLanguage]?.end}` :
                                    'No reference for selected language'
                                  }
                                </div>
                                {segment.audioFileId && segment.startTime !== undefined && (
                                  <div className="text-xs text-green-600 mt-1">
                                    Audio: {formatTime(segment.startTime)} - {formatTime(segment.endTime || 0)}
                                  </div>
                                )}
                              </div>
                              {!isPublished && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteSegmentMutation.mutate(segment.id)}
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
                          <p className="text-sm">No text segments created yet</p>
                          <p className="text-xs">Select text above to create segments</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}