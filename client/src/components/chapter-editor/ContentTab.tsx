/**
 * ContentTab - Multi-script content editing interface
 * 
 * Provides rich text editing capabilities for Vedic content in multiple scripts
 * (Telugu, Hindi, English). Features script-specific editors, real-time preview,
 * and content validation with auto-save functionality.
 * 
 * @author Vedic LMS Team
 * @since 2025-06-24
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/Tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ScriptSelector } from "@/components/common/ScriptSelector";
import { Edit2, Save, X } from "@/lib/icons";

interface ContentTabProps {
  // Chapter data
  chapter: any;
  textContent: { te: string; hi: string; en: string };
  contentScript: "te" | "hi" | "en";
  isPublished: boolean;
  
  // Metadata editing state
  isEditingMetadata: boolean;
  editingTitle: string;
  editingDescription: string;
  
  // Actions
  onContentChange: (script: string, content: string) => void;
  onScriptChange: (script: "te" | "hi" | "en") => void;
  onStartEditingMetadata: () => void;
  onCancelEditingMetadata: () => void;
  onSaveMetadata: () => void;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  
  // Mutations
  updateContentMutation: any;
  updateChapterMetadataMutation: any;
}

// Phase 5B: React Performance Optimization - Add memoization
export const ContentTab = React.memo(function ContentTab({
  chapter,
  textContent,
  contentScript,
  isPublished,
  isEditingMetadata,
  editingTitle,
  editingDescription,
  onContentChange,
  onScriptChange,
  onStartEditingMetadata,
  onCancelEditingMetadata,
  onSaveMetadata,
  onTitleChange,
  onDescriptionChange,
  updateContentMutation,
  updateChapterMetadataMutation,
}: ContentTabProps) {
  // Phase 5B: Memoize expensive operations
  const contentEditorProps = React.useMemo(() => ({
    content: textContent[contentScript] || "",
    onChange: (content: string) => onContentChange(contentScript, content),
    editable: !isPublished,
    placeholder: `Enter content in ${contentScript.toUpperCase()}...`,
    className: "min-h-96",
  }), [textContent, contentScript, isPublished, onContentChange]);

  const handleStartEditing = React.useCallback(() => {
    onStartEditingMetadata();
  }, [onStartEditingMetadata]);

  const handleCancelEditing = React.useCallback(() => {
    onCancelEditingMetadata();
  }, [onCancelEditingMetadata]);

  const handleSaveMetadata = React.useCallback(() => {
    onSaveMetadata();
  }, [onSaveMetadata]);

  const handleScriptChange = React.useCallback((script: "te" | "hi" | "en") => {
    onScriptChange(script);
  }, [onScriptChange]);
  return (
    <TabsContent value="content" className="space-y-6">
      <div className="grid gap-6">
        {/* Chapter Metadata Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Chapter Details
                <Badge variant={isPublished ? "default" : "secondary"}>
                  {isPublished ? "Published" : "Draft"}
                </Badge>
              </CardTitle>
              {!isPublished && !isEditingMetadata && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartEditing}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditingMetadata ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={editingTitle}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder="Enter chapter title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={editingDescription}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    placeholder="Enter chapter description"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveMetadata}
                    disabled={updateChapterMetadataMutation.isPending}
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancelEditing}
                    size="sm"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Title
                  </Label>
                  <p className="text-lg font-medium">{chapter?.title}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Description
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {chapter?.description || "No description provided"}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Content Editor Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Content Editor</CardTitle>
              <div className="flex items-center gap-4">
                <ScriptSelector
                  value={contentScript}
                  onValueChange={handleScriptChange}
                  disabled={isPublished}
                />
                {updateContentMutation.isPending && (
                  <Badge variant="outline">Saving...</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isPublished && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    This chapter is published. Content editing is disabled.
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Content ({contentScript.toUpperCase()})
                </Label>
                <RichTextEditor {...contentEditorProps} />
              </div>

              {!isPublished && (
                <div className="flex justify-between items-center pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Changes are automatically saved after 2 seconds of inactivity.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => updateContentMutation.mutate(textContent)}
                      disabled={updateContentMutation.isPending}
                      variant="outline"
                      size="sm"
                    >
                      Save Now
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  );
});