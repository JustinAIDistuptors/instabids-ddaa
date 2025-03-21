/**
 * InstaBids Domain-Driven Agent Architecture (DDAA)
 * 
 * This file exports all the key components of the architecture,
 * making them available for importing in other projects.
 */

// Core types and interfaces
export * from './core/domain/domain-agent';
export * from './core/guard/guard-layer';
export * from './core/persistence/data-interface';
export * from './core/events/event-bus';
export * from './core/patterns/pattern-registry';

// Bidding domain exports
export * from './domains/bidding/bidding-agent';
export * from './domains/bidding/bidding-data-interface';
export * from './domains/bidding/bidding-guard';
export * from './domains/bidding/bidding-factory';

// Example utilities
export * from './examples/bidding-example';

/**
 * Quick-start function to create a complete bidding domain
 * with all components wired up and ready to use.
 */
import { BiddingFactory } from './domains/bidding/bidding-factory';
import { EventBusFactory } from './core/events/event-bus';

export function createBiddingDomain(useSharedEventBus = false) {
  const eventBus = EventBusFactory.create('local', { logEvents: true });
  
  return BiddingFactory.createComponents({
    useSharedEventBus: useSharedEventBus,
    sharedEventBus: eventBus,
    eventBusType: 'local'
  });
}

/**
 * Usage examples:
 * 
 * Import specific components:
 * ```
 * import { BiddingFactory, BiddingIntents } from 'instabids-ddaa-architecture';
 * 
 * const biddingAgent = BiddingFactory.createAgent();
 * const result = await biddingAgent.fulfillIntent(BiddingIntents.SUBMIT_BID, {
 *   projectId: 'project-123',
 *   userId: 'contractor-456',
 *   amount: 2500,
 *   description: 'Complete renovation with premium materials',
 *   timelineInDays: 30
 * });
 * ```
 * 
 * Or use the quick-start function:
 * ```
 * import { createBiddingDomain } from 'instabids-ddaa-architecture';
 * 
 * const { agent, dataInterface, guard, eventBus } = createBiddingDomain();
 * 
 * // Now use the components as needed
 * ```
 */
