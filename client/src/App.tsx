import React, { Suspense, lazy } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary, AppErrorFallback } from "@/components/ui/error-boundary";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useAuth } from "@/features/shared/hooks/useAuth";
import { useWarmTrackCache } from "@/lib/query-prefetch";
import { ThemeProvider } from "@/components/ThemeProvider";



// Phase 5A: Bundle Optimization - Route-based code splitting
const AuthPage = lazy(() => import("@/features/shared/pages/AuthPage").then(module => ({ default: module.AuthPage })));
const PendingApproval = lazy(() => import("@/features/shared/pages/PendingApproval").then(module => ({ default: module.PendingApproval })));
const NotFound = lazy(() => import("@/features/shared/pages/NotFound").then(module => ({ default: module.NotFound })));
const AppShell = lazy(() => import("@/components/AppShell"));


// Simple inline NotFound component
const SimpleNotFound = () => {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-mukta-canvas dark:bg-nila-infinite">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-nila-base dark:text-nila-surface opacity-10 mb-4">404</h1>
        <div className="relative -mt-16 z-10 space-y-4">
          <h2 className="text-2xl font-semibold text-nila-text dark:text-dhavala-text">Page Not Found</h2>
          <p className="text-nila-muted dark:text-nila-muted-dark">The wisdom you seek lies elsewhere.</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2 bg-nila-base text-white rounded-lg hover:bg-nila-surface transition-colors border border-nila-surface"
          >
            Return Home
          </button>
        </div>
      </div>
    </div>
  );
};



// Redirect helper
const RedirectToLogin = () => {
  const [, navigate] = useLocation();
  React.useEffect(() => {
    navigate('/login');
  }, [navigate]);
  return <LoadingScreen message="Redirecting to login..." />;
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
          <Route path="/" component={AuthPage} />
          <Route path="/login" component={AuthPage} />
          <Route path="/register" component={AuthPage} />


          {/* Redirect unauthenticated /app attempts to login */}
          <Route path="/app" component={RedirectToLogin} />
          <Route path="/app/:rest*" component={RedirectToLogin} />



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

  // Authenticated routes - all users go to new-ui
  return (
    <Suspense fallback={<LoadingScreen message="Loading..." />}>
      <Switch>
        {/* New-UI Routes - All authenticated users */}
        <Route path="/app/content/tracks/:trackId/chapters/:chapterId" component={AppShell} />
        <Route path="/app" component={AppShell} />
        <Route path="/app/:section" component={AppShell} />
        <Route path="/app/:section/:subsection" component={AppShell} />
        <Route path="/app/:section/:subsection/:detail" component={AppShell} />

        {/* Root redirect to app */}
        <Route path="/" component={() => {
          const [, navigate] = useLocation();
          React.useEffect(() => {
            navigate('/app');
          }, []);
          return <LoadingScreen message="Redirecting..." />;
        }} />



        {/* 404 for all other routes */}
        <Route component={SimpleNotFound} />
      </Switch>
    </Suspense>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="naradalms-theme">
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
