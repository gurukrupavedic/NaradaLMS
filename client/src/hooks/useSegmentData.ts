import { useState, useCallback } from "react";
/**
 * useSegmentData - Text segmentation data management hook
 * 
 * Manages CRUD operations for text segments with script-specific handling.
 * Provides optimized queries for segment retrieval, creation, updates, and
 * deletion with automatic cache invalidation and error handling.
 * 
 * @example
 * ```tsx
 * function SegmentationTab() {
 *   const {
 *     segments,
 *     isLoading,
 *     createSegment,
 *     updateSegment,
 *     deleteSegment
 *   } = useSegmentData(chapterId, script);
 *   
 *   const handleCreateSegment = (segmentData) => {
 *     createSegment.mutate(segmentData);
 *   };
 *   
 *   return <div>...</div>;
 * }
 * ```
 * 
 * @param chapterId - Chapter identifier for segment filtering
 * @param script - Script type (te, hi, en) for language-specific segments
 * @returns Segment data and mutation functions
 * 
 * @author Vedic LMS Team
 * @since 2025-06-24
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TextSegment {
  id: number;
  chapterId: number;
  script: string;
  startPosition: number;
  endPosition: number;
  order: number;
  createdBy: string;
  createdAt: string;
  startTime?: number;
  endTime?: number;
  audioFileId?: number;
}

export function useSegmentData(chapterId: string, contentScript: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Segmentation state
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | undefined>(undefined);
  const [selectedScript, setSelectedScript] = useState<"te" | "hi" | "en">(contentScript as "te" | "hi" | "en");
  const [segmentName, setSegmentName] = useState("");
  const [selectedTextSegment, setSelectedTextSegment] = useState<any>(null);

  // Text segments query - script-specific
  const {
    data: textSegments = [],
    refetch: refetchSegments,
    isLoading: segmentsLoading,
    error: segmentsError,
  } = useQuery({
    queryKey: [`/api/segments/${chapterId}/${contentScript || 'te'}`],
    enabled: !!chapterId && !!contentScript,
  });

  // All chapter mappings query for status display
  const { data: allChapterMappings = [] } = useQuery({
    queryKey: [`/api/mappings/${chapterId}`],
    enabled: !!chapterId,
  });

  // Create segment mutation
  const createSegmentMutation = useMutation({
    mutationFn: async (segmentData: any) => {
      await apiRequest("POST", "/api/segments", segmentData);
    },
    onSuccess: () => {
      toast({ title: "Text segment created successfully" });
      setSegmentName("");
      refetchSegments();
      queryClient.invalidateQueries({
        queryKey: [`/api/segments/${chapterId}/${contentScript}`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/mappings/${chapterId}`],
      });
    },
    onError: (error: any) => {
      console.error("Segment creation error:", error);
      toast({
        title: "Failed to create segment",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Update segment mutation
  const updateSegmentMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      await apiRequest("PATCH", `/api/segments/${id}`, updates);
    },
    onSuccess: () => {
      toast({ title: "Segment updated successfully" });
      refetchSegments();
      queryClient.invalidateQueries({
        queryKey: [`/api/segments/${chapterId}/${contentScript}`],
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

  // Delete segment mutation
  const deleteSegmentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/segments/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Segment deleted successfully" });
      refetchSegments();
      queryClient.invalidateQueries({
        queryKey: [`/api/segments/${chapterId}/${contentScript}`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/mappings/${chapterId}`],
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

  // Handle segment creation from text selection
  const handleCreateSegment = useCallback((data: any) => {
    console.log('Creating segment with data:', data);
    
    // Handle both new format (script/startPosition/endPosition) and legacy format (textReferences)
    let segmentData;
    
    if (data.script && data.startPosition !== undefined && data.endPosition !== undefined) {
      // New format - script-specific segments
      segmentData = {
        chapterId: parseInt(chapterId),
        script: data.script,
        startPosition: data.startPosition,
        endPosition: data.endPosition,
        conceptualName: data.conceptualName || segmentName || 'Untitled Segment',
        order: textSegments?.length || 0
      };
    } else if (data.textReferences && Array.isArray(data.textReferences)) {
      // Legacy format - convert to new format
      if (data.textReferences.length === 0) {
        toast({
          title: "No text references",
          description: "Cannot create segment without text references",
          variant: "destructive"
        });
        return;
      }
      
      const firstRef = data.textReferences[0];
      segmentData = {
        chapterId: parseInt(chapterId),
        script: firstRef.script || contentScript,
        startPosition: firstRef.start,
        endPosition: firstRef.end,
        conceptualName: data.conceptualName || segmentName || 'Untitled Segment',
        order: textSegments?.length || 0
      };
    } else {
      toast({
        title: "Invalid segment data",
        description: "Unable to process segment information",
        variant: "destructive"
      });
      return;
    }
    
    // Validate the final data before API call
    if (!segmentData.chapterId || !segmentData.script || 
        segmentData.startPosition === undefined || segmentData.endPosition === undefined) {
      toast({
        title: "Missing segment data",
        description: "Required segment information is missing",
        variant: "destructive"
      });
      return;
    }
    
    createSegmentMutation.mutate(segmentData);
  }, [createSegmentMutation, chapterId, contentScript, segmentName, textSegments?.length, toast]);

  const handleUpdateSegment = useCallback((id: number, updates: any) => {
    updateSegmentMutation.mutate({ id, updates });
  }, [updateSegmentMutation]);

  const handleDeleteSegment = useCallback((id: number) => {
    deleteSegmentMutation.mutate(id);
  }, [deleteSegmentMutation]);

  // Helper function to get mapping status for a segment
  const getMappingStatus = useCallback((segmentId: number, mappings: any[]) => {
    return mappings?.some((mapping: any) => mapping.textSegmentId === segmentId) 
      ? "mapped" 
      : "unmapped";
  }, []);

  // Script change handler with validation
  const handleScriptChange = useCallback((newScript: "te" | "hi" | "en") => {
    setSelectedScript(newScript);
    // Invalidate segments query for new script
    queryClient.invalidateQueries({
      queryKey: [`/api/segments/${chapterId}/${newScript}`],
    });
  }, [chapterId, queryClient]);

  return {
    // Data
    textSegments,
    allChapterMappings,
    segmentsLoading,
    segmentsError,

    // State
    selectedSegmentId,
    selectedScript,
    segmentName,
    selectedTextSegment,

    // Actions
    setSelectedSegmentId,
    setSelectedScript: handleScriptChange,
    setSegmentName,
    setSelectedTextSegment,
    refetchSegments,

    // Handlers
    handleCreateSegment,
    handleUpdateSegment,
    handleDeleteSegment,
    getMappingStatus,

    // Mutations
    createSegmentMutation,
    updateSegmentMutation,
    deleteSegmentMutation,
  };
}