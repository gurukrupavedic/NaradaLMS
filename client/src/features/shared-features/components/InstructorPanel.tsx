import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Save, Eye } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/features/shared-features/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface StudentProgress {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  trackTitle: string;
  chapterTitle: string;
  proficiencyLevel: number;
  lastAccessed?: string;
}

export function InstructorPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, number>>(new Map());

  const { data: studentProgress, isLoading, error } = useQuery<StudentProgress[]>({
    queryKey: ['/api/instructor/student-progress'],
  });

  const { data: tracks } = useQuery<Array<{ id: string; title: string }>>({
    queryKey: ['/api/tracks'],
  });

  const updateProgressMutation = useMutation({
    mutationFn: async (updates: Array<{ progressId: string; proficiencyLevel: number }>) => {
      await apiRequest('PUT', '/api/instructor/student-progress', { updates });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Student progress updated successfully",
      });
      setPendingUpdates(new Map());
      queryClient.invalidateQueries({ queryKey: ['/api/instructor/student-progress'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
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

  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
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
  }, [error, toast]);

  const filteredProgress = studentProgress?.filter(progress => {
    const matchesSearch = progress.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         progress.studentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         progress.chapterTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTrack = selectedTrack === 'all' || progress.trackTitle === selectedTrack;
    return matchesSearch && matchesTrack;
  }) || [];

  const handleLevelChange = (progressId: string, newLevel: number) => {
    setPendingUpdates(prev => new Map(prev.set(progressId, newLevel)));
  };

  const saveAllChanges = () => {
    const updates = Array.from(pendingUpdates.entries()).map(([progressId, proficiencyLevel]) => ({
      progressId,
      proficiencyLevel,
    }));
    
    if (updates.length > 0) {
      updateProgressMutation.mutate(updates);
    }
  };

  const exportProgress = () => {
    // In a real implementation, this would generate a CSV/Excel file
    toast({
      title: "Export Started",
      description: "Progress report is being generated...",
    });
  };

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

  const getCurrentLevel = (progressId: string, originalLevel: number) => {
    return pendingUpdates.get(progressId) ?? originalLevel;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Student Progress Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-12 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-6">
          <CardTitle className="text-2xl">Student Progress Management</CardTitle>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Select value={selectedTrack} onValueChange={setSelectedTrack}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Tracks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tracks</SelectItem>
                {tracks?.map(track => (
                  <SelectItem key={track.id} value={track.title}>
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
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Track
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Chapter
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Current Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Update Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {filteredProgress.length > 0 ? (
                filteredProgress.map(progress => {
                  const currentLevel = getCurrentLevel(progress.id, progress.proficiencyLevel);
                  const hasChanges = pendingUpdates.has(progress.id);
                  
                  return (
                    <tr key={progress.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {progress.studentName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {progress.studentEmail}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {progress.trackTitle}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                        {progress.chapterTitle}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getLevelColor(progress.proficiencyLevel)}>
                          {getLevelLabel(progress.proficiencyLevel)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Select
                          value={currentLevel.toString()}
                          onValueChange={(value) => handleLevelChange(progress.id, parseInt(value))}
                        >
                          <SelectTrigger className={`w-32 ${hasChanges ? 'border-accent' : ''}`}>
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
                          {hasChanges && (
                            <span className="text-xs text-accent font-medium">Modified</span>
                          )}
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    No student progress data found
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
              disabled={pendingUpdates.size === 0 || updateProgressMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              <Save className="h-4 w-4 mr-2" />
              Save All Changes ({pendingUpdates.size})
            </Button>
            <Button variant="outline" onClick={exportProgress}>
              <Download className="h-4 w-4 mr-2" />
              Export Progress
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Showing {filteredProgress.length} student{filteredProgress.length !== 1 ? 's' : ''}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
