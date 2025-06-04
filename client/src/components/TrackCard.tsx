import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock } from "lucide-react";

interface Track {
  id: string;
  title: string;
  description: string;
  order: number;
  status: string;
  chapterCount: number;
  completedChapters: number;
  currentLevel: number;
  estimatedHours: number;
}

interface TrackCardProps {
  track: Track;
  onContinue: () => void;
}

export default function TrackCard({ track, onContinue }: TrackCardProps) {
  const progressPercentage = track.chapterCount > 0 ? (track.completedChapters / track.chapterCount) * 100 : 0;
  const isCompleted = track.completedChapters === track.chapterCount && track.chapterCount > 0;
  const isStarted = track.completedChapters > 0;

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

  const getButtonText = () => {
    if (isCompleted) return 'Review';
    if (isStarted) return 'Continue';
    return 'Start';
  };

  const getButtonVariant = () => {
    if (isCompleted) return 'outline';
    return 'default';
  };

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-primary mb-2">
              {track.title}
            </h3>
            <p className="text-muted-foreground text-sm mb-3 leading-relaxed">
              {track.description}
            </p>
            
            <div className="flex items-center space-x-4 mb-3">
              <span className="text-sm text-muted-foreground flex items-center">
                <BookOpen className="h-4 w-4 mr-1" />
                {track.chapterCount} Chapter{track.chapterCount !== 1 ? 's' : ''}
              </span>
              <span className="text-sm text-muted-foreground flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                ~{track.estimatedHours} hour{track.estimatedHours !== 1 ? 's' : ''}
              </span>
              <Badge className={getLevelColor(track.currentLevel)}>
                {getLevelLabel(track.currentLevel)}
              </Badge>
            </div>
            
            <div className="space-y-1">
              <Progress value={progressPercentage} className="h-2" />
              <span className="text-xs text-muted-foreground">
                {track.completedChapters} of {track.chapterCount} chapters completed
              </span>
            </div>
          </div>
          
          <Button 
            onClick={onContinue}
            variant={getButtonVariant()}
            className="ml-4 px-6"
          >
            {getButtonText()}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
