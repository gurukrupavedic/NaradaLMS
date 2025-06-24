import React, { Suspense, lazy } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary, AppErrorFallback } from "@/components/ui/error-boundary";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useAuth } from "@/hooks/useAuth";
import { useWarmTrackCache } from "@/lib/query-prefetch";

// Phase 5A: Bundle Optimization - Route-based code splitting
const Landing = lazy(() => import("@/pages/Landing").then(module => ({ default: module.Landing })));
const SimpleDashboard = lazy(() => import("@/components/SimpleDashboard"));
const NotFound = lazy(() => import("@/pages/NotFound").then(module => ({ default: module.NotFound })));
const DaisyUIExperiments = lazy(() => import("@/pages/DaisyUIExperiments").then(module => ({ default: module.DaisyUIExperiments })));
const TrackView = lazy(() => import("@/pages/TrackView").then(module => ({ default: module.TrackView })));
const ChapterView = lazy(() => import("@/pages/ChapterView").then(module => ({ default: module.ChapterView })));
const ContentManagement = lazy(() => import("@/pages/ContentManagement").then(module => ({ default: module.ContentManagement })));
const TrackChapters = lazy(() => import("@/pages/TrackChapters").then(module => ({ default: module.TrackChapters })));
const ChapterEditor = lazy(() => import("@/pages/ChapterEditor").then(module => ({ default: module.ChapterEditor })));



function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location, navigate] = useLocation();
  
  // Phase 5C: Background cache warming
  useWarmTrackCache();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingScreen message="Loading application..." />}>
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

            <Route path="/tracks/:trackId" component={TrackView} />
            <Route path="/chapters/:id" component={ChapterView} />
            <Route path="/experiments/daisyui" component={DaisyUIExperiments} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <ErrorBoundary fallback={<AppErrorFallback />}>
          <Router />
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
