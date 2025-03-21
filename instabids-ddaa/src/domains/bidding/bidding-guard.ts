/**
 * Bidding Guard Layer - Implementation of the guard layer for the bidding domain
 *
 * This guard layer enforces architectural patterns and validates domain operations
 * for the bidding domain. It ensures that operations conform to established constraints
 * and patterns before reaching the domain layer.
 */

import { GuardLayer, Pattern, PatternValidationContext, IntentValidationResult } from '../../core/guard/guard-layer';
import { DomainAgentContext, DomainOperationResult, DomainIntent } from '../../core/domain/domain-agent';

/**
 * The BiddingGuard implements the guard layer for the bidding domain
 */
export class BiddingGuard extends GuardLayer {
  /**
   * Constructor for the bidding guard
   */
  constructor() {
    super('bidding');
    
    // Register bidding-specific patterns
    this.registerPatterns();
  }
  
  /**
   * Register domain-specific patterns for the bidding domain
   */
  private registerPatterns(): void {
    // Pattern: Ensure bid cards have required fields
    this.registerPattern({
      name: 'bidding.bid_card.required_fields',
      description: 'Ensures bid cards have all required fields when created',
      validate: async (context: PatternValidationContext): Promise<{ valid: boolean; message?: string; meta?: any }> => {
        if (context.operation !== 'createBidCard') {
          return { valid: true };
        }
        
        const requiredFields = [
          'title', 'description', 'job_category_id', 
          'job_type_id', 'location', 'zip_code'
        ];
        
        const missingFields = requiredFields.filter(field => 
          !context.intent.params[field] || 
          (typeof context.intent.params[field] === 'string' && context.intent.params[field].trim() === '')
        );
        
        if (missingFields.length > 0) {
          return {
            valid: false,
            message: `Missing required fields: ${missingFields.join(', ')}`,
            meta: { missingFields }
          };
        }
        
        return { valid: true };
      }
    });

    // Pattern: Ensure bid amounts are reasonable
    this.registerPattern({
      name: 'bidding.bid.valid_amount',
      description: 'Ensures bid amounts are valid and within reasonable ranges',
      validate: async (context: PatternValidationContext): Promise<{ valid: boolean; message?: string; meta?: any }> => {
        if (context.operation !== 'submitBid' && context.operation !== 'updateBid') {
          return { valid: true };
        }
        
        const amount = context.intent.params.amount;
        
        if (typeof amount !== 'number') {
          return {
            valid: false,
            message: 'Bid amount must be a number',
            meta: { amount }
          };
        }
        
        if (amount <= 0) {
          return {
            valid: false,
            message: 'Bid amount must be greater than zero',
            meta: { amount }
          };
        }
        
        // Upper limit check - arbitrary large number to prevent extreme values
        if (amount > 1000000000) { // 1 billion
          return {
            valid: false,
            message: 'Bid amount exceeds maximum allowed value',
            meta: { amount }
          };
        }
        
        return { valid: true };
      }
    });

    // Pattern: Ensure group bid prices are discounted
    this.registerPattern({
      name: 'bidding.group_bid.discounted',
      description: 'Ensures group bid prices are lower than individual prices',
      validate: async (context: PatternValidationContext): Promise<{ valid: boolean; message?: string; meta?: any }> => {
        if (context.operation !== 'submitGroupBid') {
          return { valid: true };
        }
        
        const individualPrice = context.intent.params.individual_price;
        const groupPrice = context.intent.params.group_price;
        
        if (typeof individualPrice !== 'number' || typeof groupPrice !== 'number') {
          return {
            valid: false,
            message: 'Both individual price and group price must be numbers',
            meta: { individualPrice, groupPrice }
          };
        }
        
        if (groupPrice >= individualPrice) {
          return {
            valid: false,
            message: 'Group price must be lower than individual price',
            meta: { individualPrice, groupPrice }
          };
        }
        
        return { valid: true };
      }
    });
  }
  
  /**
   * Validate domain-specific access control
   * 
   * @param resource Resource being accessed
   * @param action Action being performed
   * @param context Context in which the action is being performed
   * @returns Whether access is allowed
   */
  public async validateAccess(
    resource: string,
    action: string,
    context: DomainAgentContext
  ): Promise<boolean> {
    // If no user ID, deny access (except for public resources)
    if (!context.userId) {
      // Allow read access to public bid cards
      if (resource.startsWith('bid_cards:') && action === 'read' && resource.includes(':public')) {
        return true;
      }
      
      return false;
    }
    
    // For bid cards
    if (resource.startsWith('bid_cards:')) {
      const bidCardId = resource.split(':')[1];
      
      // If it's the creator, allow all actions
      if (await this.isResourceCreator(bidCardId, 'bid_cards', context.userId)) {
        return true;
      }
      
      // For reading public bid cards, allow access
      if (action === 'read' && await this.isResourcePublic(bidCardId, 'bid_cards')) {
        return true;
      }
      
      // For bids submitted by the user (contractor)
      if (action === 'read' && resource.includes(':bids:') && await this.isUserContractor(context.userId)) {
        const bidId = resource.split(':bids:')[1];
        return await this.isBidOwner(bidId, context.userId);
      }
    }
    
    // For bid groups
    if (resource.startsWith('bid_groups:')) {
      const bidGroupId = resource.split(':')[1];
      
      // If it's the creator, allow all actions
      if (await this.isResourceCreator(bidGroupId, 'bid_groups', context.userId)) {
        return true;
      }
      
      // For reading bid groups, check if the user is a member
      if (action === 'read') {
        return await this.isUserBidGroupMember(bidGroupId, context.userId);
      }
    }
    
    return false;
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
    // If the operation failed, no hooks needed
    if (!result.success) {
      return result;
    }
    
    // For bid card creation, add a helpful message
    if (intent.operation === 'createBidCard' && result.success) {
      return {
        ...result,
        message: 'Bid card created successfully. It will now be visible to contractors and will start receiving bids.'
      };
    }
    
    // For bid submission, add a helpful message
    if (intent.operation === 'submitBid' && result.success) {
      return {
        ...result,
        message: 'Bid submitted successfully. The homeowner will be notified and can view your bid details.'
      };
    }
    
    // For bid acceptance, add a helper message about next steps
    if (intent.operation === 'acceptBid' && result.success) {
      return {
        ...result,
        message: 'Bid accepted. The contractor must complete payment to finalize the connection and receive your contact information.'
      };
    }
    
    return result;
  }
  
  /**
   * Check if a user is the creator of a resource
   * 
   * @param resourceId Resource ID
   * @param resourceType Type of resource
   * @param userId User ID
   * @returns Whether the user is the creator
   */
  private async isResourceCreator(resourceId: string, resourceType: string, userId: string): Promise<boolean> {
    // In a real implementation, this would query the database
    // For now, we'll just return a mock implementation
    return true; // Mock implementation
  }
  
  /**
   * Check if a resource is public
   * 
   * @param resourceId Resource ID
   * @param resourceType Type of resource
   * @returns Whether the resource is public
   */
  private async isResourcePublic(resourceId: string, resourceType: string): Promise<boolean> {
    // In a real implementation, this would query the database
    // For now, we'll just return a mock implementation
    return true; // Mock implementation
  }
  
  /**
   * Check if a user is a contractor
   * 
   * @param userId User ID
   * @returns Whether the user is a contractor
   */
  private async isUserContractor(userId: string): Promise<boolean> {
    // In a real implementation, this would query the database
    // For now, we'll just return a mock implementation
    return true; // Mock implementation
  }
  
  /**
   * Check if a user is the owner of a bid
   * 
   * @param bidId Bid ID
   * @param userId User ID
   * @returns Whether the user is the owner of the bid
   */
  private async isBidOwner(bidId: string, userId: string): Promise<boolean> {
    // In a real implementation, this would query the database
    // For now, we'll just return a mock implementation
    return true; // Mock implementation
  }
  
  /**
   * Check if a user is a member of a bid group
   * 
   * @param bidGroupId Bid group ID
   * @param userId User ID
   * @returns Whether the user is a member of the bid group
   */
  private async isUserBidGroupMember(bidGroupId: string, userId: string): Promise<boolean> {
    // In a real implementation, this would query the database
    // For now, we'll just return a mock implementation
    return true; // Mock implementation
  }
}
