import React, { Suspense, lazy } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary, AppErrorFallback } from "@/components/ui/error-boundary";
import { LoadingScreen } from "@/components/ui/loading-screen";
import InstructorMatrixPrototype from "@/temp-prototype/InstructorMatrixPrototype";
import { TracksAndChaptersAccordion } from "@/temp-prototype/content-studio-refine/TracksAndChaptersAccordion";
import { TracksAndChaptersColumn } from "@/temp-prototype/content-studio-refine/TracksAndChaptersColumn";
import { TracksAndChaptersRefined } from "@/temp-prototype/content-studio-refine/TracksAndChaptersRefined";
import { useAuth } from "@/features/shared-features/hooks/useAuth";
import { useWarmTrackCache } from "@/lib/query-prefetch";
import { ThemeProvider } from "@/components/ThemeProvider";
import { NEW_UI_ENABLED } from "@/lib/featureFlags";

// Phase 5A: Bundle Optimization - Route-based code splitting
const Landing = lazy(() => import("@/features/shared-features/pages/Landing").then(module => ({ default: module.Landing })));
const Login = lazy(() => import("@/features/shared-features/pages/Login").then(module => ({ default: module.Login })));
const Register = lazy(() => import("@/features/shared-features/pages/Register").then(module => ({ default: module.Register })));
const PendingApproval = lazy(() => import("@/features/shared-features/pages/PendingApproval").then(module => ({ default: module.PendingApproval })));
const NotFound = lazy(() => import("@/features/shared-features/pages/NotFound").then(module => ({ default: module.NotFound })));
const SimpleDashboard = lazy(() => import("@/features/shared-features/components/SimpleDashboard"));

const ManageTracks = lazy(() => import("@/features/content-management/pages/ManageTracks").then(module => ({ default: module.ManageTracks })));
const ManageChapters = lazy(() => import("@/features/content-management/pages/ManageChapters").then(module => ({ default: module.ManageChapters })));
const EditChapter = lazy(() => import("@/features/content-management/pages/EditChapter").then(module => ({ default: module.EditChapter })));
const ManageUsers = lazy(() => import("@/features/user-management/pages/ManageUsers").then(module => ({ default: module.ManageUsers })));
const ManageBatches = lazy(() => import("@/features/batch-management/pages/ManageBatches").then(module => ({ default: module.ManageBatches })));
const LearnTracks = lazy(() => import("@/features/learning/pages/LearnTracks").then(module => ({ default: module.LearnTracks })));
const LearnChapters = lazy(() => import("@/features/learning/pages/LearnChapters").then(module => ({ default: module.LearnChapters })));
const StudyChapter = lazy(() => import("@/features/learning/pages/StudyChapter").then(module => ({ default: module.StudyChapter })));
const DesignSystemExperiment = lazy(() => import("@/design-system/DesignSystemExperiment"));
const ThemingPlayground = lazy(() => import("@/design-system/ThemingPlayground").then(module => ({ default: module.ThemingPlayground })));
const AppShell = lazy(() => import("@/new-ui/AppShell"));

// Simple inline NotFound component
const SimpleNotFound = () => {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">Page not found</p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go Home
        </button>
      </div>
    </div>
  );
};



function Router() {
  const { isAuthenticated, isLoading, user, isPendingApproval } = useAuth();
  const [location, navigate] = useLocation();

  // Phase 5C: Background cache warming
  useWarmTrackCache();

  // SAFETY: If authenticated user lands on /login or /register, redirect to home
  React.useEffect(() => {
    if (isAuthenticated && (location === '/login' || location === '/register')) {
      navigate('/');
    }
  }, [isAuthenticated, location, navigate]);

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

  // Unauthenticated routes
  if (!isAuthenticated) {
    return (
      <Suspense fallback={<LoadingScreen message="Loading..." />}>
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route component={SimpleNotFound} />
        </Switch>
      </Suspense>
    );
  }

  // Pending approval routes
  if (isPendingApproval) {
    return (
      <Suspense fallback={<LoadingScreen message="Loading..." />}>
        <Switch>
          <Route path="/pending-approval" component={PendingApproval} />
          <Route component={SimpleNotFound} />
        </Switch>
      </Suspense>
    );
  }

  // Authenticated routes
  return (
    <Suspense fallback={<LoadingScreen message="Loading..." />}>
      <Switch>
        {NEW_UI_ENABLED && (
          <>
            {/* Specific deep route for Content Studio - must come before general patterns */}
            <Route path="/app/content/tracks/:trackId/chapters/:chapterId" component={AppShell} />
            {/* General explicit routes for new UI */}
            <Route path="/app" component={AppShell} />
            <Route path="/app/:section" component={AppShell} />
            <Route path="/app/:section/:subsection" component={AppShell} />
            <Route path="/app/:section/:subsection/:detail" component={AppShell} />
          </>
        )}
        <Route path="/" component={() => <SimpleDashboard user={user as any} />} />
        <Route path="/dashboard" component={() => <SimpleDashboard user={user as any} />} />
        <Route path="/home" component={() => <SimpleDashboard user={user as any} />} />

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
        <Route path="/experiments/theming-playground" component={ThemingPlayground} />
        <Route path="/experiments/audio-player" component={lazy(() => import("@/temp-prototype/AudioPlayerPlayground"))} />

        {/* TEMPORARY PROTOTYPES */}
        <Route path="/prototype/matrix" component={InstructorMatrixPrototype} />
        <Route path="/prototype/tracks-accordion" component={TracksAndChaptersAccordion} />
        <Route path="/prototype/tracks-column" component={TracksAndChaptersColumn} />
        <Route path="/prototype/content-studio-refine" component={TracksAndChaptersRefined} />

        <Route component={SimpleNotFound} />
      </Switch>
    </Suspense>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="vediclms-theme">
        <TooltipProvider>
          <Toaster />
          <ErrorBoundary fallback={<AppErrorFallback />}>
            <Router />
          </ErrorBoundary>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
