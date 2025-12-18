import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, Button, Spinner } from "@/components/design-system";
import { ArrowLeft, BookOpen, ChevronRight, FileText } from "lucide-react";
import type { Track } from "@shared/schema";

export function LearnTracks() {
  const [, setLocation] = useLocation();

  const { data: tracks = [], isLoading } = useQuery<Track[]>({
    queryKey: ["/api/learning/tracks"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner variant="indigo" size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              color="gray"
              size="sm"
              onClick={() => setLocation("/")}
              data-testid="button-back-dashboard"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900" data-testid="text-page-title">Learning Tracks</h1>
              <p className="text-sm text-gray-600">Explore and study available tracks</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {tracks.length === 0 ? (
          <Card className="p-8 text-center" data-testid="card-no-tracks">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Tracks Available</h3>
            <p className="text-gray-500">There are no published tracks available for learning yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tracks.map((track, index) => {
              const trackTitle = (track as any).title || (track as any).name || "Untitled";
              return (
              <Card
                key={track.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setLocation(`/tracks/${track.id}`)}
                data-testid={`card-track-${track.id}`}
              >
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-medium" data-testid={`text-track-number-${track.id}`}>Track {index + 1}</span>
                        <span>•</span>
                        <span data-testid={`text-chapter-count-${track.id}`}>{(track as any).chapterCount || 0} chapters</span>
                      </div>
                      <CardTitle className="text-lg" data-testid={`text-track-title-${track.id}`}>{trackTitle}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2" data-testid={`text-track-description-${track.id}`}>
                    {track.description || "No description available"}
                  </p>
                  <Button
                    className="w-full"
                    variant="outline"
                    color="indigo"
                    data-testid={`button-view-track-${track.id}`}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    View Chapters
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </Button>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
