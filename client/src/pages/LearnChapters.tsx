import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, ChevronRight, Play } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading";
import type { Track } from "@shared/schema";

interface Chapter {
  id: number;
  trackId: number;
  title: string;
  description: string;
  order: number;
  status: "draft" | "published";
}

export function LearnChapters() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/tracks/:trackId");
  const trackId = params?.trackId;

  const { data: tracks } = useQuery<Track[]>({
    queryKey: ["/api/tracks"],
  });

  const track = tracks?.find((t) => t.id.toString() === trackId);

  const { data: chapters = [], isLoading } = useQuery<Chapter[]>({
    queryKey: [`/api/chapters/${trackId}`],
    enabled: !!trackId,
  });

  const publishedChapters = chapters
    .filter((chapter) => chapter.status === "published")
    .sort((a, b) => a.order - b.order);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
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
              size="sm"
              onClick={() => setLocation("/tracks")}
              data-testid="button-back-tracks"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              All Tracks
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900" data-testid="text-track-title">
                {track?.title || "Track Chapters"}
              </h1>
              <p className="text-sm text-gray-600">{track?.description || "Browse available chapters"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {publishedChapters.length === 0 ? (
          <Card className="p-8 text-center" data-testid="card-no-chapters">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Chapters Available</h3>
            <p className="text-gray-500">There are no published chapters in this track yet.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {publishedChapters.map((chapter, index) => (
              <Card
                key={chapter.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setLocation(`/chapter/${chapter.id}`)}
                data-testid={`card-chapter-${chapter.id}`}
              >
                <CardContent className="flex items-center p-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-bold mr-4" data-testid={`text-chapter-order-${chapter.id}`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900" data-testid={`text-chapter-title-${chapter.id}`}>{chapter.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-1" data-testid={`text-chapter-description-${chapter.id}`}>
                      {chapter.description || "No description"}
                    </p>
                  </div>
                  <Badge variant="green" className="mr-4" data-testid={`badge-chapter-status-${chapter.id}`}>Published</Badge>
                  <Button variant="outline" size="sm" data-testid={`button-study-chapter-${chapter.id}`}>
                    <Play className="h-4 w-4 mr-2" />
                    Study
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
