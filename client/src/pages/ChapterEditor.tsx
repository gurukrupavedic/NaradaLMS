import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Upload, Save, Eye, EyeOff, Plus, Trash2, Edit3, Clock, Timer, Ruler, Music, Play, Pause, Square, MapPin, X, Edit2, Settings, Info, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface ChapterData {
  id: number;
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

export default function ChapterEditor() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("content");

  // Content state
  const [chapterTitle, setChapterTitle] = useState('');
  const [teluguContent, setTeluguContent] = useState('');
  const [hindiContent, setHindiContent] = useState('');
  const [englishContent, setEnglishContent] = useState('');

  // Fetch chapter data
  const { data: chapterData, isLoading, error } = useQuery<any>({
    queryKey: [`/api/admin/chapters/${id}`],
    enabled: !!id,
  });

  // Update state when chapter data loads
  useEffect(() => {
    if (chapterData) {
      setChapterTitle(chapterData.title || '');
      setTeluguContent(chapterData.content?.te || '');
      setHindiContent(chapterData.content?.hi || '');
      setEnglishContent(chapterData.content?.en || '');
    }
  }, [chapterData]);

  // Audio files query
  const { data: audioFiles } = useQuery({
    queryKey: [`/api/admin/audio-files/${id}`],
    enabled: !!id,
  });

  // Save chapter mutation
  const saveChapterMutation = useMutation({
    mutationFn: async (chapterUpdate: any) => {
      return apiRequest('PUT', `/api/admin/chapters/${id}`, chapterUpdate);
    },
    onSuccess: () => {
      toast({
        title: "Chapter saved",
        description: "Your changes have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/chapters/${id}`] });
    },
    onError: (error) => {
      toast({
        title: "Save failed",
        description: "Failed to save chapter. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Toggle publish mutation
  const togglePublishMutation = useMutation({
    mutationFn: async () => {
      const newStatus = chapterData?.status === 'published' ? 'draft' : 'published';
      return apiRequest(`/api/admin/chapters/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
    },
    onSuccess: () => {
      const newStatus = chapterData?.status === 'published' ? 'draft' : 'published';
      toast({
        title: `Chapter ${newStatus}`,
        description: `Chapter has been ${newStatus} successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/chapters/${id}`] });
    },
  });

  const handleSave = () => {
    const chapterUpdate = {
      title: chapterTitle,
      content: {
        te: teluguContent,
        hi: hindiContent,
        en: englishContent,
      },
    };
    saveChapterMutation.mutate(chapterUpdate);
  };

  const handleTogglePublish = () => {
    togglePublishMutation.mutate();
  };

  const isPublished = chapterData?.status === 'published';

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Chapter Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            The chapter you're looking for doesn't exist or you don't have permission to access it.
          </p>
          <Button onClick={() => navigate('/admin/tracks')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Tracks
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {chapterData && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate(`/admin/tracks/${chapterData.trackId}/chapters`)}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Chapters
              </Button>
              <div>
                <h1 className="text-3xl font-bold">{chapterData.title}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={isPublished ? "default" : "secondary"}>
                    {isPublished ? "Published" : "Draft"}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    Chapter {id}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                onClick={handleSave}
                disabled={saveChapterMutation.isPending || isPublished}
              >
                <Save className="w-4 h-4 mr-2" />
                {saveChapterMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant={isPublished ? "secondary" : "default"}
                onClick={handleTogglePublish}
                disabled={togglePublishMutation.isPending}
              >
                {togglePublishMutation.isPending 
                  ? "Updating..." 
                  : isPublished 
                    ? "Unpublish" 
                    : "Publish"
                }
              </Button>
            </div>
          </div>

          {/* Content Tabs */}
          <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="content">Content Editor</TabsTrigger>
                <TabsTrigger value="segmentation">Segmentation & Mapping</TabsTrigger>
                <TabsTrigger value="admin">Admin Panel</TabsTrigger>
              </TabsList>

              {/* Content Editor Tab */}
              <TabsContent value="content" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Chapter Details</CardTitle>
                    <CardDescription>
                      Edit the basic information and content for this chapter
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="title">Chapter Title</Label>
                      <Input
                        id="title"
                        value={chapterTitle}
                        onChange={(e) => setChapterTitle(e.target.value)}
                        placeholder="Enter chapter title"
                        disabled={isPublished}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="telugu">Telugu Content</Label>
                        <Textarea
                          id="telugu"
                          value={teluguContent}
                          onChange={(e) => setTeluguContent(e.target.value)}
                          placeholder="Enter Telugu content"
                          rows={10}
                          disabled={isPublished}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hindi">Hindi Content</Label>
                        <Textarea
                          id="hindi"
                          value={hindiContent}
                          onChange={(e) => setHindiContent(e.target.value)}
                          placeholder="Enter Hindi content"
                          rows={10}
                          disabled={isPublished}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="english">English Content</Label>
                        <Textarea
                          id="english"
                          value={englishContent}
                          onChange={(e) => setEnglishContent(e.target.value)}
                          placeholder="Enter English content"
                          rows={10}
                          disabled={isPublished}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Segmentation Tab */}
              <TabsContent value="segmentation" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Audio Segmentation & Text Mapping</CardTitle>
                    <CardDescription>
                      Create audio segments and map them to text portions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Music className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                        Segmentation Feature
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Audio segmentation and text mapping functionality will be implemented here.
                      </p>
                      <div className="text-sm text-gray-500">
                        Audio files: {audioFiles?.length || 0}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Admin Panel */}
              <TabsContent value="admin" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Chapter Info Panel */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Info className="w-5 h-5" />
                        Chapter Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Status</label>
                        <div className="flex items-center gap-2 mt-1">
                          <div className={`w-2 h-2 rounded-full ${
                            chapterData?.status === 'published' ? 'bg-green-500' : 'bg-yellow-500'
                          }`} />
                          <span className="capitalize">{chapterData?.status}</span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Audio Files</label>
                        <div className="text-sm text-gray-600 mt-1">
                          {audioFiles?.length || 0} files uploaded
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Content Languages</label>
                        <div className="flex gap-2 mt-1">
                          {Object.entries(chapterData?.content || {}).map(([lang, content]) => (
                            content && (
                              <Badge key={lang} variant="secondary">
                                {lang.toUpperCase()}
                              </Badge>
                            )
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions Panel */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => {
                          setActiveTab("content");
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Content
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => {
                          setActiveTab("segmentation");
                        }}
                      >
                        <Music className="w-4 h-4 mr-2" />
                        Audio Segmentation
                      </Button>
                      
                      <div className="border-t pt-3">
                        <Button
                          variant={isPublished ? "secondary" : "default"}
                          className="w-full"
                          onClick={handleTogglePublish}
                          disabled={togglePublishMutation.isPending}
                        >
                          {togglePublishMutation.isPending 
                            ? "Updating..." 
                            : isPublished 
                              ? "Unpublish Chapter" 
                              : "Publish Chapter"
                          }
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* System Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>System Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <label className="font-medium text-gray-700 dark:text-gray-300">Chapter ID</label>
                        <div className="text-gray-600 dark:text-gray-400">{id}</div>
                      </div>
                      <div>
                        <label className="font-medium text-gray-700 dark:text-gray-300">Track ID</label>
                        <div className="text-gray-600 dark:text-gray-400">{chapterData?.trackId}</div>
                      </div>
                      <div>
                        <label className="font-medium text-gray-700 dark:text-gray-300">Created</label>
                        <div className="text-gray-600 dark:text-gray-400">
                          {chapterData?.createdAt ? new Date(chapterData.createdAt).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
}