/**
 * Pattern Registry
 * 
 * The Pattern Registry maintains a collection of architectural patterns
 * that can be enforced across the system. It provides mechanisms for
 * defining, registering, and validating patterns.
 */

import { Intent } from '../domain/domain-agent';

export enum PatternSeverity {
  ERROR = 'error',       // Pattern violation will prevent operation
  WARNING = 'warning',   // Pattern violation will be logged but operation proceeds
  INFO = 'info'          // Pattern violation will be recorded for metrics only
}

export interface PatternDefinition {
  /**
   * Unique identifier for the pattern
   */
  id: string;
  
  /**
   * Human-readable name of the pattern
   */
  name: string;
  
  /**
   * Description of what the pattern enforces
   */
  description: string;
  
  /**
   * Severity level of pattern violations
   */
  severity: PatternSeverity;
  
  /**
   * Function that evaluates whether an intent complies with the pattern
   */
  validator: (intent: Intent, context?: PatternContext) => Promise<PatternValidationResult>;
  
  /**
   * Message template to use when pattern is violated
   */
  violationMessage: string;
  
  /**
   * Domains this pattern applies to (empty/undefined means all domains)
   */
  domains?: string[];
  
  /**
   * Intent types this pattern applies to (empty/undefined means all intents)
   */
  intentTypes?: string[];
  
  /**
   * Whether this pattern is enabled
   */
  enabled: boolean;
}

export interface PatternContext {
  /**
   * The domain where the intent is being processed
   */
  currentDomain: string;
  
  /**
   * Additional contextual data for pattern validation
   */
  data?: Record<string, any>;
}

export interface PatternValidationResult {
  /**
   * Whether the pattern is satisfied
   */
  valid: boolean;
  
  /**
   * Custom message for this validation result
   */
  message?: string;
  
  /**
   * Additional context about the validation
   */
  details?: Record<string, any>;
}

export interface PatternValidationSummary {
  /**
   * Overall validation status
   */
  valid: boolean;
  
  /**
   * Results for each individual pattern
   */
  results: {
    patternId: string;
    patternName: string;
    severity: PatternSeverity;
    valid: boolean;
    message?: string;
    details?: Record<string, any>;
  }[];
  
  /**
   * Information about the intent being validated
   */
  intent: {
    name: string;
    domain?: string;
    timestamp: Date;
  };
}

/**
 * Registry for architectural patterns
 */
export class PatternRegistry {
  private patterns: Map<string, PatternDefinition> = new Map();
  
  /**
   * Registers a new pattern
   * 
   * @param pattern The pattern definition to register
   * @throws Error if a pattern with the same ID already exists
   */
  registerPattern(pattern: PatternDefinition): void {
    if (this.patterns.has(pattern.id)) {
      throw new Error(`Pattern with ID ${pattern.id} already exists`);
    }
    
    this.patterns.set(pattern.id, pattern);
  }
  
  /**
   * Updates an existing pattern
   * 
   * @param patternId The ID of the pattern to update
   * @param updates The updates to apply to the pattern
   * @throws Error if the pattern doesn't exist
   */
  updatePattern(patternId: string, updates: Partial<PatternDefinition>): void {
    const pattern = this.patterns.get(patternId);
    if (!pattern) {
      throw new Error(`Pattern with ID ${patternId} not found`);
    }
    
    this.patterns.set(patternId, { ...pattern, ...updates });
  }
  
  /**
   * Unregisters a pattern
   * 
   * @param patternId The ID of the pattern to unregister
   * @returns True if the pattern was unregistered, false if it wasn't found
   */
  unregisterPattern(patternId: string): boolean {
    return this.patterns.delete(patternId);
  }
  
  /**
   * Gets all registered patterns
   * 
   * @returns An array of all pattern definitions
   */
  getAllPatterns(): PatternDefinition[] {
    return Array.from(this.patterns.values());
  }
  
  /**
   * Gets a pattern by ID
   * 
   * @param patternId The ID of the pattern to get
   * @returns The pattern definition or undefined if not found
   */
  getPattern(patternId: string): PatternDefinition | undefined {
    return this.patterns.get(patternId);
  }
  
  /**
   * Validates an intent against all applicable patterns
   * 
   * @param intent The intent to validate
   * @param context Additional context for validation
   * @returns A promise resolving to a validation summary
   */
  async validateIntent(intent: Intent, context: PatternContext): Promise<PatternValidationSummary> {
    const applicablePatterns = this.getApplicablePatterns(intent, context.currentDomain);
    const results = [];
    let valid = true;
    
    for (const pattern of applicablePatterns) {
      try {
        const result = await pattern.validator(intent, context);
        
        results.push({
          patternId: pattern.id,
          patternName: pattern.name,
          severity: pattern.severity,
          valid: result.valid,
          message: result.valid ? undefined : (result.message || pattern.violationMessage),
          details: result.details
        });
        
        // If any ERROR severity pattern fails, the overall validation fails
        if (!result.valid && pattern.severity === PatternSeverity.ERROR) {
          valid = false;
        }
      } catch (error) {
        // If pattern validation throws an error, consider it a failure
        results.push({
          patternId: pattern.id,
          patternName: pattern.name,
          severity: pattern.severity,
          valid: false,
          message: `Error validating pattern: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
        
        if (pattern.severity === PatternSeverity.ERROR) {
          valid = false;
        }
      }
    }
    
    return {
      valid,
      results,
      intent: {
        name: intent.name,
        domain: intent.source,
        timestamp: new Date()
      }
    };
  }
  
  /**
   * Gets patterns that apply to a specific intent and domain
   * 
   * @param intent The intent to get applicable patterns for
   * @param domain The domain where the intent is being processed
   * @returns An array of applicable pattern definitions
   */
  private getApplicablePatterns(intent: Intent, domain: string): PatternDefinition[] {
    return Array.from(this.patterns.values()).filter(pattern => {
      // Skip disabled patterns
      if (!pattern.enabled) {
        return false;
      }
      
      // Check domain applicability
      if (pattern.domains && pattern.domains.length > 0) {
        if (!pattern.domains.includes(domain)) {
          return false;
        }
      }
      
      // Check intent type applicability
      if (pattern.intentTypes && pattern.intentTypes.length > 0) {
        if (!pattern.intentTypes.includes(intent.name)) {
          return false;
        }
      }
      
      return true;
    });
  }
}
