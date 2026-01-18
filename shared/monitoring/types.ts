/**
 * Performance monitoring type definitions
 * Centralized types for all performance monitoring functionality
 */

export interface PerformanceMetric {
  id: string;
  timestamp: number;
  type: MetricType;
  value: number;
  metadata?: Record<string, any>;
}

export type MetricType =
  | 'component_load'
  | 'route_change'
  | 'bundle_size'
  | 'chapter_edit'
  | 'audio_mapping'
  | 'segmentation'
  | 'database_query'
  | 'connection_pool'
  | 'audio_load'
  | 'audio_processing'
  | 'api_response'
  | 'error_rate'
  | 'memory_usage'
  | 'network_timing'
  | 'component_session'
  | 'component_renders'
  | 'user_interaction';

export interface ComponentLoadMetric extends PerformanceMetric {
  type: 'component_load';
  metadata: {
    componentName: string;
    loadTime: number;
    bundleSize?: number;
  };
}

export interface RouteChangeMetric extends PerformanceMetric {
  type: 'route_change';
  metadata: {
    fromRoute: string;
    toRoute: string;
    duration: number;
  };
}

export interface UserInteractionMetric extends PerformanceMetric {
  type: 'chapter_edit' | 'audio_mapping' | 'segmentation';
  metadata: {
    duration: number;
    operationType: string;
    recordCount?: number;
    errorCount?: number;
  };
}

export interface DatabaseMetric extends PerformanceMetric {
  type: 'database_query' | 'connection_pool';
  metadata: {
    operation: string;
    duration: number;
    recordCount?: number;
    connectionCount?: number;
  };
}

export interface AudioMetric extends PerformanceMetric {
  type: 'audio_load' | 'audio_processing';
  metadata: {
    fileSize?: number;
    duration: number;
    operationType: string;
    quality?: string;
  };
}

export interface ApiMetric extends PerformanceMetric {
  type: 'api_response';
  metadata: {
    endpoint: string;
    method: string;
    statusCode: number;
    duration: number;
    bodySize?: number;
  };
}

export interface SystemMetric extends PerformanceMetric {
  type: 'memory_usage' | 'error_rate';
  metadata: {
    value: number;
    context: string;
    details?: Record<string, any>;
  };
}

export interface PerformanceReport {
  timeRange: {
    start: number;
    end: number;
  };
  metrics: PerformanceMetric[];
  summary: {
    averageLoadTime: number;
    errorRate: number;
    topSlowOperations: Array<{
      operation: string;
      averageDuration: number;
      callCount: number;
    }>;
  };
}

export interface MonitoringConfig {
  enabled: boolean;
  sampleRate: number; // 0-1, percentage of events to sample
  bufferSize: number;
  flushInterval: number; // milliseconds
  enabledMetrics: MetricType[];
  thresholds: {
    slowComponentLoad: number; // ms
    slowApiResponse: number; // ms
    highErrorRate: number; // percentage
    highMemoryUsage: number; // MB
  };
}