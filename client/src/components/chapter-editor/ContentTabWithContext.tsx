import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ScriptSelector } from "@/components/common/ScriptSelector";
import { Edit2, Save, X } from "lucide-react";
import { useChapterData, useMetadataEditing, useChapterEditor } from "@/contexts/ChapterEditorContext";

interface ContentTabWithContextProps {
  // Actions that still need to be passed from parent (mutations)
  onContentChange: (script: string, content: string) => void;
  onSaveMetadata: () => void;
  updateContentMutation: any;
  updateChapterMetadataMutation: any;
}

export function ContentTabWithContext({
  onContentChange,
  onSaveMetadata,
  updateContentMutation,
  updateChapterMetadataMutation,
}: ContentTabWithContextProps) {
  // Use context hooks for state
  const { chapter, textContent, contentScript, isPublished } = useChapterData();
  const {
    isEditingMetadata,
    editingTitle,
    editingDescription,
    startEditingMetadata,
    stopEditingMetadata,
  } = useMetadataEditing();
  const { setContentScript, updateTextContent } = useChapterEditor();

  const handleContentChange = (script: string, content: string) => {
    updateTextContent(script, content);
    onContentChange(script, content);
  };

  const handleStartEditingMetadata = () => {
    startEditingMetadata(chapter?.title || "", chapter?.description || "");
  };

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
                  onClick={handleStartEditingMetadata}
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
                    onChange={(e) => {
                      // Update local context state
                      startEditingMetadata(e.target.value, editingDescription);
                    }}
                    placeholder="Enter chapter title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={editingDescription}
                    onChange={(e) => {
                      // Update local context state
                      startEditingMetadata(editingTitle, e.target.value);
                    }}
                    placeholder="Enter chapter description"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={onSaveMetadata}
                    disabled={updateChapterMetadataMutation.isPending}
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    onClick={stopEditingMetadata}
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
                  onValueChange={setContentScript}
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
                <RichTextEditor
                  content={textContent[contentScript] || ""}
                  onChange={(content) => handleContentChange(contentScript, content)}
                  editable={!isPublished}
                  placeholder={`Enter content in ${contentScript.toUpperCase()}...`}
                  className="min-h-96"
                />
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
}