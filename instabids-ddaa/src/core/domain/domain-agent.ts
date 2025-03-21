/**
 * Domain Agent - Base abstract class for all domain agents
 * 
 * This is the core component of the Domain-Driven Agent Architecture.
 * Domain agents are specialized for a specific bounded context and
 * handle all operations within that domain.
 * 
 * Each domain agent has its own sandwich architecture:
 * - Guard Layer - Enforces domain-specific architectural patterns
 * - Domain Layer - Implements domain-specific business logic
 * - Persistence Layer - Handles domain-specific data storage
 * 
 * Domain agents communicate with other agents through well-defined
 * interfaces and events, maintaining domain boundaries.
 */

import { GuardLayer } from '../guard/guard-layer';
import { DataInterface } from '../persistence/data-interface';
import { EventEmitter } from 'events';

/**
 * Result of a domain operation
 */
export interface DomainOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: Record<string, any>;
}

/**
 * Domain-specific intent to be fulfilled by the agent
 */
export interface DomainIntent {
  operation: string;
  params: Record<string, any>;
}

/**
 * Domain agent context, including user info and session data
 */
export interface DomainAgentContext {
  userId?: string;
  userRole?: string;
  userProfiles?: string[];
  sessionId?: string;
  requestId?: string;
  ip?: string;
  timestamp: number;
  meta?: Record<string, any>;
}

/**
 * Abstract base class for all domain agents
 */
export abstract class DomainAgent {
  /**
   * Domain-specific event emitter for intra-domain events
   */
  protected events: EventEmitter;
  
  /**
   * Domain name - must be overridden by implementing classes
   */
  protected abstract readonly domain: string;
  
  /**
   * Constructor for domain agent
   * 
   * @param guardLayer Domain-specific guard layer
   * @param dataInterface Domain-specific persistence layer
   * @param context Context containing user and session info
   */
  constructor(
    protected guardLayer: GuardLayer,
    protected dataInterface: DataInterface,
    protected context: DomainAgentContext
  ) {
    this.events = new EventEmitter();
    
    // Set max listeners to avoid warnings for complex domains
    this.events.setMaxListeners(50);
  }
  
  /**
   * Main entry point for the domain agent - interprets and fulfills intents
   * 
   * @param intent Domain-specific intent to be fulfilled
   * @returns Result of the operation
   */
  public async fulfillIntent(
    intent: DomainIntent
  ): Promise<DomainOperationResult> {
    try {
      // Validate the intent through the guard layer
      const validationResult = await this.guardLayer.validateIntent(
        intent,
        this.context
      );
      
      if (!validationResult.valid) {
        return {
          success: false,
          error: 'VALIDATION_ERROR',
          message: validationResult.message || 'Invalid intent',
          meta: validationResult.meta
        };
      }
      
      // Execute the specific operation for this intent
      const result = await this.executeIntent(intent);
      
      // Run post-execution hooks if any
      const finalResult = await this.guardLayer.applyPostExecutionHooks(
        intent,
        result,
        this.context
      );
      
      return finalResult;
    } catch (error) {
      console.error(`Error in ${this.domain} domain agent:`, error);
      return {
        success: false,
        error: 'DOMAIN_AGENT_ERROR',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Execute the specific operation for the intent
   * This must be implemented by each domain agent
   * 
   * @param intent Domain-specific intent to execute
   * @returns Result of the operation
   */
  protected abstract executeIntent(
    intent: DomainIntent
  ): Promise<DomainOperationResult>;
  
  /**
   * Get the list of supported operations in this domain
   * Useful for discovery and documentation
   * 
   * @returns Array of supported operations with descriptions
   */
  public abstract getSupportedOperations(): Array<{
    operation: string;
    description: string;
    parameters: Array<{
      name: string;
      type: string;
      description: string;
      required: boolean;
    }>;
  }>;
  
  /**
   * Close any resources held by this domain agent
   */
  public async close(): Promise<void> {
    this.events.removeAllListeners();
  }
}
