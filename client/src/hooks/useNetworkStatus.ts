/**
 * useNetworkStatus - Network connectivity monitoring hook
 * 
 * Monitors network connectivity status and provides offline/online detection
 * with automatic retry mechanisms and user notifications. Integrates with
 * offline storage for seamless user experience during connectivity issues.
 * 
 * @author Vedic LMS Team
 * @since 2025-06-24
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  connectionQuality: 'good' | 'poor' | 'offline';
  lastOnline: Date | null;
  retryCount: number;
  isRetrying: boolean;
}

interface UseNetworkStatusReturn extends NetworkStatus {
  triggerRetry: () => void;
  resetRetryCount: () => void;
}

// Connection quality test configuration
const CONNECTION_TEST_CONFIG = {
  timeout: 5000,
  testUrl: '/api/health', // Fallback to a simple endpoint
  goodThreshold: 1000, // ms
  poorThreshold: 3000, // ms
};

export function useNetworkStatus(): UseNetworkStatusReturn {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    connectionQuality: 'good',
    lastOnline: navigator.onLine ? new Date() : null,
    retryCount: 0,
    isRetrying: false,
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const qualityTestRef = useRef<NodeJS.Timeout>();

  // Test connection quality
  const testConnectionQuality = useCallback(async (): Promise<'good' | 'poor' | 'offline'> => {
    if (!navigator.onLine) return 'offline';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TEST_CONFIG.timeout);

    try {
      const startTime = Date.now();
      
      // Try to fetch a small resource to test connection
      const response = await fetch(CONNECTION_TEST_CONFIG.testUrl, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache',
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (!response.ok) return 'poor';
      
      if (responseTime <= CONNECTION_TEST_CONFIG.goodThreshold) return 'good';
      if (responseTime <= CONNECTION_TEST_CONFIG.poorThreshold) return 'poor';
      
      return 'poor';
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        return 'poor'; // Timeout indicates poor connection
      }
      
      return 'offline';
    }
  }, []);

  // Update network status
  const updateNetworkStatus = useCallback(async () => {
    const isOnline = navigator.onLine;
    const quality = await testConnectionQuality();
    
    setStatus(prev => ({
      ...prev,
      isOnline,
      connectionQuality: quality,
      lastOnline: isOnline ? new Date() : prev.lastOnline,
    }));
  }, [testConnectionQuality]);

  // Handle online/offline events
  const handleOnline = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      isOnline: true,
      lastOnline: new Date(),
      retryCount: 0,
    }));
    
    // Test connection quality after coming online
    if (qualityTestRef.current) {
      clearTimeout(qualityTestRef.current);
    }
    qualityTestRef.current = setTimeout(updateNetworkStatus, 1000);
  }, [updateNetworkStatus]);

  const handleOffline = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      isOnline: false,
      connectionQuality: 'offline',
    }));
  }, []);

  // Manual retry function
  const triggerRetry = useCallback(() => {
    if (status.isRetrying) return;

    setStatus(prev => ({
      ...prev,
      isRetrying: true,
      retryCount: prev.retryCount + 1,
    }));

    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    // Test connection after a brief delay
    retryTimeoutRef.current = setTimeout(async () => {
      await updateNetworkStatus();
      setStatus(prev => ({ ...prev, isRetrying: false }));
    }, 1000);
  }, [status.isRetrying, updateNetworkStatus]);

  // Reset retry count
  const resetRetryCount = useCallback(() => {
    setStatus(prev => ({ ...prev, retryCount: 0 }));
  }, []);

  // Set up event listeners and periodic quality checks
  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connection quality test
    updateNetworkStatus();

    // Periodic connection quality monitoring (every 30 seconds when online)
    const qualityCheckInterval = setInterval(() => {
      if (navigator.onLine && !status.isRetrying) {
        updateNetworkStatus();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(qualityCheckInterval);
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (qualityTestRef.current) {
        clearTimeout(qualityTestRef.current);
      }
    };
  }, [handleOnline, handleOffline, updateNetworkStatus, status.isRetrying]);

  return {
    ...status,
    triggerRetry,
    resetRetryCount,
  };
}

// Hook for monitoring specific request failures
export function useRequestRetry() {
  const networkStatus = useNetworkStatus();
  const [failedRequests, setFailedRequests] = useState<Set<string>>(new Set());

  const markRequestFailed = useCallback((requestId: string) => {
    setFailedRequests(prev => new Set([...prev, requestId]));
  }, []);

  const markRequestSuccess = useCallback((requestId: string) => {
    setFailedRequests(prev => {
      const newSet = new Set(prev);
      newSet.delete(requestId);
      return newSet;
    });
  }, []);

  const retryFailedRequests = useCallback(() => {
    if (networkStatus.isOnline && failedRequests.size > 0) {
      // Trigger retry for all failed requests
      networkStatus.triggerRetry();
      // Clear failed requests list
      setFailedRequests(new Set());
    }
  }, [networkStatus, failedRequests]);

  return {
    networkStatus,
    failedRequestCount: failedRequests.size,
    markRequestFailed,
    markRequestSuccess,
    retryFailedRequests,
  };
}

// Utility hook for showing network status indicators
export function useNetworkIndicator() {
  const networkStatus = useNetworkStatus();
  
  const shouldShowIndicator = 
    !networkStatus.isOnline || 
    networkStatus.connectionQuality === 'poor' ||
    networkStatus.retryCount > 0;

  const indicatorColor = 
    !networkStatus.isOnline ? 'red' :
    networkStatus.connectionQuality === 'poor' ? 'yellow' : 'green';

  const indicatorText = 
    !networkStatus.isOnline ? 'Offline' :
    networkStatus.connectionQuality === 'poor' ? 'Poor Connection' :
    networkStatus.retryCount > 0 ? 'Reconnected' : 'Online';

  return {
    shouldShow: shouldShowIndicator,
    color: indicatorColor,
    text: indicatorText,
    status: networkStatus,
  };
}