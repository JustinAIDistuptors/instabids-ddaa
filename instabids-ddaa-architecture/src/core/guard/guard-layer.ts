/**
 * Guard Layer Interface
 * 
 * The Guard Layer is the top layer in the Domain-Driven Agent Architecture.
 * It enforces architectural patterns, validates access controls,
 * and ensures domain invariants are respected before operations
 * reach the domain layer.
 */

import { DomainEvent, Intent, IntentResult } from '../domain/domain-agent';

export interface GuardLayerConfig {
  patternRestrictions?: PatternRestriction[];
  rolePermissions?: RolePermission[];
  dataValidators?: DataValidator[];
  rateLimits?: RateLimit[];
}

export interface PatternRestriction {
  pattern: string;
  condition: (intent: Intent) => boolean | Promise<boolean>;
  errorMessage: string;
}

export interface RolePermission {
  role: string;
  allowedIntents: string[];
  deniedIntents?: string[];
}

export interface DataValidator {
  intentName: string;
  paramSchema: Record<string, any>; // Zod schema or similar
  validate: (params: Record<string, any>) => boolean | Promise<boolean>;
  errorMessage: string;
}

export interface RateLimit {
  intentName: string;
  limit: number;
  duration: number; // in milliseconds
  scope: 'user' | 'global' | 'role';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

export interface GuardLayer {
  /**
   * Validates an intent before it reaches the domain layer
   * 
   * @param intent The intent to validate
   * @returns A ValidationResult indicating whether the intent is valid
   */
  validateIntent(intent: Intent): Promise<ValidationResult>;
  
  /**
   * Validates the result of a domain operation
   * 
   * @param result The result to validate
   * @param intent The original intent that generated this result
   * @returns A ValidationResult indicating whether the result is valid
   */
  validateResult(result: IntentResult, intent: Intent): Promise<ValidationResult>;
  
  /**
   * Validates a domain event before it is propagated to other domains
   * 
   * @param event The event to validate
   * @returns A ValidationResult indicating whether the event is valid
   */
  validateEvent(event: DomainEvent): Promise<ValidationResult>;
  
  /**
   * Checks if a user has permission to execute an intent
   * 
   * @param userId The ID of the user
   * @param roles The roles assigned to the user
   * @param intentName The name of the intent
   * @returns True if the user has permission, false otherwise
   */
  hasPermission(userId: string, roles: string[], intentName: string): Promise<boolean>;
}

/**
 * Abstract base implementation of the Guard Layer
 * Provides common functionality for pattern enforcement and validation
 */
export abstract class BaseGuardLayer implements GuardLayer {
  protected config: GuardLayerConfig;
  
  constructor(config: GuardLayerConfig = {}) {
    this.config = config;
  }
  
  async validateIntent(intent: Intent): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    
    // Check pattern restrictions
    if (this.config.patternRestrictions) {
      for (const restriction of this.config.patternRestrictions) {
        try {
          const passes = await restriction.condition(intent);
          if (!passes) {
            errors.push({
              code: 'pattern_violation',
              message: restriction.errorMessage,
              details: { pattern: restriction.pattern }
            });
          }
        } catch (error) {
          errors.push({
            code: 'pattern_check_error',
            message: `Error checking pattern ${restriction.pattern}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            details: { pattern: restriction.pattern }
          });
        }
      }
    }
    
    // Check data validators
    if (this.config.dataValidators) {
      const validator = this.config.dataValidators.find(v => v.intentName === intent.name);
      if (validator) {
        try {
          const valid = await validator.validate(intent.params);
          if (!valid) {
            errors.push({
              code: 'validation_error',
              message: validator.errorMessage
            });
          }
        } catch (error) {
          errors.push({
            code: 'validation_error',
            message: `Error validating intent params: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }
    }
    
    // Domain-specific validations should be implemented in subclasses
    const domainValidationErrors = await this.performDomainValidation(intent);
    errors.push(...domainValidationErrors);
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  async validateResult(result: IntentResult, intent: Intent): Promise<ValidationResult> {
    // Default implementation returns valid
    // Subclasses should override to provide domain-specific validation
    return {
      valid: true,
      errors: []
    };
  }
  
  async validateEvent(event: DomainEvent): Promise<ValidationResult> {
    // Default implementation returns valid
    // Subclasses should override to provide domain-specific validation
    return {
      valid: true,
      errors: []
    };
  }
  
  async hasPermission(userId: string, roles: string[], intentName: string): Promise<boolean> {
    if (!this.config.rolePermissions || this.config.rolePermissions.length === 0) {
      // If no role permissions are configured, default to allowing all intents
      return true;
    }
    
    // Check if any of the user's roles has permission for this intent
    for (const role of roles) {
      const permission = this.config.rolePermissions.find(p => p.role === role);
      if (permission) {
        // Check denied intents first (explicit denials take precedence)
        if (permission.deniedIntents && permission.deniedIntents.includes(intentName)) {
          return false;
        }
        
        // Then check allowed intents
        if (permission.allowedIntents.includes('*') || permission.allowedIntents.includes(intentName)) {
          return true;
        }
      }
    }
    
    // No role has explicit permission
    return false;
  }
  
  /**
   * Performs domain-specific validation on an intent
   * Subclasses should override this to implement custom validations
   * 
   * @param intent The intent to validate
   * @returns An array of validation errors (empty if valid)
   */
  protected abstract performDomainValidation(intent: Intent): Promise<ValidationError[]>;
}
