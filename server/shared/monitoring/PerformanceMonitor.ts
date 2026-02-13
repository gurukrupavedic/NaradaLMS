/**
 * Stub for performance monitoring. DatabaseMonitor uses optional methods
 * (trackQuery, trackError, trackCustomMetric). Replace with a real implementation
 * when centralized performance monitoring is enabled.
 */
export const performanceMonitor: {
  trackQuery?: (operation: string, duration: number, recordCount?: number) => void;
  trackError?: (error: Error, context?: string) => void;
  trackCustomMetric?: (name: string, value: number, meta?: Record<string, unknown>) => void;
} = {};
