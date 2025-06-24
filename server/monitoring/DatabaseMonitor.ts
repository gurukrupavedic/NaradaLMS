/**
 * DatabaseMonitor - Database performance monitoring utilities
 * 
 * Provides comprehensive database performance tracking including query timing,
 * connection pool monitoring, and database operation metrics. Integrates with
 * the main performance monitoring system for centralized analytics.
 * 
 * @author Vedic LMS Team
 * @since 2025-06-24
 */

import { performanceMonitor } from '@shared/monitoring/PerformanceMonitor';

interface QueryMetrics {
  operation: string;
  startTime: number;
  endTime?: number;
  recordCount?: number;
  error?: Error;
}

interface ConnectionPoolMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingCount: number;
}

class DatabaseMonitor {
  private activeQueries: Map<string, QueryMetrics> = new Map();
  private poolMetrics: ConnectionPoolMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    waitingCount: 0
  };

  /**
   * Start tracking a database query
   * @param operation - Type of database operation
   * @param queryId - Unique identifier for this query
   * @returns Query tracking object
   */
  startQuery(operation: string, queryId?: string): string {
    const id = queryId || this.generateQueryId();
    const metrics: QueryMetrics = {
      operation,
      startTime: Date.now()
    };
    
    this.activeQueries.set(id, metrics);
    return id;
  }

  /**
   * Complete query tracking and record metrics
   * @param queryId - Query identifier from startQuery
   * @param recordCount - Number of records affected/returned
   * @param error - Error if query failed
   */
  endQuery(queryId: string, recordCount?: number, error?: Error): void {
    const metrics = this.activeQueries.get(queryId);
    if (!metrics) return;

    metrics.endTime = Date.now();
    metrics.recordCount = recordCount;
    metrics.error = error;

    const duration = metrics.endTime - metrics.startTime;

    // Record performance metric
    performanceMonitor.trackQuery(metrics.operation, duration, recordCount);

    // Track errors separately
    if (error) {
      performanceMonitor.trackError(error, `Database query: ${metrics.operation}`);
    }

    // Clean up
    this.activeQueries.delete(queryId);
  }

  /**
   * Update connection pool metrics
   * @param poolStats - Current connection pool statistics
   */
  updatePoolMetrics(poolStats: Partial<ConnectionPoolMetrics>): void {
    this.poolMetrics = { ...this.poolMetrics, ...poolStats };
    
    // Record pool metrics
    performanceMonitor.trackCustomMetric('connection_pool', this.poolMetrics.activeConnections, {
      totalConnections: this.poolMetrics.totalConnections,
      activeConnections: this.poolMetrics.activeConnections,
      idleConnections: this.poolMetrics.idleConnections,
      waitingCount: this.poolMetrics.waitingCount
    });
  }

  /**
   * Wrap a database operation with automatic performance tracking
   * @param operation - Operation name
   * @param queryFn - Database operation function
   * @returns Wrapped function with performance tracking
   */
  wrapQuery<T>(operation: string, queryFn: () => Promise<T>): Promise<T> {
    const queryId = this.startQuery(operation);
    
    return queryFn()
      .then(result => {
        // Try to determine record count from result
        let recordCount: number | undefined;
        if (Array.isArray(result)) {
          recordCount = result.length;
        } else if (result && typeof result === 'object' && 'rowCount' in result) {
          recordCount = (result as any).rowCount;
        }
        
        this.endQuery(queryId, recordCount);
        return result;
      })
      .catch(error => {
        this.endQuery(queryId, undefined, error);
        throw error;
      });
  }

  /**
   * Get current pool metrics
   * @returns Current connection pool statistics
   */
  getPoolMetrics(): ConnectionPoolMetrics {
    return { ...this.poolMetrics };
  }

  /**
   * Get active query count
   * @returns Number of currently active queries
   */
  getActiveQueryCount(): number {
    return this.activeQueries.size;
  }

  /**
   * Get long-running queries (over threshold)
   * @param thresholdMs - Threshold in milliseconds
   * @returns Array of long-running query information
   */
  getLongRunningQueries(thresholdMs: number = 5000): Array<{
    operation: string;
    duration: number;
    queryId: string;
  }> {
    const now = Date.now();
    const longRunning: Array<{
      operation: string;
      duration: number;
      queryId: string;
    }> = [];

    for (const [queryId, metrics] of this.activeQueries.entries()) {
      const duration = now - metrics.startTime;
      if (duration > thresholdMs) {
        longRunning.push({
          operation: metrics.operation,
          duration,
          queryId
        });
      }
    }

    return longRunning;
  }

  /**
   * Force cleanup of stale query tracking
   * @param maxAgeMs - Maximum age for query tracking
   */
  cleanup(maxAgeMs: number = 60000): void {
    const cutoff = Date.now() - maxAgeMs;
    
    for (const [queryId, metrics] of this.activeQueries.entries()) {
      if (metrics.startTime < cutoff) {
        console.warn(`Cleaning up stale query tracking: ${metrics.operation}`);
        this.activeQueries.delete(queryId);
      }
    }
  }

  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const databaseMonitor = new DatabaseMonitor();
export { DatabaseMonitor };