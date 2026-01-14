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
import { ThemeProvider } from "@/components/ThemeProvider";

// Phase 5A: Bundle Optimization - Route-based code splitting
const Landing = lazy(() => import("@/features/shared-features/pages/Landing").then(module => ({ default: module.Landing })));
const Login = lazy(() => import("@/features/shared-features/pages/Login").then(module => ({ default: module.Login })));
const Register = lazy(() => import("@/features/shared-features/pages/Register").then(module => ({ default: module.Register })));
const PendingApproval = lazy(() => import("@/features/shared-features/pages/PendingApproval").then(module => ({ default: module.PendingApproval })));
const NotFound = lazy(() => import("@/features/shared-features/pages/NotFound").then(module => ({ default: module.NotFound })));
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
