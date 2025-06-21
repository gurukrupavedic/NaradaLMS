import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/Landing";
import SimpleDashboard from "@/components/simple-dashboard";
import NotFound from "@/pages/not-found";
import TrackView from "@/pages/TrackView";
import ChapterView from "@/pages/ChapterView";
import ManageTrackList from "@/pages/ManageTrackList";
import ManageChapterList from "@/pages/ManageChapterList";
import ChapterEditor from "@/pages/ChapterEditor";

import Experiment1_SegmentationStudio from "@/pages/Experiment1_SegmentationStudio";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={() => <SimpleDashboard user={user as any} />} />
          <Route path="/dashboard" component={() => <SimpleDashboard user={user as any} />} />
          {/* Content Management Routes */}
          <Route path="/manage" component={() => <ContentManagement />} />
          <Route path="/manage/tracks/:trackId" component={() => <TrackChapters />} />
          <Route path="/manage/tracks/:trackId/chapters/:chapterId" component={() => <ChapterEditor />} />
          
          {/* Legacy redirects for old content-management URLs */}
          <Route path="/content-management" component={() => <ContentManagement />} />
          <Route path="/content-management/tracks/:trackId" component={() => <TrackChapters />} />
          <Route path="/content-management/tracks/:trackId/chapters/:chapterId" component={() => <ChapterEditor />} />

          {/* EXPERIMENT1: Experimental segmentation studio routes */}
          <Route path="/experiment1" component={() => <Experiment1_SegmentationStudio />} />
          <Route path="/experiment1/segmentation-studio/:chapterId" component={Experiment1_SegmentationStudio} />
          <Route path="/tracks/:trackId" component={TrackView} />
          <Route path="/chapters/:id" component={ChapterView} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
