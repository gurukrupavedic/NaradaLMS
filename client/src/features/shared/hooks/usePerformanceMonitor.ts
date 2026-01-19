/**
 * usePerformanceMonitor - React hook for component performance monitoring
 * 
 * Provides easy-to-use React integration for performance monitoring,
 * including component lifecycle tracking, user interaction measurement,
 * and automatic performance data collection.
 * 
 * @example
 * ```tsx
 * function ChapterEditor() {
 *   const { trackComponentLoad, trackUserInteraction, getMetrics } = usePerformanceMonitor('ChapterEditor');
 *   
 *   useEffect(() => {
 *     trackComponentLoad();
 *   }, []);
 *   
 *   const handleSave = () => {
 *     const endTracking = trackUserInteraction('chapter_save');
 *     // ... save logic
 *     endTracking();
 *   };
 *   
 *   return <div>...</div>;
 * }
 * ```
 * 
 * @author Narada LMS Team
 * @since 2025-06-24
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { performanceMonitor } from '@shared/monitoring/PerformanceMonitor';
import { metricsCollector } from '@shared/monitoring/MetricsCollector';
import { PerformanceMetric, MetricType } from '@shared/monitoring/types';

interface UsePerformanceMonitorReturn {
  /**
   * Track component loading performance
   * @param customLoadTime - Optional custom load time, uses automatic detection if not provided
   */
  trackComponentLoad: (customLoadTime?: number) => void;

  /**
   * Track user interaction performance
   * @param interactionType - Type of interaction being tracked
   * @returns Function to end tracking and record the interaction time
   */
  trackUserInteraction: (interactionType: string) => () => void;

  /**
   * Track custom performance metric
   * @param metricType - Type of metric to track
   * @param value - Metric value
   * @param metadata - Additional metadata
   */
  trackCustomMetric: (metricType: MetricType, value: number, metadata?: Record<string, any>) => void;

  /**
   * Get performance metrics for this component
   * @param timeRangeMs - Time range to retrieve metrics for
   */
  getMetrics: (timeRangeMs?: number) => PerformanceMetric[];

  /**
   * Get performance trends for this component
   * @param metricType - Type of metric to analyze
   * @param timeRangeMs - Time range for trend analysis
   */
  getTrends: (metricType: MetricType, timeRangeMs?: number) => any;

  /**
   * Current performance status
   */
  performanceStatus: {
    isTracking: boolean;
    activeInteractions: number;
    lastMetricTime: number | null;
  };
}

interface PerformanceHookOptions {
  /**
   * Whether to automatically track component mount/unmount
   */
  autoTrackLifecycle?: boolean;

  /**
   * Whether to track render performance
   */
  trackRenders?: boolean;

  /**
   * Minimum interaction time to track (ms)
   */
  minInteractionTime?: number;

  /**
   * Custom metadata to include with all metrics
   */
  metadata?: Record<string, any>;
}

/**
 * React hook for component-level performance monitoring
 * @param componentName - Unique name for the component being monitored
 * @param options - Configuration options for performance tracking
 * @returns Performance monitoring utilities and status
 */
export function usePerformanceMonitor(
  componentName: string,
  options: PerformanceHookOptions = {}
): UsePerformanceMonitorReturn {
  const {
    autoTrackLifecycle = true,
    trackRenders = false,
    minInteractionTime = 100,
    metadata = {}
  } = options;

  const mountTimeRef = useRef<number>(Date.now());
  const renderCountRef = useRef<number>(0);
  const activeInteractionsRef = useRef<Map<string, number>>(new Map());

  const [performanceStatus, setPerformanceStatus] = useState({
    isTracking: true,
    activeInteractions: 0,
    lastMetricTime: null as number | null
  });

  // Track component mount
  useEffect(() => {
    if (autoTrackLifecycle) {
      const loadTime = Date.now() - mountTimeRef.current;
      performanceMonitor.trackComponentLoad(componentName, loadTime);

      setPerformanceStatus(prev => ({
        ...prev,
        lastMetricTime: Date.now()
      }));
    }

    // Track component unmount
    return () => {
      if (autoTrackLifecycle) {
        const sessionDuration = Date.now() - mountTimeRef.current;
        performanceMonitor.trackCustomMetric('component_session', sessionDuration, {
          componentName,
          sessionDuration,
          renderCount: renderCountRef.current,
          ...metadata
        });
      }
    };
  }, [componentName, autoTrackLifecycle, metadata]);

  // Track renders if enabled
  useEffect(() => {
    if (trackRenders) {
      renderCountRef.current += 1;

      // Track render performance every 10 renders to avoid spam
      if (renderCountRef.current % 10 === 0) {
        performanceMonitor.trackCustomMetric('component_renders', renderCountRef.current, {
          componentName,
          renderCount: renderCountRef.current,
          ...metadata
        });
      }
    }
  });

  /**
   * Track component loading performance
   */
  const trackComponentLoad = useCallback((customLoadTime?: number) => {
    const loadTime = customLoadTime || (Date.now() - mountTimeRef.current);
    performanceMonitor.trackComponentLoad(componentName, loadTime);

    setPerformanceStatus(prev => ({
      ...prev,
      lastMetricTime: Date.now()
    }));
  }, [componentName]);

  /**
   * Track user interaction performance
   */
  const trackUserInteraction = useCallback((interactionType: string) => {
    const startTime = Date.now();
    const interactionId = `${interactionType}_${startTime}`;

    activeInteractionsRef.current.set(interactionId, startTime);

    setPerformanceStatus(prev => ({
      ...prev,
      activeInteractions: activeInteractionsRef.current.size
    }));

    // Return function to end tracking
    return () => {
      const endTime = Date.now();
      const duration = endTime - startTime;

      activeInteractionsRef.current.delete(interactionId);

      // Only track if above minimum threshold
      if (duration >= minInteractionTime) {
        performanceMonitor.trackCustomMetric('user_interaction', duration, {
          componentName,
          interactionType,
          duration,
          ...metadata
        });

        setPerformanceStatus(prev => ({
          ...prev,
          activeInteractions: activeInteractionsRef.current.size,
          lastMetricTime: Date.now()
        }));
      }
    };
  }, [componentName, minInteractionTime, metadata]);

  /**
   * Track custom performance metric
   */
  const trackCustomMetric = useCallback((
    metricType: MetricType,
    value: number,
    customMetadata?: Record<string, any>
  ) => {
    performanceMonitor.trackCustomMetric(metricType, value, {
      componentName,
      ...metadata,
      ...customMetadata
    });

    setPerformanceStatus(prev => ({
      ...prev,
      lastMetricTime: Date.now()
    }));
  }, [componentName, metadata]);

  /**
   * Get performance metrics for this component
   */
  const getMetrics = useCallback((timeRangeMs: number = 3600000) => {
    const report = performanceMonitor.generateReport(Date.now() - timeRangeMs);
    return report.metrics.filter(metric =>
      metric.metadata?.componentName === componentName
    );
  }, [componentName]);

  /**
   * Get performance trends for this component
   */
  const getTrends = useCallback((metricType: MetricType, timeRangeMs: number = 3600000) => {
    return metricsCollector.getPerformanceTrends(metricType, timeRangeMs);
  }, []);

  return {
    trackComponentLoad,
    trackUserInteraction,
    trackCustomMetric,
    getMetrics,
    getTrends,
    performanceStatus
  };
}

/**
 * Hook for tracking API call performance
 * @param apiName - Name of the API being called
 * @returns Function to track API call timing
 */
export function useApiPerformanceTracking(apiName: string) {
  return useCallback((endpoint: string, method: string = 'GET') => {
    const startTime = Date.now();

    return {
      /**
       * Complete the API tracking with response information
       * @param statusCode - HTTP status code
       * @param bodySize - Optional response body size
       */
      complete: (statusCode: number, bodySize?: number) => {
        const duration = Date.now() - startTime;
        performanceMonitor.trackApiResponse(endpoint, method, statusCode, duration, bodySize);
      },

      /**
       * Mark API call as failed
       * @param error - Error that occurred
       */
      error: (error: Error | string) => {
        const duration = Date.now() - startTime;
        performanceMonitor.trackError(error, `API call: ${method} ${endpoint}`);
        performanceMonitor.trackApiResponse(endpoint, method, 0, duration);
      }
    };
  }, [apiName]);
}

/**
 * Hook for tracking audio performance
 * @param audioContext - Context for audio operations
 * @returns Audio performance tracking utilities
 */
export function useAudioPerformanceTracking(audioContext: string = 'general') {
  return {
    /**
     * Track audio file loading
     * @param fileSize - Size of audio file in bytes
     * @returns Function to complete timing
     */
    trackAudioLoad: useCallback((fileSize: number) => {
      const startTime = Date.now();
      return () => {
        const loadTime = Date.now() - startTime;
        performanceMonitor.trackAudioLoad(fileSize, loadTime, 'load');
      };
    }, []),

    /**
     * Track audio processing operation
     * @param operationType - Type of audio processing
     * @returns Function to complete timing
     */
    trackAudioProcessing: useCallback((operationType: string) => {
      const startTime = Date.now();
      return () => {
        const processingTime = Date.now() - startTime;
        performanceMonitor.trackCustomMetric('audio_processing', processingTime, {
          audioContext,
          operationType,
          duration: processingTime
        });
      };
    }, [audioContext])
  };
}

export default usePerformanceMonitor;