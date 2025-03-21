/**
 * InstaBids Domain-Driven Agent Architecture (DDAA)
 * Main entry point and exports
 */

// Core framework components
export * from './core/domain/domain-agent';
export * from './core/guard/guard-layer';
export * from './core/persistence/data-interface';

// Bidding domain components
export * from './domains/bidding/bidding-agent';
export * from './domains/bidding/bidding-guard';
export * from './domains/bidding/bidding-data-interface';
export * from './domains/bidding/bidding-factory';

// Example demo export
export * from './examples/bidding-demo';

/**
 * Top-level factory functions for easier instantiation
 */
import { DomainAgentContext } from './core/domain/domain-agent';
import { createBiddingAgent, createBiddingIntentHandler } from './domains/bidding/bidding-factory';

/**
 * Create a domain agent for the specified domain
 * 
 * @param domain Domain name
 * @param context Domain agent context
 * @returns Domain agent instance
 */
export function createDomainAgent(domain: string, context: DomainAgentContext) {
  switch (domain) {
    case 'bidding':
      return createBiddingAgent(context);
    default:
      throw new Error(`Unknown domain: ${domain}`);
  }
}

/**
 * Create an intent handler for the specified domain
 * 
 * @param domain Domain name
 * @returns Intent handler function
 */
export function createIntentHandler(domain: string) {
  switch (domain) {
    case 'bidding':
      return createBiddingIntentHandler();
    default:
      throw new Error(`Unknown domain: ${domain}`);
  }
}
