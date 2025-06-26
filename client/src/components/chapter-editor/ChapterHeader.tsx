/**
 * ChapterHeader - Chapter management interface header component
 * 
 * Provides chapter title editing, navigation, publishing controls, and status
 * indicators. Includes breadcrumb navigation, inline title editing, and
 * publish/unpublish functionality with visual status feedback.
 * 
 * @example
 * ```tsx
 * <ChapterHeader
 *   trackId="1"
 *   chapter={chapterData}
 *   isPublished={true}
 *   onNavigateBack={() => navigate('/tracks/1')}
 *   onTitleChange={(title) => updateChapter({ title })}
 *   onPublishToggle={() => togglePublishStatus()}
 * />
 * ```
 * 
 * @param trackId - Parent track identifier for navigation
 * @param chapter - Chapter data object
 * @param isPublished - Current publish status
 * @param onNavigateBack - Callback for back navigation
 * @param onTitleChange - Callback for title updates
 * @param onPublishToggle - Callback for publish status changes
 * 
 * @author Vedic LMS Team
 * @since 2025-06-24
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Edit2, Save, X } from "@/lib/icons";

interface ChapterHeaderProps {
  // Navigation
  trackId: string;
  onNavigateBack: () => void;
  
  // Chapter data
  chapter: any;
  isPublished: boolean;
  
  // Metadata editing
  isEditingMetadata: boolean;
  editingTitle: string;
  editingDescription: string;
  
  // Actions
  onStartEditingMetadata: () => void;
  onCancelEditingMetadata: () => void;
  onSaveMetadata: () => void;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onToggleStatus: () => void;
  
  // Mutations
  updateChapterMetadataMutation: any;
  toggleStatusMutation: any;
}

// Phase 5B: React Performance Optimization - Add memoization
export const ChapterHeader = React.memo(function ChapterHeader({
  trackId,
  onNavigateBack,
  chapter,
  isPublished,
  isEditingMetadata,
  editingTitle,
  editingDescription,
  onStartEditingMetadata,
  onCancelEditingMetadata,
  onSaveMetadata,
  onTitleChange,
  onDescriptionChange,
  onToggleStatus,
  updateChapterMetadataMutation,
  toggleStatusMutation,
}: ChapterHeaderProps) {
  // Phase 5B: Memoized callbacks
  const handleNavigateBack = React.useCallback(() => {
    onNavigateBack();
  }, [onNavigateBack]);

  const handleStartEditing = React.useCallback(() => {
    onStartEditingMetadata();
  }, [onStartEditingMetadata]);

  const handleCancelEditing = React.useCallback(() => {
    onCancelEditingMetadata();
  }, [onCancelEditingMetadata]);

  const handleSaveMetadata = React.useCallback(() => {
    onSaveMetadata();
  }, [onSaveMetadata]);

  const handleTitleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onTitleChange(e.target.value);
  }, [onTitleChange]);

  const handleDescriptionChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onDescriptionChange(e.target.value);
  }, [onDescriptionChange]);

  const handleToggleStatus = React.useCallback(() => {
    onToggleStatus();
  }, [onToggleStatus]);
  return (
    <div className="border-b bg-white shadow-sm">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNavigateBack}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            
            <div className="h-5 w-px bg-border"></div>
            
            {isEditingMetadata ? (
              <div className="flex-1 flex items-center gap-3">
                <Input
                  value={editingTitle}
                  onChange={(e) => onTitleChange(e.target.value)}
                  placeholder="Enter chapter title"
                  className="text-lg font-semibold h-8 flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onSaveMetadata();
                    }
                    if (e.key === "Escape") {
                      onCancelEditingMetadata();
                    }
                  }}
                />
                <Input
                  value={editingDescription}
                  onChange={(e) => onDescriptionChange(e.target.value)}
                  placeholder="Enter description"
                  className="h-8 flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onSaveMetadata();
                    }
                    if (e.key === "Escape") {
                      onCancelEditingMetadata();
                    }
                  }}
                />
                <Button
                  onClick={onSaveMetadata}
                  disabled={updateChapterMetadataMutation.isPending}
                  size="sm"
                >
                  <Save className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={onCancelEditingMetadata}
                  size="sm"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-lg font-semibold">{chapter?.title}</h1>
                  {chapter?.description && (
                    <p className="text-sm text-muted-foreground">
                      {chapter.description}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onStartEditingMetadata}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Badge variant={isPublished ? "default" : "secondary"}>
              {isPublished ? "Published" : "Draft"}
            </Badge>
            
            <Button
              onClick={handleToggleStatus}
              disabled={toggleStatusMutation.isPending}
              variant={isPublished ? "outline" : "default"}
              size="sm"
            >
              {isPublished ? "Unpublish" : "Publish"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});