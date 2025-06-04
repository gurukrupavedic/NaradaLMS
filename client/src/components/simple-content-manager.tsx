import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Upload, Play, File } from "lucide-react";
import type { User } from "@shared/schema";

interface ContentManagerProps {
  user: User;
}

export default function SimpleContentManager({ user }: ContentManagerProps) {
  const [tracks] = useState([
    {
      id: "1",
      title: "Vedic Sanskrit Fundamentals",
      description: "Learn the basics of Vedic Sanskrit pronunciation and grammar",
      status: "published",
      chapters: 12,
      lastModified: "2024-06-03"
    },
    {
      id: "2",
      title: "Rigveda Samhita",
      description: "Study selected hymns from the Rigveda with audio pronunciation",
      status: "draft",
      chapters: 8,
      lastModified: "2024-06-02"
    }
  ]);

  const [chapters] = useState([
    {
      id: "1",
      trackId: "1",
      title: "Introduction to Sanskrit",
      order: 1,
      status: "published",
      hasText: true,
      hasAudio: true,
      hasSegments: false
    },
    {
      id: "2",
      trackId: "1",
      title: "Devanagari Script",
      order: 2,
      status: "published",
      hasText: true,
      hasAudio: false,
      hasSegments: false
    }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Content Management</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create New Track
        </Button>
      </div>

      <Tabs defaultValue="tracks" className="w-full">
        <TabsList>
          <TabsTrigger value="tracks">Learning Tracks</TabsTrigger>
          <TabsTrigger value="chapters">Chapters</TabsTrigger>
          <TabsTrigger value="media">Media Files</TabsTrigger>
        </TabsList>

        <TabsContent value="tracks" className="space-y-4">
          <div className="grid gap-4">
            {tracks.map((track) => (
              <Card key={track.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {track.title}
                        <Badge variant={track.status === 'published' ? 'default' : 'secondary'}>
                          {track.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{track.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{track.chapters} chapters</span>
                    <span>Last modified: {track.lastModified}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="chapters" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Chapter Management</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Chapter
            </Button>
          </div>
          
          <div className="grid gap-4">
            {chapters.map((chapter) => (
              <Card key={chapter.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{chapter.title}</CardTitle>
                      <CardDescription>Order: {chapter.order}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <File className="h-4 w-4" />
                      <span className={chapter.hasText ? "text-green-600" : "text-gray-400"}>
                        Text {chapter.hasText ? "✓" : "○"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Play className="h-4 w-4" />
                      <span className={chapter.hasAudio ? "text-green-600" : "text-gray-400"}>
                        Audio {chapter.hasAudio ? "✓" : "○"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Edit className="h-4 w-4" />
                      <span className={chapter.hasSegments ? "text-green-600" : "text-gray-400"}>
                        Segments {chapter.hasSegments ? "✓" : "○"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="media" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Media Files</h2>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Audio
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Audio Files</CardTitle>
              <CardDescription>Manage audio files for chapters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-8 w-8 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">No audio files uploaded yet</p>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Audio Files
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Text Segmentation</CardTitle>
              <CardDescription>Create character-position based segments for audio mapping</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Sample Text</label>
                  <Textarea 
                    placeholder="Enter Sanskrit text for segmentation..."
                    className="font-['Tiro_Devanagari_Sanskrit']"
                    rows={4}
                  />
                </div>
                <Button>Generate Segments</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}