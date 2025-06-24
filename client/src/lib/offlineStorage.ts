/**
 * Offline Storage Manager
 * 
 * Handles offline data persistence and synchronization when network becomes available.
 * Provides queue management for failed operations and conflict resolution.
 */

import { createApiError } from '@/types/api-errors';

export interface OfflineAction {
  id: string;
  type: 'CREATE_SEGMENT' | 'UPDATE_SEGMENT' | 'DELETE_SEGMENT' | 'UPLOAD_AUDIO' | 'UPDATE_CHAPTER' | 'CREATE_TRACK';
  endpoint: string;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  data?: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  chapterId?: number;
  segmentId?: number;
}

export interface OfflineData {
  segments: Record<string, any>;
  chapters: Record<string, any>;
  tracks: Record<string, any>;
  lastSync: number;
}

class OfflineStorageManager {
  private readonly STORAGE_KEY = 'vedic-lms-offline';
  private readonly QUEUE_KEY = 'vedic-lms-queue';
  private readonly MAX_STORAGE_SIZE = 10 * 1024 * 1024; // 10MB
  private syncInProgress = false;

  // Generate unique action ID
  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get offline data from localStorage
  getOfflineData(): OfflineData {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {
        segments: {},
        chapters: {},
        tracks: {},
        lastSync: 0,
      };
    } catch (error) {
      console.warn('Failed to read offline data:', error);
      return {
        segments: {},
        chapters: {},
        tracks: {},
        lastSync: 0,
      };
    }
  }

  // Save offline data to localStorage
  private saveOfflineData(data: OfflineData): void {
    try {
      const serialized = JSON.stringify(data);
      
      // Check storage size limit
      if (serialized.length > this.MAX_STORAGE_SIZE) {
        console.warn('Offline storage size limit exceeded, clearing old data');
        this.clearOldData(data);
        return;
      }
      
      localStorage.setItem(this.STORAGE_KEY, serialized);
    } catch (error) {
      console.error('Failed to save offline data:', error);
    }
  }

  // Clear old offline data when storage is full
  private clearOldData(data: OfflineData): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    // Remove data older than cutoff
    Object.keys(data.segments).forEach(key => {
      if (data.segments[key].timestamp < cutoffTime) {
        delete data.segments[key];
      }
    });
    
    Object.keys(data.chapters).forEach(key => {
      if (data.chapters[key].timestamp < cutoffTime) {
        delete data.chapters[key];
      }
    });
    
    this.saveOfflineData(data);
  }

  // Get action queue from localStorage
  getActionQueue(): OfflineAction[] {
    try {
      const queue = localStorage.getItem(this.QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.warn('Failed to read action queue:', error);
      return [];
    }
  }

  // Save action queue to localStorage
  private saveActionQueue(queue: OfflineAction[]): void {
    try {
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to save action queue:', error);
    }
  }

  // Add action to offline queue
  queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): string {
    const actionId = this.generateActionId();
    const fullAction: OfflineAction = {
      ...action,
      id: actionId,
      timestamp: Date.now(),
      retryCount: 0,
    };

    const queue = this.getActionQueue();
    queue.push(fullAction);
    this.saveActionQueue(queue);

    return actionId;
  }

  // Remove action from queue
  removeActionFromQueue(actionId: string): void {
    const queue = this.getActionQueue();
    const filteredQueue = queue.filter(action => action.id !== actionId);
    this.saveActionQueue(filteredQueue);
  }

  // Store data offline for immediate access
  storeOfflineSegment(chapterId: number, segment: any): void {
    const data = this.getOfflineData();
    const key = `${chapterId}_${segment.id || Date.now()}`;
    data.segments[key] = {
      ...segment,
      chapterId,
      offline: true,
      timestamp: Date.now(),
    };
    this.saveOfflineData(data);
  }

  // Get offline segments for a chapter
  getOfflineSegments(chapterId: number): any[] {
    const data = this.getOfflineData();
    return Object.values(data.segments)
      .filter((segment: any) => segment.chapterId === chapterId)
      .sort((a: any, b: any) => a.timestamp - b.timestamp);
  }

  // Store offline chapter data
  storeOfflineChapter(chapterId: number, chapter: any): void {
    const data = this.getOfflineData();
    data.chapters[chapterId.toString()] = {
      ...chapter,
      offline: true,
      timestamp: Date.now(),
    };
    this.saveOfflineData(data);
  }

  // Get offline chapter data
  getOfflineChapter(chapterId: number): any | null {
    const data = this.getOfflineData();
    return data.chapters[chapterId.toString()] || null;
  }

  // Sync offline data when network becomes available
  async syncOfflineData(apiRequest: (method: string, url: string, data?: any) => Promise<Response>): Promise<void> {
    if (this.syncInProgress) return;

    this.syncInProgress = true;
    const queue = this.getActionQueue();
    const failedActions: OfflineAction[] = [];

    console.log(`Starting offline sync of ${queue.length} actions`);

    for (const action of queue) {
      try {
        await this.executeAction(action, apiRequest);
        this.removeActionFromQueue(action.id);
        console.log(`Synced action: ${action.type}`);
      } catch (error) {
        console.warn(`Failed to sync action ${action.id}:`, error);
        
        // Increment retry count
        action.retryCount++;
        
        if (action.retryCount >= action.maxRetries) {
          console.error(`Max retries exceeded for action ${action.id}, removing from queue`);
          this.removeActionFromQueue(action.id);
        } else {
          failedActions.push(action);
        }
      }
    }

    // Update queue with failed actions (for retry)
    if (failedActions.length > 0) {
      this.saveActionQueue(failedActions);
    }

    this.syncInProgress = false;
    console.log(`Offline sync completed. ${failedActions.length} actions failed.`);
  }

  // Execute a single offline action
  private async executeAction(
    action: OfflineAction, 
    apiRequest: (method: string, url: string, data?: any) => Promise<Response>
  ): Promise<void> {
    const response = await apiRequest(action.method, action.endpoint, action.data);
    
    if (!response.ok) {
      throw createApiError(
        response.status,
        `Failed to sync ${action.type}`,
        'SYNC_ERROR'
      );
    }

    // Handle successful sync based on action type
    await this.handleSuccessfulSync(action, response);
  }

  // Handle successful sync operations
  private async handleSuccessfulSync(action: OfflineAction, response: Response): Promise<void> {
    const data = this.getOfflineData();

    switch (action.type) {
      case 'CREATE_SEGMENT':
        if (action.segmentId) {
          // Remove offline segment data
          const key = `${action.chapterId}_${action.segmentId}`;
          delete data.segments[key];
        }
        break;

      case 'UPDATE_CHAPTER':
        if (action.chapterId) {
          // Update chapter data with server response
          try {
            const serverData = await response.json();
            data.chapters[action.chapterId.toString()] = {
              ...serverData,
              offline: false,
              timestamp: Date.now(),
            };
          } catch (error) {
            // Remove offline flag even if we can't parse response
            const chapter = data.chapters[action.chapterId.toString()];
            if (chapter) {
              chapter.offline = false;
            }
          }
        }
        break;
    }

    data.lastSync = Date.now();
    this.saveOfflineData(data);
  }

  // Check if there are pending offline actions
  hasPendingActions(): boolean {
    return this.getActionQueue().length > 0;
  }

  // Get count of pending actions
  getPendingActionCount(): number {
    return this.getActionQueue().length;
  }

  // Clear all offline data (for testing or reset)
  clearAllOfflineData(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.QUEUE_KEY);
  }

  // Get offline storage stats
  getStorageStats(): {
    totalSize: number;
    segmentCount: number;
    chapterCount: number;
    queueSize: number;
    lastSync: Date | null;
  } {
    const data = this.getOfflineData();
    const queue = this.getActionQueue();
    const totalSize = (localStorage.getItem(this.STORAGE_KEY)?.length || 0) + 
                     (localStorage.getItem(this.QUEUE_KEY)?.length || 0);

    return {
      totalSize,
      segmentCount: Object.keys(data.segments).length,
      chapterCount: Object.keys(data.chapters).length,
      queueSize: queue.length,
      lastSync: data.lastSync ? new Date(data.lastSync) : null,
    };
  }
}

// Singleton instance
export const offlineStorage = new OfflineStorageManager();

// Utility functions for common operations
export function isOfflineMode(): boolean {
  return !navigator.onLine;
}

export function shouldUseOfflineData(error: any): boolean {
  return !navigator.onLine || error?.isNetworkError || error?.status >= 500;
}