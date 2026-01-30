/**
 * EventBus - Simple in-process event system for cross-module communication
 *
 * Modules emit events, other modules subscribe and react
 * Keeps modules loosely coupled
 */

import { DomainEvent } from "./types";

type EventHandler<T> = (event: T) => Promise<void> | void;

export class EventBus {
  private handlers: Map<string, EventHandler<any>[]> = new Map();

  /**
   * Subscribe to an event type
   */
  subscribe<T>(eventType: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  /**
   * Publish an event - calls all subscribers
   */
  async publish<T>(eventType: string, event: T): Promise<void> {
    const handlers = this.handlers.get(eventType) || [];
    // Run all handlers in parallel, but don't fail if one fails
    await Promise.allSettled(
      handlers.map(h => Promise.resolve(h(event)))
    );
  }

  /**
   * Clear all subscribers (useful for testing)
   */
  clear(): void {
    this.handlers.clear();
  }
}

// Singleton instance
export const eventBus = new EventBus();
