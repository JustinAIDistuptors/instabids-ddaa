/**
 * Bidding Domain Factory
 * 
 * This factory creates and wires up all components of the bidding domain,
 * providing a clean API for other parts of the system to interact with
 * the bidding domain through its intent-based interface.
 */

import { EventBus, EventBusFactory } from '../../core/events/event-bus';
import { BiddingAgent, BiddingAgentConfig } from './bidding-agent';
import { BiddingDataInterface, BiddingDataInterfaceFactory } from './bidding-data-interface';
import { BiddingGuard, BiddingGuardConfig } from './bidding-guard';

/**
 * Configuration for the bidding domain factory
 */
export interface BiddingFactoryConfig {
  /**
   * Configuration for the bidding agent
   */
  agentConfig?: BiddingAgentConfig;
  
  /**
   * Configuration for the bidding guard
   */
  guardConfig?: BiddingGuardConfig;
  
  /**
   * The persistence implementation to use
   */
  persistenceImplementation?: 'supabase';
  
  /**
   * Whether to share a single event bus across all domains
   */
  useSharedEventBus?: boolean;
  
  /**
   * The event bus to use if sharing
   */
  sharedEventBus?: EventBus;
  
  /**
   * The type of event bus to create if not sharing
   */
  eventBusType?: 'local' | 'redis';
}

/**
 * Factory for creating and wiring up bidding domain components
 */
export class BiddingFactory {
  private static instance: BiddingAgent;
  
  /**
   * Creates a new agent for the bidding domain
   * 
   * @param config Configuration options
   * @returns A configured bidding agent
   */
  static createAgent(config: BiddingFactoryConfig = {}): BiddingAgent {
    // If singleton instance exists and no config provided, return it
    if (this.instance && Object.keys(config).length === 0) {
      return this.instance;
    }
    
    // Create data interface
    const dataInterface = BiddingDataInterfaceFactory.create(
      config.persistenceImplementation || 'supabase'
    );
    
    // Create guard layer
    const guard = new BiddingGuard(config.guardConfig);
    
    // Set up event bus
    let eventBus: EventBus | undefined;
    
    if (config.useSharedEventBus && config.sharedEventBus) {
      eventBus = config.sharedEventBus;
    } else if (config.eventBusType) {
      eventBus = EventBusFactory.create(config.eventBusType, {
        logEvents: true
      });
    }
    
    // Create the agent with the configured components
    const agent = new BiddingAgent(
      dataInterface,
      guard,
      {
        ...(config.agentConfig || {}),
        eventBus
      }
    );
    
    // Store as singleton if no specific config was provided
    if (Object.keys(config).length === 0) {
      this.instance = agent;
    }
    
    return agent;
  }
  
  /**
   * Creates all the individual components of the bidding domain
   * for use in advanced scenarios where direct access to each layer is needed
   * 
   * @param config Configuration options
   * @returns The separate components of the bidding domain
   */
  static createComponents(config: BiddingFactoryConfig = {}) {
    // Create data interface
    const dataInterface = BiddingDataInterfaceFactory.create(
      config.persistenceImplementation || 'supabase'
    );
    
    // Create guard layer
    const guard = new BiddingGuard(config.guardConfig);
    
    // Set up event bus
    let eventBus: EventBus | undefined;
    
    if (config.useSharedEventBus && config.sharedEventBus) {
      eventBus = config.sharedEventBus;
    } else if (config.eventBusType) {
      eventBus = EventBusFactory.create(config.eventBusType, {
        logEvents: true
      });
    }
    
    // Create the agent
    const agent = new BiddingAgent(
      dataInterface,
      guard,
      {
        ...(config.agentConfig || {}),
        eventBus
      }
    );
    
    return {
      dataInterface,
      guard,
      agent,
      eventBus
    };
  }
}

/**
 * Example usage:
 * 
 * ```typescript
 * // Simple usage with default configuration
 * const biddingAgent = BiddingFactory.createAgent();
 * 
 * const result = await biddingAgent.fulfillIntent('submitBid', {
 *   projectId: 'project-123',
 *   amount: 1500,
 *   description: 'Complete renovation with premium materials',
 *   timelineInDays: 30
 * });
 * 
 * // Advanced usage with explicit configuration
 * const { dataInterface, guard, agent, eventBus } = BiddingFactory.createComponents({
 *   persistenceImplementation: 'supabase',
 *   guardConfig: {
 *     strictMode: true,
 *     maxBidAmount: 10000
 *   },
 *   agentConfig: {
 *     detailedEvents: true,
 *     performValidation: true
 *   },
 *   eventBusType: 'local'
 * });
 * ```
 */
