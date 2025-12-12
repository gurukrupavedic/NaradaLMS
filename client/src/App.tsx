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

const ManageTracks = lazy(() => import("@/pages/ManageTracks").then(module => ({ default: module.ManageTracks })));
const ManageChapters = lazy(() => import("@/pages/ManageChapters").then(module => ({ default: module.ManageChapters })));
const EditChapter = lazy(() => import("@/pages/EditChapter").then(module => ({ default: module.EditChapter })));
const LearnTracks = lazy(() => import("@/pages/LearnTracks").then(module => ({ default: module.LearnTracks })));
const LearnChapters = lazy(() => import("@/pages/LearnChapters").then(module => ({ default: module.LearnChapters })));
const StudyChapter = lazy(() => import("@/pages/StudyChapter").then(module => ({ default: module.StudyChapter })));
const ExperimentsShowcase = lazy(() => import("@/pages/ExperimentsShowcase").then(module => ({ default: module.ExperimentsShowcase })));
const DesignSystemExperiment = lazy(() => import("@/pages/DesignSystemExperiment"));
const AdminPanelExperiment = lazy(() => import("@/pages/AdminPanelExperiment"));
const InstructorPanelExperiment = lazy(() => import("@/pages/InstructorPanelExperiment"));
const StudentDashboardExperiment = lazy(() => import("@/pages/StudentDashboardExperiment"));
const DashboardExperiment = lazy(() => import("@/pages/DashboardExperiment"));
const RoleTabsExperiment = lazy(() => import("@/pages/RoleTabsExperiment"));
const TrackViewExperiment = lazy(() => import("@/pages/TrackViewExperiment").then(module => ({ default: module.TrackViewExperiment })));
const ChapterViewExperiment = lazy(() => import("@/pages/ChapterViewExperiment").then(module => ({ default: module.ChapterViewExperiment })));
const ChapterExperiment = lazy(() => import("@/pages/ChapterExperiment").then(module => ({ default: module.ChapterExperiment })));
const DashboardOldExperiment = lazy(() => import("@/pages/DashboardOldExperiment").then(module => ({ default: module.DashboardOldExperiment })));




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
            <Route path="/manage" component={() => <ManageTracks />} />
            <Route path="/manage/tracks/:trackId" component={() => <ManageChapters />} />
            <Route path="/manage/tracks/:trackId/chapters/:chapterId" component={() => <EditChapter />} />
            
            {/* Legacy redirects for old content-management URLs */}
            <Route path="/content-management" component={() => <ManageTracks />} />
            <Route path="/content-management/tracks/:trackId" component={() => <ManageChapters />} />
            <Route path="/content-management/tracks/:trackId/chapters/:chapterId" component={() => <EditChapter />} />

            {/* Learning Module Routes */}
            <Route path="/tracks" component={() => <LearnTracks />} />
            <Route path="/tracks/:trackId" component={() => <LearnChapters />} />
            <Route path="/chapter/:chapterId" component={() => <StudyChapter />} />

            <Route path="/experiments" component={ExperimentsShowcase} />
            <Route path="/experiments/design-system" component={DesignSystemExperiment} />
            <Route path="/experiments/admin-panel" component={AdminPanelExperiment} />
            <Route path="/experiments/instructor-panel" component={InstructorPanelExperiment} />
            <Route path="/experiments/student-dashboard" component={StudentDashboardExperiment} />
            <Route path="/experiments/dashboard" component={DashboardExperiment} />
            <Route path="/experiments/role-tabs" component={RoleTabsExperiment} />
            <Route path="/experiments/track-view/:trackId" component={TrackViewExperiment} />
            <Route path="/experiments/chapter-view/:id" component={ChapterViewExperiment} />
            <Route path="/experiments/chapter/:id" component={ChapterExperiment} />
            <Route path="/experiments/dashboard-old" component={() => <DashboardOldExperiment onTrackSelect={() => {}} onChapterSelect={() => {}} />} />



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
