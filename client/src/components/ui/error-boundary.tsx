import React, { Component, ErrorInfo, ReactNode, PropsWithChildren } from 'react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  resetError: () => void;
  goHome: () => void;
}

function DefaultErrorFallback({ error, errorInfo, errorId, resetError, goHome }: ErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen flex items-center justify-center bg-mukta-canvas dark:bg-nila-infinite p-4">
      <Card className="w-full max-w-lg border-vidruma-warn/30 bg-card text-card-foreground">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-vidruma-warn/10">
            <AlertTriangle className="h-6 w-6 text-vidruma-warn" />
          </div>
          <CardTitle className="text-xl font-semibold text-nila-text dark:text-dhavala-text">
            Something went wrong
          </CardTitle>
          <p className="text-sm text-nila-muted dark:text-nila-muted-dark">
            We apologize for the inconvenience. The application encountered an unexpected error.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDevelopment && error && (
            <div className="rounded-md bg-nila-surface/50 p-3">
              <h4 className="text-sm font-medium text-nila-text dark:text-dhavala-text mb-2">Error Details (Development)</h4>
              <p className="text-xs text-nila-text dark:text-nila-muted-dark font-mono break-all">
                {error.message}
              </p>
              {errorInfo && (
                <details className="mt-2">
                  <summary className="text-xs text-nila-muted cursor-pointer dark:text-nila-muted-dark">
                    Component Stack
                  </summary>
                  <pre className="text-xs text-nila-muted dark:text-nila-muted-dark mt-1 overflow-auto max-h-32">
                    {errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
          )}

          <div className="rounded-md bg-nila-surface/50 p-3">
            <p className="text-xs text-nila-text dark:text-dhavala-text">
              Error ID: <span className="font-mono text-hema-base">{errorId}</span>
            </p>
            <p className="text-xs text-nila-muted dark:text-nila-muted-dark mt-1">
              Please include this ID when reporting the issue.
            </p>
          </div>

          <div className="flex gap-3 flex-col sm:flex-row">
            <Button onClick={resetError} className="flex-1 bg-nila-base hover:bg-nila-surface text-white">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button variant="outline" onClick={goHome} className="flex-1 border-nila-muted/30 hover:bg-nila-surface/10">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-nila-muted dark:text-nila-muted-dark">
              If this problem persists, please contact support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export class ErrorBoundary extends Component<PropsWithChildren<ErrorBoundaryProps>, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: PropsWithChildren<ErrorBoundaryProps>) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: generateErrorId(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Boundary Caught Error (${this.state.errorId})`);
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.groupEnd();
    }
  }

  componentDidUpdate(prevProps: PropsWithChildren<ErrorBoundaryProps>) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((key, i) => key !== prevProps.resetKeys?.[i])) {
        this.resetError();
      }
    }

    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetError();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  goHome = () => {
    // Clear error state first
    this.resetError();

    // Navigate to home with a small delay to allow state to clear
    this.resetTimeoutId = window.setTimeout(() => {
      if (typeof window !== 'undefined' && window.location) {
        window.location.href = '/';
      }
    }, 100);
  };

  render() {
    const { hasError, error, errorInfo, errorId } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <DefaultErrorFallback
          error={error}
          errorInfo={errorInfo}
          errorId={errorId}
          resetError={this.resetError}
          goHome={this.goHome}
        />
      );
    }

    return children;
  }
}

// Convenience hook for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error('Manual error report:', error, errorInfo);
    throw error; // Re-throw to trigger error boundary
  };
}

// App-level error fallback component
// App-level error fallback component
export function AppErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-mukta-canvas dark:bg-nila-infinite p-4">
      <Card className="w-full max-w-md bg-white dark:bg-nila-surface border-nila-muted/20 dark:border-hema-base/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-vidruma-warn/10">
            <AlertTriangle className="h-6 w-6 text-vidruma-warn" />
          </div>
          <CardTitle className="text-nila-text dark:text-dhavala-text">Application Error</CardTitle>
          <p className="text-sm text-nila-muted dark:text-nila-muted-dark">
            The application encountered a critical error and needs to be restarted.
          </p>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => window.location.reload()}
            className="w-full bg-hema-base hover:bg-hema-light text-nila-infinite font-semibold"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Restart Application
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
