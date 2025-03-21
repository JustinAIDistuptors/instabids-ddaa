/**
 * Domain Agent Core
 * 
 * This file defines the core interfaces and base classes for domain agents
 * in the Domain-Driven Agent Architecture (DDAA).
 */

/**
 * A structured intent to perform an operation within a domain
 */
export interface Intent {
  /**
   * The name of the intent (e.g., 'submitBid', 'acceptBid')
   */
  name: string;
  
  /**
   * Parameters needed to fulfill the intent
   */
  params: Record<string, any>;
  
  /**
   * The domain that originated this intent
   */
  source: string;
  
  /**
   * When the intent was created
   */
  timestamp: Date;
  
  /**
   * ID of the user that initiated this intent (if applicable)
   */
  userId?: string;
  
  /**
   * Correlation ID for tracing across multiple operations
   */
  correlationId: string;
  
  /**
   * Additional contextual metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Result of fulfilling an intent
 */
export interface IntentResult<T = any> {
  /**
   * Whether the intent was fulfilled successfully
   */
  success: boolean;
  
  /**
   * Data returned from the intent, if successful
   */
  data?: T;
  
  /**
   * Error that occurred, if unsuccessful
   */
  error?: Error;
  
  /**
   * Events generated as a result of fulfilling the intent
   */
  events?: DomainEvent[];
  
  /**
   * Additional metadata about the result
   */
  metadata?: Record<string, any>;
}

/**
 * A domain event representing something that happened in a domain
 */
export interface DomainEvent {
  /**
   * The type of event (e.g., 'bidding:bid_submitted')
   */
  type: string;
  
  /**
   * Data payload for the event
   */
  payload: Record<string, any>;
  
  /**
   * The domain that produced this event
   */
  source: string;
  
  /**
   * When the event was created
   */
  timestamp: Date;
  
  /**
   * Correlation ID for tracing across multiple operations
   */
  correlationId: string;
  
  /**
   * Additional contextual metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Schema information for an intent parameter
 */
export interface IntentParameterSchema {
  /**
   * Data type of the parameter
   */
  type: string;
  
  /**
   * Description of the parameter
   */
  description: string;
  
  /**
   * Whether the parameter is required
   */
  required: boolean;
  
  /**
   * Default value, if any
   */
  default?: any;
  
  /**
   * Validation constraints, if any
   */
  constraints?: Record<string, any>;
}

/**
 * Schema for an intent's return value
 */
export interface IntentReturnSchema {
  /**
   * Data type of the return value
   */
  type: string;
  
  /**
   * Description of the return value
   */
  description: string;
}

/**
 * Metadata about an intent, including its parameters and return value
 */
export interface IntentSchema {
  /**
   * Name of the intent
   */
  name: string;
  
  /**
   * Description of the intent
   */
  description: string;
  
  /**
   * Parameters that the intent accepts
   */
  parameters: Record<string, IntentParameterSchema>;
  
  /**
   * Return value of the intent
   */
  returns: IntentReturnSchema;
  
  /**
   * Additional metadata about the intent
   */
  metadata?: Record<string, any>;
}

/**
 * Interface that all domain agents must implement
 */
export interface DomainAgent {
  /**
   * The name of the domain this agent belongs to
   */
  readonly domainName: string;
  
  /**
   * Fulfills an intent by executing the appropriate domain logic
   * 
   * @param intentName The name of the intent to fulfill
   * @param params Parameters needed to fulfill the intent
   * @returns A promise resolving to the result of the intent
   */
  fulfillIntent<T = any>(intentName: string, params: Record<string, any>): Promise<IntentResult<T>>;
  
  /**
   * Processes an event from another domain
   * 
   * @param event The domain event to process
   */
  processEvent(event: DomainEvent): Promise<void>;
  
  /**
   * Lists all intents supported by this domain agent
   * 
   * @returns An array of supported intent names
   */
  getSupportedIntents(): string[];
  
  /**
   * Gets detailed schema information about a specific intent
   * 
   * @param intentName The name of the intent to get information about
   * @returns The intent schema or null if not found
   */
  getIntentSchema(intentName: string): IntentSchema | null;
}

/**
 * Abstract base implementation of a domain agent
 * Provides common functionality that all domain agents need
 */
export abstract class BaseDomainAgent implements DomainAgent {
  readonly domainName: string;
  
  constructor(domainName: string) {
    this.domainName = domainName;
  }
  
  abstract fulfillIntent<T = any>(intentName: string, params: Record<string, any>): Promise<IntentResult<T>>;
  
  abstract processEvent(event: DomainEvent): Promise<void>;
  
  abstract getSupportedIntents(): string[];
  
  abstract getIntentSchema(intentName: string): IntentSchema | null;
}
