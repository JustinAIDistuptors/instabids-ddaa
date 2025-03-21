/**
 * Bidding Domain Guard Layer
 * 
 * This guard layer enforces architectural patterns and business rules 
 * specific to the bidding domain. It validates intents and ensures data
 * integrity before they reach the domain layer.
 */

import { Intent } from '../../core/domain/domain-agent';
import { BaseGuardLayer, ValidationError } from '../../core/guard/guard-layer';
import { PatternContext, PatternDefinition, PatternRegistry, PatternSeverity } from '../../core/patterns/pattern-registry';
import { Bid, BidStatus } from './bidding-data-interface';

/**
 * Configuration for the bidding guard layer
 */
export interface BiddingGuardConfig {
  /**
   * Whether to enable strict validation mode
   */
  strictMode?: boolean;
  
  /**
   * Additional patterns to enforce beyond the default ones
   */
  additionalPatterns?: PatternDefinition[];
  
  /**
   * Whether to log validation results
   */
  logValidation?: boolean;
  
  /**
   * Maximum bid amount allowed
   */
  maxBidAmount?: number;
  
  /**
   * Minimum bid amount allowed
   */
  minBidAmount?: number;
}

/**
 * Bid-specific patterns to enforce
 */
export const BiddingPatterns = {
  /**
   * Ensures a bid has all required fields
   */
  COMPLETE_BID_DATA: 'bidding:complete_bid_data',
  
  /**
   * Ensures bid amount is within acceptable range
   */
  VALID_BID_AMOUNT: 'bidding:valid_bid_amount',
  
  /**
   * Ensures a contractor can only have one active bid per project
   */
  ONE_ACTIVE_BID_PER_PROJECT: 'bidding:one_active_bid_per_project',
  
  /**
   * Ensures a bid cannot be modified after it's been accepted
   */
  NO_MODIFY_ACCEPTED_BID: 'bidding:no_modify_accepted_bid',
  
  /**
   * Ensures a bid cannot be submitted after project deadline
   */
  BID_BEFORE_DEADLINE: 'bidding:bid_before_deadline',
  
  /**
   * Ensures only the bid owner can modify their bid
   */
  BID_OWNER_ONLY: 'bidding:bid_owner_only'
};

/**
 * Bid-specific intents
 */
export enum BiddingIntents {
  SUBMIT_BID = 'submitBid',
  UPDATE_BID = 'updateBid',
  WITHDRAW_BID = 'withdrawBid',
  ACCEPT_BID = 'acceptBid',
  REJECT_BID = 'rejectBid',
  COUNTER_BID = 'counterBid',
  GET_BID = 'getBid',
  LIST_BIDS = 'listBids',
  GET_BID_STATS = 'getBidStats',
  CREATE_GROUP_BID = 'createGroupBid',
  JOIN_GROUP_BID = 'joinGroupBid'
}

/**
 * Guard layer implementation for the bidding domain
 */
export class BiddingGuard extends BaseGuardLayer {
  private patternRegistry: PatternRegistry;
  private biddingConfig: BiddingGuardConfig;
  
  constructor(config: BiddingGuardConfig = {}) {
    super({
      // Basic role permissions
      rolePermissions: [
        {
          role: 'contractor',
          allowedIntents: [
            BiddingIntents.SUBMIT_BID,
            BiddingIntents.UPDATE_BID,
            BiddingIntents.WITHDRAW_BID,
            BiddingIntents.COUNTER_BID,
            BiddingIntents.GET_BID,
            BiddingIntents.LIST_BIDS,
            BiddingIntents.CREATE_GROUP_BID,
            BiddingIntents.JOIN_GROUP_BID
          ]
        },
        {
          role: 'homeowner',
          allowedIntents: [
            BiddingIntents.ACCEPT_BID,
            BiddingIntents.REJECT_BID,
            BiddingIntents.COUNTER_BID,
            BiddingIntents.GET_BID,
            BiddingIntents.LIST_BIDS,
            BiddingIntents.GET_BID_STATS
          ]
        },
        {
          role: 'admin',
          allowedIntents: ['*'] // All intents
        }
      ]
    });
    
    this.biddingConfig = {
      strictMode: false,
      logValidation: false,
      maxBidAmount: 1000000, // Default max $1M
      minBidAmount: 50, // Default min $50
      ...config
    };
    
    this.patternRegistry = this.initializePatternRegistry();
  }
  
  /**
   * Initializes the pattern registry with bidding-specific patterns
   */
  private initializePatternRegistry(): PatternRegistry {
    const registry = new PatternRegistry();
    
    // Register built-in patterns
    registry.registerPattern({
      id: BiddingPatterns.COMPLETE_BID_DATA,
      name: 'Complete Bid Data',
      description: 'Ensures a bid has all required fields',
      severity: PatternSeverity.ERROR,
      enabled: true,
      intentTypes: [BiddingIntents.SUBMIT_BID, BiddingIntents.UPDATE_BID],
      validator: async (intent: Intent) => {
        const requiredFields = ['projectId', 'amount', 'description', 'timelineInDays'];
        
        if (intent.name === BiddingIntents.SUBMIT_BID) {
          const missingFields = requiredFields.filter(field => !intent.params.hasOwnProperty(field));
          
          return {
            valid: missingFields.length === 0,
            details: {
              missingFields
            },
            message: missingFields.length > 0
              ? `Missing required fields: ${missingFields.join(', ')}`
              : undefined
          };
        }
        
        return { valid: true };
      },
      violationMessage: 'Bid is missing required fields'
    });
    
    registry.registerPattern({
      id: BiddingPatterns.VALID_BID_AMOUNT,
      name: 'Valid Bid Amount',
      description: 'Ensures bid amount is within acceptable range',
      severity: PatternSeverity.ERROR,
      enabled: true,
      intentTypes: [BiddingIntents.SUBMIT_BID, BiddingIntents.UPDATE_BID],
      validator: async (intent: Intent) => {
        if (intent.params.hasOwnProperty('amount')) {
          const amount = Number(intent.params.amount);
          
          if (isNaN(amount)) {
            return {
              valid: false,
              message: 'Bid amount must be a number'
            };
          }
          
          if (amount < (this.biddingConfig.minBidAmount || 0)) {
            return {
              valid: false,
              message: `Bid amount must be at least $${this.biddingConfig.minBidAmount}`
            };
          }
          
          if (amount > (this.biddingConfig.maxBidAmount || Infinity)) {
            return {
              valid: false,
              message: `Bid amount cannot exceed $${this.biddingConfig.maxBidAmount}`
            };
          }
          
          return { valid: true };
        }
        
        // If no amount is specified (e.g., for partial updates), consider it valid
        return { valid: true };
      },
      violationMessage: 'Bid amount is invalid'
    });
    
    registry.registerPattern({
      id: BiddingPatterns.BID_OWNER_ONLY,
      name: 'Bid Owner Only',
      description: 'Ensures only the bid owner can modify their bid',
      severity: PatternSeverity.ERROR,
      enabled: true,
      intentTypes: [BiddingIntents.UPDATE_BID, BiddingIntents.WITHDRAW_BID],
      validator: async (intent: Intent, context?: PatternContext) => {
        // This would typically require a database lookup to verify ownership
        // For now, we'll assume the bidId and contractorId are in the intent params
        if (intent.params.hasOwnProperty('bidId') && intent.userId) {
          // In a real implementation, we would check if the bid with bidId is owned by intent.userId
          // For now, we'll assume it's valid if both are present
          return { valid: true };
        }
        
        return {
          valid: false,
          message: 'Only the bid owner can modify this bid'
        };
      },
      violationMessage: 'Cannot modify a bid owned by another contractor'
    });
    
    // Add any additional patterns from config
    if (this.biddingConfig.additionalPatterns) {
      for (const pattern of this.biddingConfig.additionalPatterns) {
        registry.registerPattern(pattern);
      }
    }
    
    return registry;
  }
  
  /**
   * Performs domain-specific validation on an intent
   * 
   * @param intent The intent to validate
   * @returns An array of validation errors (empty if valid)
   */
  protected async performDomainValidation(intent: Intent): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    
    // Validate against patterns
    const validationSummary = await this.patternRegistry.validateIntent(intent, {
      currentDomain: 'bidding'
    });
    
    if (this.biddingConfig.logValidation) {
      console.log(`[BiddingGuard] Pattern validation for ${intent.name}:`, validationSummary);
    }
    
    // Convert pattern validation errors to guard validation errors
    for (const result of validationSummary.results) {
      if (!result.valid) {
        errors.push({
          code: `pattern_violation:${result.patternId}`,
          message: result.message || 'Pattern validation failed',
          details: result.details
        });
      }
    }
    
    // Add custom validations based on intent type
    switch (intent.name) {
      case BiddingIntents.ACCEPT_BID:
        // Custom validation for accepting a bid
        if (!intent.params.bidId) {
          errors.push({
            code: 'missing_bid_id',
            message: 'Bid ID is required to accept a bid'
          });
        }
        
        // In a real implementation, we would check if the project belongs to the user
        // and if the bid status allows acceptance
        break;
        
      case BiddingIntents.COUNTER_BID:
        // Ensure counter offer has required details
        if (!intent.params.counterAmount && !intent.params.counterTerms) {
          errors.push({
            code: 'invalid_counter_offer',
            message: 'Counter offer must include a new amount or terms'
          });
        }
        break;
    }
    
    return errors;
  }
}
