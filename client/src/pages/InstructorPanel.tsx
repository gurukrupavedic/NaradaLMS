import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Search, Save, Download, Eye } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { StudentWithProgress, TrackWithChapters } from '@shared/schema';

export default function InstructorPanel() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [progressUpdates, setProgressUpdates] = useState<Record<string, number>>({});
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: students, isLoading: studentsLoading } = useQuery<StudentWithProgress[]>({
    queryKey: ['/api/progress/students'],
  });

  const { data: tracks } = useQuery<TrackWithChapters[]>({
    queryKey: ['/api/tracks'],
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates: Array<{ studentId: string; chapterId: number; proficiencyLevel: number }>) => {
      await apiRequest('POST', '/api/progress/bulk', { progressUpdates: updates });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Student progress updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/progress/students'] });
      setProgressUpdates({});
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update progress",
        variant: "destructive",
      });
    },
  });

  const handleProgressChange = (studentId: string, chapterId: number, level: number) => {
    const key = `${studentId}-${chapterId}`;
    setProgressUpdates(prev => ({
      ...prev,
      [key]: level,
    }));
  };

  const handleSaveAll = () => {
    const updates = Object.entries(progressUpdates).map(([key, level]) => {
      const [studentId, chapterId] = key.split('-');
      return {
        studentId,
        chapterId: parseInt(chapterId),
        proficiencyLevel: level,
      };
    });

    if (updates.length > 0) {
      bulkUpdateMutation.mutate(updates);
    }
  };

  const getProgressKey = (studentId: string, chapterId: number) => `${studentId}-${chapterId}`;

  const getLevelColor = (level: number) => {
    const colors = {
      0: 'bg-gray-100 text-gray-800',
      1: 'bg-red-100 text-red-800',
      2: 'bg-yellow-100 text-yellow-800',
      3: 'bg-blue-100 text-blue-800',
      4: 'bg-green-100 text-green-800',
    };
    return colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getLevelLabel = (level: number) => {
    if (level === 0) return 'Not Started';
    return `Level ${level}`;
  };

  // Filter students and their progress
  const filteredData = React.useMemo(() => {
    if (!students) return [];

    return students.flatMap(student => {
      // Filter by search term
      const matchesSearch = !searchTerm || 
        student.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return [];

      // Get progress entries, filtering by track if selected
      let progressEntries = student.progress || [];
      
      if (selectedTrack !== 'all') {
        progressEntries = progressEntries.filter(
          progress => progress.chapter.track.id.toString() === selectedTrack
        );
      }

      // If no progress entries but user passes search filter, show with empty progress
      if (progressEntries.length === 0 && matchesSearch) {
        return [{
          student,
          progress: null,
          chapter: null,
          track: null,
        }];
      }

      return progressEntries.map(progress => ({
        student,
        progress,
        chapter: progress.chapter,
        track: progress.chapter.track,
      }));
    });
  }, [students, searchTerm, selectedTrack]);

  if (studentsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Student Progress Management</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
          <Select value={selectedTrack} onValueChange={setSelectedTrack}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tracks</SelectItem>
              {tracks?.map((track) => (
                <SelectItem key={track.id} value={track.id.toString()}>
                  {track.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
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
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No students found matching your criteria
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item, index) => {
                    const progressKey = item.chapter ? getProgressKey(item.student.id, item.chapter.id) : '';
                    const currentLevel = item.progress?.proficiencyLevel ?? 0;
                    const updatedLevel = progressUpdates[progressKey] ?? currentLevel;
                    const hasChanges = progressUpdates[progressKey] !== undefined;

                    return (
                      <tr key={`${item.student.id}-${item.chapter?.id || 'no-chapter'}-${index}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={item.student.profileImageUrl || undefined} />
                              <AvatarFallback>
                                {(item.student.firstName?.[0] || '') + (item.student.lastName?.[0] || '')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {item.student.firstName} {item.student.lastName}
                              </div>
                              <div className="text-sm text-gray-500">{item.student.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.track?.title || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.chapter?.title || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getLevelColor(currentLevel)}>
                            {getLevelLabel(currentLevel)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.chapter ? (
                            <Select
                              value={updatedLevel.toString()}
                              onValueChange={(value) => 
                                handleProgressChange(item.student.id, item.chapter.id, parseInt(value))
                              }
                            >
                              <SelectTrigger className={`w-32 ${hasChanges ? 'border-amber-500' : ''}`}>
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
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            {hasChanges && (
                              <Save className="h-4 w-4 text-amber-600" />
                            )}
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleSaveAll}
                disabled={Object.keys(progressUpdates).length === 0 || bulkUpdateMutation.isPending}
                className="bg-amber-700 hover:bg-amber-800 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                Save All Changes ({Object.keys(progressUpdates).length})
              </Button>
              <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
                <Download className="h-4 w-4 mr-2" />
                Export Progress
              </Button>
            </div>
            
            <div className="text-sm text-gray-500">
              Showing {filteredData.length} entries
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
