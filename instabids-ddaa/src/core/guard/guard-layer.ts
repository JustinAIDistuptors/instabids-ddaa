/**
 * Guard Layer - The top slice of the sandwich architecture
 * 
 * This is responsible for enforcing architectural patterns and validating
 * domain operations before they reach the domain layer. It acts as a
 * protective barrier that ensures all operations conform to the established
 * patterns and constraints.
 */

import { DomainIntent, DomainOperationResult, DomainAgentContext } from '../domain/domain-agent';

/**
 * Result of intent validation
 */
export interface IntentValidationResult {
  valid: boolean;
  message?: string;
  meta?: Record<string, any>;
}

/**
 * Pattern definition for pattern-driven development
 */
export interface Pattern {
  name: string;
  description: string;
  validate: (context: PatternValidationContext) => Promise<PatternValidationResult>;
}

/**
 * Context for pattern validation
 */
export interface PatternValidationContext {
  intent: DomainIntent;
  domain: string;
  user?: {
    id: string;
    role: string;
    profiles: string[];
  };
  operation: string;
  meta?: Record<string, any>;
}

/**
 * Result of pattern validation
 */
export interface PatternValidationResult {
  valid: boolean;
  message?: string;
  meta?: Record<string, any>;
}

/**
 * Abstract class for guard layers to implement
 */
export abstract class GuardLayer {
  /**
   * Registry of patterns to enforce
   */
  protected patterns: Map<string, Pattern> = new Map();
  
  /**
   * Domain this guard layer is responsible for
   */
  protected readonly domain: string;
  
  constructor(domain: string) {
    this.domain = domain;
  }
  
  /**
   * Register a pattern to be enforced by this guard layer
   * 
   * @param pattern Pattern to register
   */
  public registerPattern(pattern: Pattern): void {
    this.patterns.set(pattern.name, pattern);
  }
  
  /**
   * Validate an intent against all registered patterns
   * 
   * @param intent Intent to validate
   * @param context Context in which the intent is being executed
   * @returns Result of validation
   */
  public async validateIntent(
    intent: DomainIntent,
    context: DomainAgentContext
  ): Promise<IntentValidationResult> {
    // Create the pattern validation context
    const patternContext: PatternValidationContext = {
      intent,
      domain: this.domain,
      user: context.userId ? {
        id: context.userId,
        role: context.userRole || 'guest',
        profiles: context.userProfiles || []
      } : undefined,
      operation: intent.operation,
      meta: {
        ...context.meta,
        sessionId: context.sessionId,
        requestId: context.requestId,
        timestamp: context.timestamp
      }
    };
    
    // Validate against all patterns
    // Convert Map.values() to array for safer iteration
    const patternsArray = Array.from(this.patterns.values());
    
    for (const pattern of patternsArray) {
      const result = await pattern.validate(patternContext);
      
      if (!result.valid) {
        return {
          valid: false,
          message: `Pattern '${pattern.name}' validation failed: ${result.message}`,
          meta: result.meta
        };
      }
    }
    
    // All patterns passed
    return { valid: true };
  }
  
  /**
   * Apply post-execution hooks to a domain operation result
   * 
   * @param intent Original intent
   * @param result Result of the domain operation
   * @param context Context in which the intent was executed
   * @returns Potentially modified result
   */
  public async applyPostExecutionHooks(
    intent: DomainIntent,
    result: DomainOperationResult,
    context: DomainAgentContext
  ): Promise<DomainOperationResult> {
    // By default, just return the original result
    // This can be overridden by specific guard layers
    return result;
  }
  
  /**
   * Validate domain-specific access control
   * 
   * @param resource Resource being accessed
   * @param action Action being performed
   * @param context Context in which the action is being performed
   * @returns Whether access is allowed
   */
  public abstract validateAccess(
    resource: string,
    action: string,
    context: DomainAgentContext
  ): Promise<boolean>;
}
