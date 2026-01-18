/**
 * PerformanceMonitor - Core performance monitoring and metrics collection
 * 
 * Provides comprehensive performance tracking for the Vedic LMS application,
 * including component loading, user interactions, database operations, and
 * audio-specific performance metrics.
 * 
 * @example
 * ```typescript
 * import { performanceMonitor } from '@shared/monitoring/PerformanceMonitor';
 * 
 * // Track component loading
 * performanceMonitor.trackComponentLoad('ChapterEditor', 245);
 * 
 * // Track user interaction
 * performanceMonitor.trackChapterEdit(30000, 1500); // 30s, 1500 words
 * 
 * // Track database query
 * performanceMonitor.trackQuery('getChaptersByTrack', 125, 15);
 * ```
 * 
 * @author Vedic LMS Team
 * @since 2025-06-24
 */

import {
  PerformanceMetric,
  MetricType,
  MonitoringConfig,
  PerformanceReport
} from './types';

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private config: MonitoringConfig = {
    enabled: true,
    sampleRate: 1.0,
    bufferSize: 1000,
    flushInterval: 30000, // 30 seconds
    enabledMetrics: [
      'component_load',
      'route_change',
      'chapter_edit',
      'audio_mapping',
      'segmentation',
      'database_query',
      'audio_load',
      'api_response'
    ],
    thresholds: {
      slowComponentLoad: 1000, // 1 second
      slowApiResponse: 2000, // 2 seconds
      highErrorRate: 5, // 5%
      highMemoryUsage: 512 // 512 MB
    }
  };

  private listeners: ((metric: PerformanceMetric) => void)[] = [];

  /**
   * Initialize the performance monitor with custom configuration
   * @param customConfig - Override default monitoring configuration
   */
  initialize(customConfig?: Partial<MonitoringConfig>): void {
    try {
      this.config = { ...this.config, ...customConfig };

      if (this.config.enabled) {
        this.startPeriodicFlush();
        console.log('Performance monitoring initialized');
      }
    } catch (error) {
      console.warn('Failed to initialize performance monitoring:', error);
      this.config.enabled = false;
    }
  }

  /**
   * Track component loading performance
   * @param componentName - Name of the component being loaded
   * @param loadTime - Time taken to load component in milliseconds
   * @param bundleSize - Optional bundle size in bytes
   */
  trackComponentLoad(componentName: string, loadTime: number, bundleSize?: number): void {
    this.recordMetric('component_load', loadTime, {
      componentName,
      loadTime,
      bundleSize
    });

    // Alert on slow component loads
    if (loadTime > this.config.thresholds.slowComponentLoad) {
      console.warn(`Slow component load detected: ${componentName} took ${loadTime}ms`);
    }
  }

  /**
   * Track route navigation performance
   * @param fromRoute - Previous route path
   * @param toRoute - Destination route path  
   * @param duration - Navigation duration in milliseconds
   */
  trackRouteChange(fromRoute: string, toRoute: string, duration: number): void {
    this.recordMetric('route_change', duration, {
      fromRoute,
      toRoute,
      duration
    });
  }

  /**
   * Track chapter editing workflow performance
   * @param duration - Total editing session duration in milliseconds
   * @param wordCount - Number of words edited
   * @param errorCount - Number of errors encountered
   */
  trackChapterEdit(duration: number, wordCount?: number, errorCount?: number): void {
    this.recordMetric('chapter_edit', duration, {
      duration,
      operationType: 'chapter_edit',
      recordCount: wordCount,
      errorCount
    });
  }

  /**
   * Track audio-text mapping operation performance
   * @param segmentCount - Number of segments mapped
   * @param mappingTime - Time spent on mapping in milliseconds
   * @param errorCount - Number of mapping errors
   */
  trackAudioMapping(segmentCount: number, mappingTime: number, errorCount?: number): void {
    this.recordMetric('audio_mapping', mappingTime, {
      duration: mappingTime,
      operationType: 'audio_mapping',
      recordCount: segmentCount,
      errorCount
    });
  }

  /**
   * Track text segmentation performance
   * @param textLength - Length of text being segmented
   * @param segmentationTime - Time taken for segmentation in milliseconds
   * @param segmentCount - Number of segments created
   */
  trackSegmentation(textLength: number, segmentationTime: number, segmentCount?: number): void {
    this.recordMetric('segmentation', segmentationTime, {
      duration: segmentationTime,
      operationType: 'text_segmentation',
      recordCount: segmentCount || 0,
      textLength
    });
  }

  /**
   * Track database query performance
   * @param operation - Type of database operation
   * @param duration - Query execution time in milliseconds
   * @param recordCount - Number of records affected
   */
  trackQuery(operation: string, duration: number, recordCount?: number): void {
    this.recordMetric('database_query', duration, {
      operation,
      duration,
      recordCount
    });
  }

  /**
   * Track audio file loading and processing
   * @param fileSize - Size of audio file in bytes
   * @param loadTime - Time to load audio file in milliseconds
   * @param operationType - Type of audio operation (load, process, convert)
   */
  trackAudioLoad(fileSize: number, loadTime: number, operationType: string = 'load'): void {
    this.recordMetric('audio_load', loadTime, {
      fileSize,
      duration: loadTime,
      operationType
    });
  }

  /**
   * Track API response performance
   * @param endpoint - API endpoint path
   * @param method - HTTP method
   * @param statusCode - Response status code
   * @param duration - Response time in milliseconds
   * @param bodySize - Optional response body size
   */
  trackApiResponse(endpoint: string, method: string, statusCode: number, duration: number, bodySize?: number): void {
    this.recordMetric('api_response', duration, {
      endpoint,
      method,
      statusCode,
      duration,
      bodySize
    });

    // Alert on slow API responses
    if (duration > this.config.thresholds.slowApiResponse) {
      console.warn(`Slow API response: ${method} ${endpoint} took ${duration}ms`);
    }
  }

  /**
   * Track custom performance metric
   * @param metricType - Type of metric to track
   * @param value - Metric value
   * @param metadata - Additional metadata
   */
  trackCustomMetric(metricType: MetricType, value: number, metadata?: Record<string, any>): void {
    this.recordMetric(metricType, value, metadata);
  }

  /**
   * Track error occurrences
   * @param error - Error object or message
   * @param context - Context where error occurred
   * @param details - Additional error details
   */
  trackError(error: Error | string, context: string, details?: Record<string, any>): void {
    this.recordMetric('error_rate', 1, {
      value: 1,
      context,
      errorMessage: error instanceof Error ? error.message : error,
      details
    });
  }

  /**
   * Generate performance report for given time range
   * @param startTime - Report start time (timestamp)
   * @param endTime - Report end time (timestamp)
   * @returns Performance report with metrics and summary
   */
  generateReport(startTime?: number, endTime?: number): PerformanceReport {
    const now = Date.now();
    const start = startTime || (now - 3600000); // Default: last hour
    const end = endTime || now;

    const filteredMetrics = this.metrics.filter(
      metric => metric.timestamp >= start && metric.timestamp <= end
    );

    // Calculate summary statistics
    const loadTimes = filteredMetrics
      .filter(m => m.type === 'component_load')
      .map(m => m.value);

    const errorCount = filteredMetrics.filter(m => m.type === 'error_rate').length;
    const totalOperations = filteredMetrics.length;

    const operationTimes = new Map<string, { total: number; count: number }>();

    filteredMetrics.forEach(metric => {
      const key = metric.type;
      if (!operationTimes.has(key)) {
        operationTimes.set(key, { total: 0, count: 0 });
      }
      const stats = operationTimes.get(key)!;
      stats.total += metric.value;
      stats.count += 1;
    });

    const topSlowOperations = Array.from(operationTimes.entries())
      .map(([operation, stats]) => ({
        operation,
        averageDuration: stats.total / stats.count,
        callCount: stats.count
      }))
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, 5);

    return {
      timeRange: { start, end },
      metrics: filteredMetrics,
      summary: {
        averageLoadTime: loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length || 0,
        errorRate: totalOperations > 0 ? (errorCount / totalOperations) * 100 : 0,
        topSlowOperations
      }
    };
  }

  /**
   * Add listener for performance metrics
   * @param listener - Function to call when new metrics are recorded
   */
  addListener(listener: (metric: PerformanceMetric) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove performance metric listener
   * @param listener - Listener function to remove
   */
  removeListener(listener: (metric: PerformanceMetric) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Clear all stored metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Disable performance monitoring
   */
  disable(): void {
    this.config.enabled = false;
    this.clearMetrics();
  }

  /**
   * Enable performance monitoring
   */
  enable(): void {
    this.config.enabled = true;
  }

  /**
   * Get current configuration
   */
  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  // Private methods

  private recordMetric(type: MetricType, value: number, metadata?: Record<string, any>): void {
    if (!this.config.enabled || !this.config.enabledMetrics.includes(type)) {
      return;
    }

    // Sample rate check
    if (Math.random() > this.config.sampleRate) {
      return;
    }

    try {
      const metric: PerformanceMetric = {
        id: this.generateId(),
        timestamp: Date.now(),
        type,
        value,
        metadata
      };

      this.metrics.push(metric);

      // Notify listeners
      this.listeners.forEach(listener => {
        try {
          listener(metric);
        } catch (error) {
          console.warn('Performance monitor listener error:', error);
        }
      });

      // Maintain buffer size
      if (this.metrics.length > this.config.bufferSize) {
        this.metrics = this.metrics.slice(-this.config.bufferSize);
      }
    } catch (error) {
      console.warn('Failed to record performance metric:', error);
    }
  }

  private generateId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startPeriodicFlush(): void {
    setInterval(() => {
      try {
        // In a real implementation, this would send metrics to a monitoring service
        const recentMetrics = this.metrics.filter(
          m => Date.now() - m.timestamp < this.config.flushInterval
        );

        if (recentMetrics.length > 0) {
          console.debug(`Performance metrics: ${recentMetrics.length} events recorded`);
        }
      } catch (error) {
        console.warn('Performance monitor flush error:', error);
      }
    }, this.config.flushInterval);
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();
export { PerformanceMonitor };