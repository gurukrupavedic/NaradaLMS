import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTrackSchema, insertChapterSchema } from "@shared/schema";
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  Save, 
  Eye, 
  EyeOff, 
  Upload, 
  Music, 
  FileText, 
  Scissors,
  CheckCircle,
  XCircle,
  Play,
  Pause
} from "lucide-react";
import type { User, Track, Chapter, AudioFile, TextSegment } from "@shared/schema";
import type { TrackWithChapters, ContentCompleteness, ScriptType } from "@/types/vedic";
import { SCRIPT_OPTIONS } from "@/types/vedic";
import { z } from "zod";

const createTrackFormSchema = insertTrackSchema.extend({
  title: z.string().min(1, "Track title is required"),
  description: z.string().optional(),
  order: z.number().min(1, "Order must be at least 1"),
});

const createChapterFormSchema = insertChapterSchema.extend({
  title: z.string().min(1, "Chapter title is required"),
  order: z.number().min(1, "Order must be at least 1"),
});

interface ContentManagerProps {
  user: User;
}

export default function ContentManager({ user }: ContentManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTrack, setSelectedTrack] = useState<number | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [showCreateTrack, setShowCreateTrack] = useState(false);
  const [showCreateChapter, setShowCreateChapter] = useState(false);
  const [editorScript, setEditorScript] = useState<ScriptType>('te');

  // Queries
  const { data: tracks = [], isLoading: tracksLoading } = useQuery<Track[]>({
    queryKey: ['/api/tracks'],
  });

  const { data: chapters = [] } = useQuery<Chapter[]>({
    queryKey: [`/api/tracks/${selectedTrack}/chapters`],
    enabled: !!selectedTrack,
  });

  const { data: chapterDetails } = useQuery({
    queryKey: [`/api/chapters/${selectedChapter}`],
    enabled: !!selectedChapter,
  });

  // Forms
  const createTrackForm = useForm<z.infer<typeof createTrackFormSchema>>({
    resolver: zodResolver(createTrackFormSchema),
    defaultValues: {
      title: "",
      description: "",
      order: tracks.length + 1,
    },
  });

  const createChapterForm = useForm<z.infer<typeof createChapterFormSchema>>({
    resolver: zodResolver(createChapterFormSchema),
    defaultValues: {
      title: "",
      order: chapters.length + 1,
      trackId: selectedTrack || 0,
    },
  });

  // Mutations
  const createTrackMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createTrackFormSchema>) => {
      await apiRequest('POST', '/api/tracks', {
        ...data,
        createdBy: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tracks'] });
      setShowCreateTrack(false);
      createTrackForm.reset();
      toast({
        title: "Success",
        description: "Track created successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create track",
        variant: "destructive",
      });
    },
  });

  const createChapterMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createChapterFormSchema>) => {
      await apiRequest('POST', '/api/chapters', {
        ...data,
        createdBy: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tracks/${selectedTrack}/chapters`] });
      setShowCreateChapter(false);
      createChapterForm.reset();
      toast({
        title: "Success",
        description: "Chapter created successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create chapter",
        variant: "destructive",
      });
    },
  });

  const deleteTrackMutation = useMutation({
    mutationFn: async (trackId: number) => {
      await apiRequest('DELETE', `/api/tracks/${trackId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tracks'] });
      if (selectedTrack) {
        setSelectedTrack(null);
        setSelectedChapter(null);
      }
      toast({
        title: "Success",
        description: "Track deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete track",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const getContentCompleteness = (chapter: Chapter): ContentCompleteness => {
    const hasText = Object.values(chapter.content).some(text => text && text.trim().length > 0);
    // For now, we'll need to check if audio files exist via the chapter details
    return {
      hasText,
      hasAudio: false, // Will be determined from chapter details
      hasSegments: false, // Will be determined from chapter details
      hasMappings: false, // Will be determined from chapter details
    };
  };

  const handleDeleteTrack = (track: Track) => {
    if (window.confirm(`Are you sure you want to delete track "${track.title}"? This action cannot be undone.`)) {
      deleteTrackMutation.mutate(track.id);
    }
  };

  if (tracksLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vedic-brown"></div>
      </div>
    );
  }

  // Show track list if no track is selected
  if (!selectedTrack) {
    return (
      <div>
        {/* Content Dashboard */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold text-gray-900">Content Management</CardTitle>
              <Dialog open={showCreateTrack} onOpenChange={setShowCreateTrack}>
                <DialogTrigger asChild>
                  <Button className="bg-vedic-brown hover:bg-vedic-brown/90 text-white">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create New Track
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Track</DialogTitle>
                  </DialogHeader>
                  <Form {...createTrackForm}>
                    <form onSubmit={createTrackForm.handleSubmit((data) => createTrackMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={createTrackForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Track Title</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter track title" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createTrackForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea {...field} placeholder="Enter track description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createTrackForm.control}
                        name="order"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Order</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setShowCreateTrack(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createTrackMutation.isPending}>
                          Create Track
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Track Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chapters
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Modified
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tracks.sort((a, b) => a.order - b.order).map(track => (
                    <tr key={track.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {track.order}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button 
                          onClick={() => setSelectedTrack(track.id)}
                          className="text-sm font-medium text-vedic-brown hover:text-vedic-brown/80 hover:underline"
                        >
                          {track.title}
                        </button>
                        <div className="text-sm text-gray-500">{track.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {/* This would need to be calculated from chapters */}
                        0
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          track.status === 'published' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {track.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {track.updatedAt ? new Date(track.updatedAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() => setSelectedTrack(track.id)}
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-800"
                            title="Manage Chapters"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteTrack(track)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-800"
                            title="Delete Track"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {tracks.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">
                        No tracks created yet. Create your first track to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show chapter management view
  const selectedTrackData = tracks.find(t => t.id === selectedTrack);

  return (
    <div className="space-y-6">
      {/* Track Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedTrack(null);
                  setSelectedChapter(null);
                }}
              >
                ← Back to Tracks
              </Button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedTrackData?.title}</h2>
                <p className="text-gray-600">{selectedTrackData?.description}</p>
              </div>
            </div>
            <Dialog open={showCreateChapter} onOpenChange={setShowCreateChapter}>
              <DialogTrigger asChild>
                <Button className="bg-vedic-brown hover:bg-vedic-brown/90 text-white">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Chapter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Chapter</DialogTitle>
                </DialogHeader>
                <Form {...createChapterForm}>
                  <form onSubmit={createChapterForm.handleSubmit((data) => createChapterMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={createChapterForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chapter Title</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter chapter title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createChapterForm.control}
                      name="order"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Order</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setShowCreateChapter(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createChapterMutation.isPending}>
                        Create Chapter
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Chapters List */}
      <Card>
        <CardHeader>
          <CardTitle>Chapters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {chapters.sort((a, b) => a.order - b.order).map(chapter => {
              const completeness = getContentCompleteness(chapter);
              
              return (
                <div key={chapter.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-lg text-gray-900">
                          Chapter {chapter.order}: {chapter.title}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          chapter.status === 'published' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {chapter.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 mb-2">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className={`h-4 w-4 ${completeness.hasText ? 'text-green-500' : 'text-gray-300'}`} />
                          <span className="text-xs text-gray-600">Text</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Music className={`h-4 w-4 ${completeness.hasAudio ? 'text-green-500' : 'text-gray-300'}`} />
                          <span className="text-xs text-gray-600">Audio</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Scissors className={`h-4 w-4 ${completeness.hasSegments ? 'text-green-500' : 'text-gray-300'}`} />
                          <span className="text-xs text-gray-600">Segments</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <FileText className={`h-4 w-4 ${completeness.hasMappings ? 'text-green-500' : 'text-gray-300'}`} />
                          <span className="text-xs text-gray-600">Mapping</span>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => setSelectedChapter(chapter.id)}
                      className="bg-vedic-brown hover:bg-vedic-brown/90 text-white"
                    >
                      Edit Chapter
                    </Button>
                  </div>
                </div>
              );
            })}

            {chapters.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No chapters in this track yet. Add your first chapter to get started.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chapter Editor */}
      {selectedChapter && chapterDetails && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Chapter Editor</CardTitle>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button size="sm" className="bg-vedic-brown hover:bg-vedic-brown/90 text-white">
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="content" className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Content
                </TabsTrigger>
                <TabsTrigger value="media" className="flex items-center">
                  <Music className="h-4 w-4 mr-2" />
                  Media
                </TabsTrigger>
                <TabsTrigger value="segments" className="flex items-center">
                  <Scissors className="h-4 w-4 mr-2" />
                  Segments
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="content" className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Script</label>
                  <Select value={editorScript} onValueChange={(value: ScriptType) => setEditorScript(value)}>
                    <SelectTrigger className="w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCRIPT_OPTIONS.map(script => (
                        <SelectItem key={script.id} value={script.id}>
                          {script.name} ({script.fullName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Chapter Content</label>
                  <Textarea
                    value={chapterDetails.content[editorScript] || ''}
                    onChange={(e) => {
                      // This would need to update the chapter content
                      console.log('Content updated:', e.target.value);
                    }}
                    className={`min-h-96 ${SCRIPT_OPTIONS.find(s => s.id === editorScript)?.fontClass || ''}`}
                    placeholder={`Enter chapter content in ${SCRIPT_OPTIONS.find(s => s.id === editorScript)?.fullName}...`}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="media" className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Audio Files</h3>
                  <p className="text-gray-600 mb-4">
                    Upload recitation files for this chapter. Supported formats: MP3, WAV, M4A
                  </p>
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Files
                  </Button>
                </div>
                
                {chapterDetails.audioFiles && chapterDetails.audioFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Uploaded Files</h4>
                    {chapterDetails.audioFiles.map((audio: AudioFile) => (
                      <div key={audio.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Music className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-sm">{audio.originalName}</p>
                            <p className="text-xs text-gray-500">
                              {audio.reciter && `Reciter: ${audio.reciter}`}
                              {audio.duration && ` • Duration: ${Math.round(audio.duration)}s`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="segments" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Text Segmentation</h4>
                    <div className="border rounded-lg p-4 bg-gray-50 min-h-64">
                      <p className="text-sm text-gray-600 mb-2">
                        Select text to create segments for audio mapping
                      </p>
                      <div className={`text-lg leading-relaxed ${SCRIPT_OPTIONS.find(s => s.id === editorScript)?.fontClass || ''}`}>
                        {chapterDetails.content[editorScript] || 'No content available for this script.'}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Defined Segments</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {chapterDetails.segments && chapterDetails.segments.length > 0 ? (
                        chapterDetails.segments.map((segment: TextSegment) => (
                          <div key={segment.id} className="bg-white border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">{segment.conceptualName}</span>
                              <Button variant="ghost" size="sm" className="text-red-600">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="text-xs text-gray-600">
                              Position: {segment.textReferences[editorScript]?.start}-{segment.textReferences[editorScript]?.end}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Scissors className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No segments defined yet</p>
                        </div>
                      )}
                    </div>
                    
                    <Button className="w-full mt-3" variant="outline">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Segment
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
