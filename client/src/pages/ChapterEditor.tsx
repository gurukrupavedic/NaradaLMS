import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  EyeOff,
  ChevronLeft,
  FileText,
  Music,
  Settings,
  Clock,
  User
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ChapterEditor() {
  const [location, navigate] = useLocation();
  const [match, params] = useRoute("/chapter-editor/:id");
  const { toast } = useToast();
  
  const id = params?.id;

  // State for content editing
  const [activeTab, setActiveTab] = useState("content");
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
  const { data: audioFiles = [] } = useQuery<any[]>({
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
  });

  // Toggle publish mutation
  const togglePublishMutation = useMutation({
    mutationFn: async () => {
      const newStatus = chapterData?.status === 'published' ? 'draft' : 'published';
      return apiRequest('PUT', `/api/admin/chapters/${id}`, { status: newStatus });
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
    const updatedChapter = {
      title: chapterTitle,
      content: {
        te: teluguContent,
        hi: hindiContent,
        en: englishContent,
      },
    };
    saveChapterMutation.mutate(updatedChapter);
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

  if (error || (!isLoading && !chapterData)) {
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

  if (!chapterData) {
    return null;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate(`/admin/tracks/${chapterData?.trackId}/chapters`)}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Chapters
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{chapterData?.title || 'Loading...'}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={isPublished ? "default" : "secondary"}>
                  {isPublished ? "Published" : "Draft"}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={handleTogglePublish}
              disabled={togglePublishMutation.isPending}
            >
              {isPublished ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {isPublished ? "Unpublish" : "Publish"}
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saveChapterMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="content" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Content & Publishing
              </TabsTrigger>
              <TabsTrigger value="segmentation" className="flex items-center gap-2">
                <Music className="w-4 h-4" />
                Segmentation & Mapping
              </TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Admin Panel
              </TabsTrigger>
            </TabsList>

            {/* Content & Publishing Tab */}
            <TabsContent value="content" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chapter Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Chapter Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="chapter-title">Chapter Title</Label>
                      <Input
                        id="chapter-title"
                        value={chapterTitle}
                        onChange={(e) => setChapterTitle(e.target.value)}
                        placeholder="Enter chapter title..."
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Content Languages */}
                <Card>
                  <CardHeader>
                    <CardTitle>Multilingual Content</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Telugu Content */}
                      <div>
                        <Label htmlFor="telugu-content">Telugu Content</Label>
                        <Textarea
                          id="telugu-content"
                          value={teluguContent}
                          onChange={(e) => setTeluguContent(e.target.value)}
                          placeholder="Enter Telugu content..."
                          className="h-32"
                        />
                      </div>

                      {/* Hindi Content */}
                      <div>
                        <Label htmlFor="hindi-content">Hindi Content (Devanagari)</Label>
                        <Textarea
                          id="hindi-content"
                          value={hindiContent}
                          onChange={(e) => setHindiContent(e.target.value)}
                          placeholder="Enter Hindi content..."
                          className="h-32"
                        />
                      </div>

                      {/* English Content */}
                      <div>
                        <Label htmlFor="english-content">English Content (IAST)</Label>
                        <Textarea
                          id="english-content"
                          value={englishContent}
                          onChange={(e) => setEnglishContent(e.target.value)}
                          placeholder="Enter English/IAST content..."
                          className="h-32"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Segmentation & Mapping Tab */}
            <TabsContent value="segmentation" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Audio Segmentation & Text Mapping</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Music className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Segmentation Tools</h3>
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
                    <CardTitle>Chapter Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <div className="mt-1">
                        <Badge variant={chapterData?.status === 'published' ? "default" : "secondary"}>
                          {chapterData?.status === 'published' ? "Published" : "Draft"}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Content Languages</label>
                      <div className="flex gap-2 mt-1">
                        {Object.entries(chapterData?.content || {})
                          .filter(([_, content]) => content)
                          .map(([lang]) => (
                            <Badge key={lang} variant="secondary">
                              {lang.toUpperCase()}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions Panel */}
                <Card>
                  <CardHeader>
                    <CardTitle>Metadata</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="font-medium text-gray-700 dark:text-gray-300">Track ID</label>
                      <div className="text-gray-600 dark:text-gray-400">
                        {chapterData?.trackId || 'N/A'}
                      </div>
                    </div>

                    <div>
                      <label className="font-medium text-gray-700 dark:text-gray-300">Created</label>
                      <div className="text-gray-600 dark:text-gray-400">
                        {chapterData?.createdAt ? new Date(chapterData.createdAt).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}