import React, { Suspense, lazy } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary, AppErrorFallback } from "@/components/ui/error-boundary";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useAuth } from "@/features/shared-features/hooks/useAuth";
import { useWarmTrackCache } from "@/lib/query-prefetch";

// Phase 5A: Bundle Optimization - Route-based code splitting
const Landing = lazy(() => import("@/features/shared-features/pages/Landing").then(module => ({ default: module.Landing })));
const Login = lazy(() => import("@/features/shared-features/pages/Login").then(module => ({ default: module.Login })));
const Register = lazy(() => import("@/features/shared-features/pages/Register").then(module => ({ default: module.Register })));
const PendingApproval = lazy(() => import("@/features/shared-features/pages/PendingApproval").then(module => ({ default: module.PendingApproval })));
const SimpleDashboard = lazy(() => import("@/features/shared-features/components/SimpleDashboard"));
const NotFound = lazy(() => import("@/features/shared-features/pages/NotFound").then(module => ({ default: module.NotFound })));

const ManageTracks = lazy(() => import("@/features/content-management/pages/ManageTracks").then(module => ({ default: module.ManageTracks })));
const ManageChapters = lazy(() => import("@/features/content-management/pages/ManageChapters").then(module => ({ default: module.ManageChapters })));
const EditChapter = lazy(() => import("@/features/content-management/pages/EditChapter").then(module => ({ default: module.EditChapter })));
const ManageUsers = lazy(() => import("@/features/user-management/pages/ManageUsers").then(module => ({ default: module.ManageUsers })));
const ManageBatches = lazy(() => import("@/features/batch-management/pages/ManageBatches").then(module => ({ default: module.ManageBatches })));
const LearnTracks = lazy(() => import("@/features/learning/pages/LearnTracks").then(module => ({ default: module.LearnTracks })));
const LearnChapters = lazy(() => import("@/features/learning/pages/LearnChapters").then(module => ({ default: module.LearnChapters })));
const StudyChapter = lazy(() => import("@/features/learning/pages/StudyChapter").then(module => ({ default: module.StudyChapter })));
const DesignSystemExperiment = lazy(() => import("@/design-system/DesignSystemExperiment"));

function Router() {
  const { isAuthenticated, isLoading, user, isPendingApproval } = useAuth();
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

  // Redirect to pending approval if user status is pending
  if (isAuthenticated && isPendingApproval && location !== "/pending-approval") {
    navigate("/pending-approval");
  }

  return (
    <Suspense fallback={<LoadingScreen message="Loading application..." />}>
      <Switch>
        {!isAuthenticated ? (
          <>
            <Route path="/" component={Landing} />
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />
            <Route component={NotFound} />
          </>
        ) : isPendingApproval ? (
          <>
            <Route path="/pending-approval" component={PendingApproval} />
            <Route component={() => { navigate("/pending-approval"); return null; }} />
          </>
        ) : (
          <>
            <Route path="/" component={() => <SimpleDashboard user={user as any} />} />
            <Route path="/dashboard" component={() => <SimpleDashboard user={user as any} />} />
            {/* Content Management Routes */}
            <Route path="/manage" component={() => <ManageTracks />} />
            <Route path="/manage/tracks/:trackId" component={() => <ManageChapters />} />
            <Route path="/manage/tracks/:trackId/chapters/:chapterId" component={() => <EditChapter />} />
            <Route path="/manage/users" component={() => <ManageUsers />} />
            <Route path="/manage/batches" component={() => <ManageBatches />} />
            
            {/* Legacy redirects for old content-management URLs */}
            <Route path="/content-management" component={() => <ManageTracks />} />
            <Route path="/content-management/tracks/:trackId" component={() => <ManageChapters />} />
            <Route path="/content-management/tracks/:trackId/chapters/:chapterId" component={() => <EditChapter />} />

            {/* Learning Module Routes */}
            <Route path="/tracks" component={() => <LearnTracks />} />
            <Route path="/tracks/:trackId" component={() => <LearnChapters />} />
            <Route path="/chapter/:chapterId" component={() => <StudyChapter />} />
            {/* Learning aliases */}
            <Route path="/learning/tracks" component={() => <LearnTracks />} />
            <Route path="/learning/tracks/:trackId" component={() => <LearnChapters />} />
            <Route path="/learning/chapter/:chapterId" component={() => <StudyChapter />} />

            <Route path="/experiments/design-system" component={DesignSystemExperiment} />

            <Route component={NotFound} />
          </>
        )}
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
