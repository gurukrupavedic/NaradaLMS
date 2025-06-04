import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useState } from "react";
import { Search, Save, Eye, Download } from "lucide-react";
import type { User, StudentProgress, Chapter, Track } from "@shared/schema";

interface StudentProgressWithDetails extends StudentProgress {
  student: User;
  chapter: Chapter & { track: Track };
}

export default function InstructorPanel({ user }: { user: User }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTrack, setFilterTrack] = useState<string>("all");
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, { proficiencyLevel: number; chapterId: number; studentId: string }>>({});

  const { data: allProgress = [], isLoading } = useQuery<StudentProgressWithDetails[]>({
    queryKey: ['/api/student-progress'],
  });

  const { data: tracks = [] } = useQuery<Track[]>({
    queryKey: ['/api/tracks'],
  });

  const updateProgressMutation = useMutation({
    mutationFn: async (progressData: { studentId: string; chapterId: number; proficiencyLevel: number }) => {
      await apiRequest('PUT', '/api/student-progress', progressData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/student-progress'] });
      setPendingUpdates({});
      toast({
        title: "Success",
        description: "Student progress updated successfully",
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
        description: "Failed to update student progress",
        variant: "destructive",
      });
    },
  });

  const handleLevelChange = (studentId: string, chapterId: number, newLevel: string) => {
    const key = `${studentId}-${chapterId}`;
    setPendingUpdates(prev => ({
      ...prev,
      [key]: {
        studentId,
        chapterId,
        proficiencyLevel: parseInt(newLevel),
      }
    }));
  };

  const saveIndividualProgress = (studentId: string, chapterId: number) => {
    const key = `${studentId}-${chapterId}`;
    const update = pendingUpdates[key];
    if (update) {
      updateProgressMutation.mutate(update);
    }
  };

  const saveAllChanges = () => {
    Object.values(pendingUpdates).forEach(update => {
      updateProgressMutation.mutate(update);
    });
  };

  const filteredProgress = allProgress.filter(progress => {
    const matchesSearch = searchTerm === "" || 
      progress.student.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      progress.student.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      progress.student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      progress.chapter.title.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTrack = filterTrack === "all" || 
      progress.chapter.track.id.toString() === filterTrack;

    return matchesSearch && matchesTrack;
  });

  const getLevelColor = (level: number) => {
    switch (level) {
      case 0: return 'bg-gray-100 text-gray-800';
      case 1: return 'bg-red-100 text-red-800';
      case 2: return 'bg-yellow-100 text-yellow-800';
      case 3: return 'bg-blue-100 text-blue-800';
      case 4: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelLabel = (level: number) => {
    switch (level) {
      case 0: return 'Not Started';
      case 1: return 'Level 1';
      case 2: return 'Level 2';
      case 3: return 'Level 3';
      case 4: return 'Level 4';
      default: return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vedic-brown"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold text-gray-900">Student Progress Management</CardTitle>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48"
              />
            </div>
            <Select value={filterTrack} onValueChange={setFilterTrack}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Tracks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tracks</SelectItem>
                {tracks.map(track => (
                  <SelectItem key={track.id} value={track.id.toString()}>
                    {track.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Track
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chapter
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Update Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProgress.map(progress => {
                const key = `${progress.studentId}-${progress.chapterId}`;
                const pendingUpdate = pendingUpdates[key];
                const currentLevel = pendingUpdate?.proficiencyLevel ?? progress.proficiencyLevel;

                return (
                  <tr key={`${progress.studentId}-${progress.chapterId}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {progress.student.profileImageUrl && (
                          <img 
                            src={progress.student.profileImageUrl}
                            alt="Student Avatar" 
                            className="w-10 h-10 rounded-full object-cover mr-4"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {progress.student.firstName} {progress.student.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {progress.student.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {progress.chapter.track.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {progress.chapter.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getLevelColor(progress.proficiencyLevel)}`}>
                        {getLevelLabel(progress.proficiencyLevel)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Select 
                        value={currentLevel.toString()} 
                        onValueChange={(value) => handleLevelChange(progress.studentId, progress.chapterId, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Not Started</SelectItem>
                          <SelectItem value="1">Level 1</SelectItem>
                          <SelectItem value="2">Level 2</SelectItem>
                          <SelectItem value="3">Level 3</SelectItem>
                          <SelectItem value="4">Level 4</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => saveIndividualProgress(progress.studentId, progress.chapterId)}
                          disabled={!pendingUpdate || updateProgressMutation.isPending}
                          className="text-vedic-brown hover:text-vedic-brown/80 p-1"
                          variant="ghost"
                          size="sm"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => {
                            // View student details - could open modal or navigate
                            toast({
                              title: "Student Details",
                              description: `Viewing details for ${progress.student.firstName} ${progress.student.lastName}`,
                            });
                          }}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          variant="ghost"
                          size="sm"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProgress.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    No student progress found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              onClick={saveAllChanges}
              disabled={Object.keys(pendingUpdates).length === 0 || updateProgressMutation.isPending}
              className="bg-vedic-brown hover:bg-vedic-brown/90 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              Save All Changes
              {Object.keys(pendingUpdates).length > 0 && (
                <span className="ml-2 bg-vedic-orange text-white text-xs px-2 py-1 rounded-full">
                  {Object.keys(pendingUpdates).length}
                </span>
              )}
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Progress
            </Button>
          </div>
          
          <div className="text-sm text-gray-500">
            Showing {filteredProgress.length} of {allProgress.length} records
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
