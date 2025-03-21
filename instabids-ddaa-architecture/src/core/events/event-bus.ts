/**
 * Event Bus System
 * 
 * The Event Bus provides a centralized mechanism for cross-domain communication
 * through events. It allows domains to publish events and subscribe to events
 * from other domains without direct dependencies.
 */

import { DomainEvent } from '../domain/domain-agent';

export interface EventSubscription {
  /**
   * Unique identifier for the subscription
   */
  id: string;
  
  /**
   * The event types this subscription is interested in
   */
  eventTypes: string[];
  
  /**
   * The domains this subscription is interested in
   * (undefined or empty means events from all domains)
   */
  domains?: string[];
  
  /**
   * The callback function to be called when a matching event is published
   */
  callback: (event: DomainEvent) => void | Promise<void>;
}

export interface EventBusConfig {
  /**
   * Whether to log events for debugging purposes
   */
  logEvents?: boolean;
  
  /**
   * Optional function to handle errors in event processing
   */
  errorHandler?: (error: Error, event: DomainEvent, subscription: EventSubscription) => void;
}

/**
 * Interface for event buses
 */
export interface EventBus {
  /**
   * Publishes an event to all subscribers
   * 
   * @param event The event to publish
   * @returns A promise that resolves when all subscribers have been notified
   */
  publish(event: DomainEvent): Promise<void>;
  
  /**
   * Creates a subscription for specific event types
   * 
   * @param subscription The subscription details
   * @returns The ID of the created subscription
   */
  subscribe(subscription: Omit<EventSubscription, 'id'>): string;
  
  /**
   * Removes a subscription
   * 
   * @param subscriptionId The ID of the subscription to remove
   * @returns True if the subscription was removed, false if it wasn't found
   */
  unsubscribe(subscriptionId: string): boolean;
  
  /**
   * Gets all active subscriptions
   * 
   * @returns An array of all subscriptions
   */
  getSubscriptions(): EventSubscription[];
}

/**
 * In-memory implementation of the Event Bus
 */
export class InMemoryEventBus implements EventBus {
  private subscriptions: Map<string, EventSubscription> = new Map();
  private config: EventBusConfig;
  
  constructor(config: EventBusConfig = {}) {
    this.config = config;
  }
  
  async publish(event: DomainEvent): Promise<void> {
    if (this.config.logEvents) {
      console.log(`[EventBus] Publishing event: ${event.type} from ${event.source}`);
    }
    
    const promises: Promise<void>[] = [];
    
    for (const subscription of this.subscriptions.values()) {
      if (this.eventMatchesSubscription(event, subscription)) {
        try {
          const result = subscription.callback(event);
          if (result instanceof Promise) {
            promises.push(result);
          }
        } catch (error) {
          if (this.config.errorHandler) {
            this.config.errorHandler(
              error instanceof Error ? error : new Error(String(error)),
              event,
              subscription
            );
          } else {
            console.error(`[EventBus] Error processing event ${event.type} in subscription ${subscription.id}:`, error);
          }
        }
      }
    }
    
    // Wait for all async handlers to complete
    await Promise.all(promises);
  }
  
  subscribe(subscription: Omit<EventSubscription, 'id'>): string {
    const id = `subscription_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.subscriptions.set(id, { ...subscription, id });
    
    if (this.config.logEvents) {
      console.log(`[EventBus] Created subscription ${id} for events: ${subscription.eventTypes.join(', ')}`);
    }
    
    return id;
  }
  
  unsubscribe(subscriptionId: string): boolean {
    const result = this.subscriptions.delete(subscriptionId);
    
    if (result && this.config.logEvents) {
      console.log(`[EventBus] Removed subscription ${subscriptionId}`);
    }
    
    return result;
  }
  
  getSubscriptions(): EventSubscription[] {
    return Array.from(this.subscriptions.values());
  }
  
  /**
   * Checks if an event matches a subscription's criteria
   * 
   * @param event The event to check
   * @param subscription The subscription to check against
   * @returns True if the event matches the subscription
   */
  private eventMatchesSubscription(event: DomainEvent, subscription: EventSubscription): boolean {
    // Check event type
    if (!subscription.eventTypes.includes('*') && !subscription.eventTypes.includes(event.type)) {
      return false;
    }
    
    // Check source domain
    if (subscription.domains && subscription.domains.length > 0) {
      if (!subscription.domains.includes(event.source)) {
        return false;
      }
    }
    
    return true;
  }
}

/**
 * Factory for creating event bus instances
 */
export class EventBusFactory {
  /**
   * Creates an event bus based on configuration
   * 
   * @param type The type of event bus to create
   * @param config Configuration for the event bus
   * @returns An event bus instance
   */
  static create(type: 'local' | 'redis' = 'local', config: EventBusConfig = {}): EventBus {
    switch (type) {
      case 'local':
        return new InMemoryEventBus(config);
      
      case 'redis':
        // This would be implemented to use Redis for distributed event handling
        throw new Error('Redis event bus not implemented');
      
      default:
        throw new Error(`Unknown event bus type: ${type}`);
    }
  }
}
