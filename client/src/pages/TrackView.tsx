import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Chapter {
  id: string;
  title: string;
  order: number;
  proficiencyLevel: number;
}

interface Track {
  id: string;
  title: string;
  description: string;
  status: string;
  chapters: Chapter[];
}

export default function TrackView() {
  const [, setLocation] = useLocation();
  const { trackId } = useParams();

  const { data: track, isLoading } = useQuery<Track>({
    queryKey: ['/api/tracks', trackId],
    enabled: !!trackId
  });

  const getProficiencyColor = (level: number) => {
    const colors = {
      0: 'bg-gray-100 text-gray-800',
      1: 'bg-red-100 text-red-800',
      2: 'bg-yellow-100 text-yellow-800',
      3: 'bg-blue-100 text-blue-800',
      4: 'bg-green-100 text-green-800'
    };
    return colors[level as keyof typeof colors] || colors[0];
  };

  const getProficiencyLabel = (level: number) => {
    const labels = {
      0: 'Not Started',
      1: 'Level 1',
      2: 'Level 2',
      3: 'Level 3',
      4: 'Level 4'
    };
    return labels[level as keyof typeof labels] || 'Unknown';
  };

  const getTrackStatusColor = (status: string) => {
    switch (status) {
      case 'certified':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'ready_for_test':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getTrackStatusLabel = (status: string) => {
    switch (status) {
      case 'certified':
        return 'Certified';
      case 'ready_for_test':
        return 'Ready for Track Test';
      case 'in_progress':
        return 'In Progress';
      default:
        return 'Not Started';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!track) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">Track not found</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setLocation('/')}
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setLocation('/')}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Button>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Track {trackId}</span>
          </div>
          <h1 className="text-2xl font-bold">{track.title}</h1>
          {track.description && (
            <p className="text-gray-600 mt-1">{track.description}</p>
          )}
        </div>
      </div>

      {/* Track Status Banner */}
      {track.status !== 'not_started' && (
        <div className={`rounded-lg border-2 p-4 ${getTrackStatusColor(track.status)}`}>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            <span className="font-semibold">
              Track Status: {getTrackStatusLabel(track.status)}
            </span>
          </div>
          {track.status === 'ready_for_test' && (
            <p className="mt-2 text-sm">
              You have completed all chapters with sufficient proficiency. Contact your instructor to schedule the track test.
            </p>
          )}
          {track.status === 'certified' && (
            <p className="mt-2 text-sm">
              Congratulations! You have successfully completed and been certified in this track.
            </p>
          )}
        </div>
      )}

      {/* Chapters Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Chapters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(track.chapters || []).map((chapter) => (
            <Card 
              key={chapter.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setLocation(`/chapters/${chapter.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="text-sm text-gray-500 mb-1">
                      Chapter {chapter.order}
                    </div>
                    <CardTitle className="text-base line-clamp-2">
                      {chapter.title}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex justify-between items-center">
                  <Badge className={getProficiencyColor(chapter.proficiencyLevel)}>
                    {getProficiencyLabel(chapter.proficiencyLevel)}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    Study →
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {track.chapters.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No chapters available in this track yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}