/**
 * MetricsCollector - Advanced metrics aggregation and analysis
 * 
 * Provides statistical analysis, trending, and alerting capabilities for
 * performance metrics collected by the PerformanceMonitor.
 * 
 * @example
 * ```typescript
 * import { metricsCollector } from '@shared/monitoring/MetricsCollector';
 * 
 * // Get performance trends
 * const trends = metricsCollector.getPerformanceTrends('component_load', 3600000);
 * 
 * // Set up alerting
 * metricsCollector.setAlert('slow_api', {
 *   metric: 'api_response',
 *   threshold: 2000,
 *   action: (metric) => console.warn('Slow API detected:', metric)
 * });
 * ```
 * 
 * @author Vedic LMS Team
 * @since 2025-06-24
 */

import { PerformanceMetric, MetricType } from './types';
import { performanceMonitor } from './PerformanceMonitor';

interface PerformanceTrend {
  metric: MetricType;
  timeRange: { start: number; end: number };
  statistics: {
    count: number;
    average: number;
    median: number;
    min: number;
    max: number;
    percentile95: number;
    standardDeviation: number;
  };
  trend: 'improving' | 'degrading' | 'stable';
  changePercentage: number;
}

interface Alert {
  id: string;
  name: string;
  metric: MetricType;
  condition: 'above' | 'below' | 'equals';
  threshold: number;
  enabled: boolean;
  action: (metric: PerformanceMetric) => void;
}

interface PerformanceInsight {
  type: 'warning' | 'info' | 'critical';
  message: string;
  metric: MetricType;
  value: number;
  recommendation?: string;
}

class MetricsCollector {
  private alerts: Map<string, Alert> = new Map();
  private insights: PerformanceInsight[] = [];
  private trendCache: Map<string, PerformanceTrend> = new Map();

  constructor() {
    // Listen to performance metrics for real-time analysis
    performanceMonitor.addListener(this.analyzeMetric.bind(this));
  }

  /**
   * Calculate performance trends for a specific metric type
   * @param metricType - Type of metric to analyze
   * @param timeRangeMs - Time range in milliseconds to analyze
   * @param compareWithPrevious - Whether to compare with previous period
   * @returns Performance trend analysis
   */
  getPerformanceTrends(
    metricType: MetricType, 
    timeRangeMs: number = 3600000, // Default: 1 hour
    compareWithPrevious: boolean = true
  ): PerformanceTrend {
    const cacheKey = `${metricType}_${timeRangeMs}_${compareWithPrevious}`;
    
    // Check cache first (valid for 5 minutes)
    const cached = this.trendCache.get(cacheKey);
    if (cached && Date.now() - cached.timeRange.end < 300000) {
      return cached;
    }

    const now = Date.now();
    const start = now - timeRangeMs;
    const end = now;

    const report = performanceMonitor.generateReport(start, end);
    const relevantMetrics = report.metrics.filter(m => m.type === metricType);

    if (relevantMetrics.length === 0) {
      const emptyTrend: PerformanceTrend = {
        metric: metricType,
        timeRange: { start, end },
        statistics: {
          count: 0,
          average: 0,
          median: 0,
          min: 0,
          max: 0,
          percentile95: 0,
          standardDeviation: 0
        },
        trend: 'stable',
        changePercentage: 0
      };
      this.trendCache.set(cacheKey, emptyTrend);
      return emptyTrend;
    }

    // Calculate statistics
    const values = relevantMetrics.map(m => m.value).sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const average = sum / count;
    const median = this.calculateMedian(values);
    const min = values[0];
    const max = values[values.length - 1];
    const percentile95 = this.calculatePercentile(values, 95);
    const standardDeviation = this.calculateStandardDeviation(values, average);

    // Calculate trend if comparing with previous period
    let trend: 'improving' | 'degrading' | 'stable' = 'stable';
    let changePercentage = 0;

    if (compareWithPrevious) {
      const previousStart = start - timeRangeMs;
      const previousEnd = start;
      const previousReport = performanceMonitor.generateReport(previousStart, previousEnd);
      const previousMetrics = previousReport.metrics.filter(m => m.type === metricType);

      if (previousMetrics.length > 0) {
        const previousValues = previousMetrics.map(m => m.value);
        const previousAverage = previousValues.reduce((a, b) => a + b, 0) / previousValues.length;
        
        changePercentage = ((average - previousAverage) / previousAverage) * 100;
        
        // For performance metrics, lower is generally better
        if (Math.abs(changePercentage) < 5) {
          trend = 'stable';
        } else if (changePercentage < 0) {
          trend = 'improving'; // Values decreased (better performance)
        } else {
          trend = 'degrading'; // Values increased (worse performance)
        }
      }
    }

    const performanceTrend: PerformanceTrend = {
      metric: metricType,
      timeRange: { start, end },
      statistics: {
        count,
        average,
        median,
        min,
        max,
        percentile95,
        standardDeviation
      },
      trend,
      changePercentage
    };

    this.trendCache.set(cacheKey, performanceTrend);
    return performanceTrend;
  }

  /**
   * Set up performance alert
   * @param name - Unique name for the alert
   * @param alertConfig - Alert configuration
   */
  setAlert(name: string, alertConfig: {
    metric: MetricType;
    condition?: 'above' | 'below' | 'equals';
    threshold: number;
    action: (metric: PerformanceMetric) => void;
  }): void {
    const alert: Alert = {
      id: this.generateId(),
      name,
      metric: alertConfig.metric,
      condition: alertConfig.condition || 'above',
      threshold: alertConfig.threshold,
      enabled: true,
      action: alertConfig.action
    };

    this.alerts.set(name, alert);
  }

  /**
   * Remove performance alert
   * @param name - Name of alert to remove
   */
  removeAlert(name: string): void {
    this.alerts.delete(name);
  }

  /**
   * Enable or disable alert
   * @param name - Alert name
   * @param enabled - Whether alert should be enabled
   */
  toggleAlert(name: string, enabled: boolean): void {
    const alert = this.alerts.get(name);
    if (alert) {
      alert.enabled = enabled;
    }
  }

  /**
   * Get all active alerts
   * @returns Array of active alerts
   */
  getAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Get performance insights and recommendations
   * @param timeRangeMs - Time range to analyze
   * @returns Array of performance insights
   */
  getInsights(timeRangeMs: number = 3600000): PerformanceInsight[] {
    const insights: PerformanceInsight[] = [];
    const metrics: MetricType[] = [
      'component_load',
      'api_response',
      'database_query',
      'audio_load',
      'route_change'
    ];

    metrics.forEach(metricType => {
      const trend = this.getPerformanceTrends(metricType, timeRangeMs);
      
      if (trend.statistics.count === 0) return;

      // Check for slow operations
      if (trend.statistics.percentile95 > this.getThreshold(metricType)) {
        insights.push({
          type: 'warning',
          message: `95th percentile for ${metricType} is ${trend.statistics.percentile95.toFixed(2)}ms`,
          metric: metricType,
          value: trend.statistics.percentile95,
          recommendation: this.getRecommendation(metricType, trend.statistics.percentile95)
        });
      }

      // Check for degrading trends
      if (trend.trend === 'degrading' && Math.abs(trend.changePercentage) > 20) {
        insights.push({
          type: 'critical',
          message: `Performance degradation detected: ${metricType} increased by ${trend.changePercentage.toFixed(1)}%`,
          metric: metricType,
          value: trend.changePercentage,
          recommendation: `Investigate recent changes affecting ${metricType} performance`
        });
      }

      // Check for improvements
      if (trend.trend === 'improving' && Math.abs(trend.changePercentage) > 15) {
        insights.push({
          type: 'info',
          message: `Performance improvement: ${metricType} improved by ${Math.abs(trend.changePercentage).toFixed(1)}%`,
          metric: metricType,
          value: trend.changePercentage
        });
      }
    });

    this.insights = insights;
    return insights;
  }

  /**
   * Clear old insights and trends from cache
   * @param maxAgeMs - Maximum age for cached data
   */
  clearOldData(maxAgeMs: number = 3600000): void {
    const cutoff = Date.now() - maxAgeMs;
    
    // Clear old trend cache
    for (const [key, trend] of this.trendCache.entries()) {
      if (trend.timeRange.end < cutoff) {
        this.trendCache.delete(key);
      }
    }

    // Clear old insights
    this.insights = [];
  }

  /**
   * Export performance data for external analysis
   * @param timeRangeMs - Time range to export
   * @returns Structured performance data
   */
  exportData(timeRangeMs: number = 86400000): any {
    const report = performanceMonitor.generateReport(Date.now() - timeRangeMs);
    const trends = [
      'component_load',
      'api_response', 
      'database_query',
      'audio_load'
    ].map(metric => this.getPerformanceTrends(metric as MetricType, timeRangeMs));

    return {
      timestamp: Date.now(),
      timeRange: timeRangeMs,
      rawMetrics: report.metrics,
      summary: report.summary,
      trends,
      insights: this.getInsights(timeRangeMs),
      alerts: this.getAlerts()
    };
  }

  // Private methods

  private analyzeMetric(metric: PerformanceMetric): void {
    try {
      // Check alerts
      for (const alert of this.alerts.values()) {
        if (!alert.enabled || alert.metric !== metric.type) continue;

        let triggered = false;
        switch (alert.condition) {
          case 'above':
            triggered = metric.value > alert.threshold;
            break;
          case 'below':
            triggered = metric.value < alert.threshold;
            break;
          case 'equals':
            triggered = metric.value === alert.threshold;
            break;
        }

        if (triggered) {
          try {
            alert.action(metric);
          } catch (error) {
            console.warn('Alert action failed:', error);
          }
        }
      }
    } catch (error) {
      console.warn('Metric analysis failed:', error);
    }
  }

  private calculateMedian(values: number[]): number {
    const mid = Math.floor(values.length / 2);
    return values.length % 2 === 0 
      ? (values[mid - 1] + values[mid]) / 2 
      : values[mid];
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * values.length) - 1;
    return values[Math.max(0, Math.min(index, values.length - 1))];
  }

  private calculateStandardDeviation(values: number[], mean: number): number {
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  private getThreshold(metricType: MetricType): number {
    const thresholds = {
      component_load: 1000,
      api_response: 2000,
      database_query: 1000,
      audio_load: 3000,
      route_change: 500,
      chapter_edit: 60000,
      audio_mapping: 30000,
      segmentation: 10000
    };
    return thresholds[metricType] || 1000;
  }

  private getRecommendation(metricType: MetricType, value: number): string {
    const recommendations = {
      component_load: `Consider code splitting or lazy loading for components taking > ${value}ms`,
      api_response: `Optimize database queries or add caching for APIs responding in > ${value}ms`,
      database_query: `Consider query optimization or indexing for queries taking > ${value}ms`,
      audio_load: `Compress audio files or implement progressive loading for files taking > ${value}ms`,
      route_change: `Optimize route components or prefetch data for navigation taking > ${value}ms`
    };
    return recommendations[metricType] || `Investigate performance bottlenecks for ${metricType}`;
  }

  private generateId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const metricsCollector = new MetricsCollector();
export { MetricsCollector };