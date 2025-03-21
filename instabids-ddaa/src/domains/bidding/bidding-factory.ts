/**
 * Bidding Factory - Creates and assembles bidding domain components
 *
 * This factory is responsible for creating the bidding domain agent and its dependencies,
 * such as the guard layer and data interface. It's the entry point for working with
 * the bidding domain.
 */

import { DomainAgentContext } from '../../core/domain/domain-agent';
import { BiddingAgent } from './bidding-agent';
import { BiddingGuard } from './bidding-guard';
import { BiddingDataInterface } from './bidding-data-interface';

/**
 * Factory for creating bidding domain components
 */
export class BiddingFactory {
  /**
   * Supabase URL from environment
   */
  private readonly supabaseUrl: string;
  
  /**
   * Supabase key from environment
   */
  private readonly supabaseKey: string;
  
  /**
   * Constructor for the bidding factory
   * 
   * @param supabaseUrl Supabase URL
   * @param supabaseKey Supabase API key
   */
  constructor(supabaseUrl?: string, supabaseKey?: string) {
    this.supabaseUrl = supabaseUrl || 
      process.env.SUPABASE_URL || 
      'https://pdkvzylwqidorgefcixa.supabase.co';
      
    this.supabaseKey = supabaseKey || 
      process.env.SUPABASE_KEY || 
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBka3Z6eWx3cWlkb3JnZWZjaXhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1MDE2NTQsImV4cCI6MjA1ODA3NzY1NH0.bJSroWC1CyFaBqJu3l8vlEFxoJOJoq58IHAUklXWptw';
  }
  
  /**
   * Create a bidding guard layer
   * 
   * @returns Bidding guard instance
   */
  public createGuard(): BiddingGuard {
    return new BiddingGuard();
  }
  
  /**
   * Create a bidding data interface
   * 
   * @param supabaseUrl Optional Supabase URL override
   * @param supabaseKey Optional Supabase key override
   * @returns Bidding data interface instance
   */
  public createDataInterface(
    supabaseUrl?: string,
    supabaseKey?: string
  ): BiddingDataInterface {
    return new BiddingDataInterface(
      supabaseUrl || this.supabaseUrl,
      supabaseKey || this.supabaseKey
    );
  }
  
  /**
   * Create a bidding agent with all dependencies
   * 
   * @param context Domain agent context
   * @returns Bidding agent instance
   */
  public createAgent(context: DomainAgentContext): BiddingAgent {
    const guard = this.createGuard();
    const dataInterface = this.createDataInterface();
    
    return new BiddingAgent(guard, dataInterface, context);
  }
  
  /**
   * Create a dynamic intent handler that forwards to the bidding agent
   * This is useful for integration with the LLM sandwich framework
   * 
   * @returns Function that handles intents dynamically
   */
  public createIntentHandler(): (intent: any, context: DomainAgentContext) => Promise<any> {
    return async (intent: any, context: DomainAgentContext) => {
      const agent = this.createAgent(context);
      return await agent.fulfillIntent(intent);
    };
  }
}

/**
 * Helper function to create a bidding agent
 * 
 * @param context Domain agent context
 * @returns Bidding agent instance
 */
export function createBiddingAgent(context: DomainAgentContext): BiddingAgent {
  const factory = new BiddingFactory();
  return factory.createAgent(context);
}

/**
 * Helper function to create a bidding intent handler
 * 
 * @returns Function that handles bidding intents
 */
export function createBiddingIntentHandler(): (intent: any, context: DomainAgentContext) => Promise<any> {
  const factory = new BiddingFactory();
  return factory.createIntentHandler();
}
