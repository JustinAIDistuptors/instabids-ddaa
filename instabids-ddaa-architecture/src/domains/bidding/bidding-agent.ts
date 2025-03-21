/**
 * Bidding Domain Agent
 * 
 * This is the middle layer of the DDAA sandwich for the bidding domain.
 * It implements the business logic for bidding-related operations and
 * provides an intent-based interface for other components to interact with.
 */

import { BaseDomainAgent, DomainEvent, Intent, IntentResult, IntentSchema } from '../../core/domain/domain-agent';
import { EventBus } from '../../core/events/event-bus';
import { BiddingDataInterface, Bid, BidStatus } from './bidding-data-interface';
import { BiddingGuard, BiddingIntents } from './bidding-guard';
import { v4 as uuidv4 } from 'uuid';

/**
 * Configuration for the bidding agent
 */
export interface BiddingAgentConfig {
  /**
   * The event bus to use for publishing events
   */
  eventBus?: EventBus;
  
  /**
   * Whether to emit detailed events
   */
  detailedEvents?: boolean;
  
  /**
   * Whether the bidding agent should validate intents
   * (If false, assumes validation is performed externally)
   */
  performValidation?: boolean;
}

/**
 * Implementation of the bidding domain agent
 */
export class BiddingAgent extends BaseDomainAgent {
  private dataInterface: BiddingDataInterface;
  private guard: BiddingGuard;
  private config: BiddingAgentConfig;
  
  /**
   * Creates a new bidding agent
   * 
   * @param dataInterface The data interface for accessing bid data
   * @param guard The guard for validating bidding operations
   * @param config Configuration options
   */
  constructor(
    dataInterface: BiddingDataInterface,
    guard: BiddingGuard,
    config: BiddingAgentConfig = {}
  ) {
    super('bidding');
    
    this.dataInterface = dataInterface;
    this.guard = guard;
    this.config = {
      performValidation: true,
      detailedEvents: true,
      ...config
    };
  }
  
  /**
   * Fulfills an intent by executing the appropriate domain logic
   * 
   * @param intentName The name of the intent to fulfill
   * @param params Parameters needed to fulfill the intent
   * @returns A promise resolving to the result of the intent
   */
  async fulfillIntent<T = any>(intentName: string, params: Record<string, any>): Promise<IntentResult<T>> {
    const intent: Intent = {
      name: intentName,
      params,
      source: this.domainName,
      timestamp: new Date(),
      // In a real implementation, these would be provided by the caller
      userId: params.userId,
      correlationId: params.correlationId || uuidv4()
    };
    
    // Validate the intent if configured to do so
    if (this.config.performValidation) {
      const validationResult = await this.guard.validateIntent(intent);
      
      if (!validationResult.valid) {
        return {
          success: false,
          error: new Error(`Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`),
          metadata: {
            validationErrors: validationResult.errors
          }
        };
      }
    }
    
    // Route the intent to the appropriate handler
    try {
      switch (intentName) {
        case BiddingIntents.SUBMIT_BID:
          return await this.handleSubmitBid(intent) as IntentResult<T>;
          
        case BiddingIntents.UPDATE_BID:
          return await this.handleUpdateBid(intent) as IntentResult<T>;
          
        case BiddingIntents.WITHDRAW_BID:
          return await this.handleWithdrawBid(intent) as IntentResult<T>;
          
        case BiddingIntents.ACCEPT_BID:
          return await this.handleAcceptBid(intent) as IntentResult<T>;
          
        case BiddingIntents.REJECT_BID:
          return await this.handleRejectBid(intent) as IntentResult<T>;
          
        case BiddingIntents.COUNTER_BID:
          return await this.handleCounterBid(intent) as IntentResult<T>;
          
        case BiddingIntents.GET_BID:
          return await this.handleGetBid(intent) as IntentResult<T>;
          
        case BiddingIntents.LIST_BIDS:
          return await this.handleListBids(intent) as IntentResult<T>;
          
        case BiddingIntents.GET_BID_STATS:
          return await this.handleGetBidStats(intent) as IntentResult<T>;
          
        case BiddingIntents.CREATE_GROUP_BID:
          return await this.handleCreateGroupBid(intent) as IntentResult<T>;
          
        case BiddingIntents.JOIN_GROUP_BID:
          return await this.handleJoinGroupBid(intent) as IntentResult<T>;
          
        default:
          return {
            success: false,
            error: new Error(`Unsupported intent: ${intentName}`)
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
  
  /**
   * Processes an event from another domain
   * 
   * @param event The domain event to process
   */
  async processEvent(event: DomainEvent): Promise<void> {
    // Handle events from other domains
    switch (event.type) {
      case 'project:created':
        // Handle project creation event
        // (e.g., initialize bid tracking for the project)
        break;
        
      case 'project:deadline_updated':
        // Handle project deadline update
        // (e.g., update bid expiration dates)
        break;
        
      case 'payment:milestone_completed':
        // Update bid status based on payment events
        break;
        
      default:
        // Ignore unrelated events
        break;
    }
  }
  
  /**
   * Lists all intents supported by this domain agent
   * 
   * @returns An array of supported intent names
   */
  getSupportedIntents(): string[] {
    return Object.values(BiddingIntents);
  }
  
  /**
   * Gets detailed schema information about a specific intent
   * 
   * @param intentName The name of the intent to get information about
   * @returns The intent schema or null if not found
   */
  getIntentSchema(intentName: string): IntentSchema | null {
    const schemas: Record<string, IntentSchema> = {
      [BiddingIntents.SUBMIT_BID]: {
        name: BiddingIntents.SUBMIT_BID,
        description: 'Submit a new bid for a project',
        parameters: {
          projectId: {
            type: 'string',
            description: 'The ID of the project to bid on',
            required: true
          },
          amount: {
            type: 'number',
            description: 'The bid amount in dollars',
            required: true
          },
          description: {
            type: 'string',
            description: 'Description of the bid and work to be performed',
            required: true
          },
          timelineInDays: {
            type: 'number',
            description: 'Estimated timeline for completion in days',
            required: true
          },
          materials: {
            type: 'array',
            description: 'Materials to be used for the project',
            required: false
          },
          startDate: {
            type: 'date',
            description: 'Proposed start date',
            required: false
          }
        },
        returns: {
          type: 'object',
          description: 'The newly created bid'
        }
      },
      
      [BiddingIntents.UPDATE_BID]: {
        name: BiddingIntents.UPDATE_BID,
        description: 'Update an existing bid',
        parameters: {
          bidId: {
            type: 'string',
            description: 'The ID of the bid to update',
            required: true
          },
          amount: {
            type: 'number',
            description: 'Updated bid amount',
            required: false
          },
          description: {
            type: 'string',
            description: 'Updated description',
            required: false
          },
          timelineInDays: {
            type: 'number',
            description: 'Updated timeline for completion',
            required: false
          },
          materials: {
            type: 'array',
            description: 'Updated materials list',
            required: false
          },
          startDate: {
            type: 'date',
            description: 'Updated start date',
            required: false
          }
        },
        returns: {
          type: 'object',
          description: 'The updated bid'
        }
      }
      
      // Additional schemas would be defined for other intents
    };
    
    return schemas[intentName] || null;
  }
  
  // Intent handlers
  
  /**
   * Handles the submit bid intent
   * 
   * @param intent The intent to handle
   * @returns The result of the operation
   */
  private async handleSubmitBid(intent: Intent): Promise<IntentResult<Bid>> {
    const { projectId, amount, description, timelineInDays, materials, startDate } = intent.params;
    const contractorId = intent.userId!;
    
    // Create a new bid
    const bid: Partial<Bid> = {
      projectId,
      contractorId,
      amount,
      description,
      timelineInDays,
      materials,
      startDate: startDate ? new Date(startDate) : undefined,
      status: BidStatus.SUBMITTED,
      visibility: intent.params.visibility || 'private',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Save to database
    const createdBid = await this.dataInterface.create(bid);
    
    // Emit bid submitted event
    const events: DomainEvent[] = [{
      type: 'bidding:bid_submitted',
      payload: {
        bidId: createdBid.id,
        projectId: createdBid.projectId,
        contractorId: createdBid.contractorId,
        amount: createdBid.amount,
        timelineInDays: createdBid.timelineInDays
      },
      source: this.domainName,
      timestamp: new Date(),
      correlationId: intent.correlationId
    }];
    
    // Emit detailed event if configured
    if (this.config.detailedEvents) {
      events.push({
        type: 'bidding:bid_submitted:detailed',
        payload: {
          bid: createdBid
        },
        source: this.domainName,
        timestamp: new Date(),
        correlationId: intent.correlationId
      });
    }
    
    // Propagate events
    if (this.config.eventBus) {
      for (const event of events) {
        await this.config.eventBus.publish(event);
      }
    }
    
    return {
      success: true,
      data: createdBid,
      events
    };
  }
  
  /**
   * Handles the update bid intent
   * 
   * @param intent The intent to handle
   * @returns The result of the operation
   */
  private async handleUpdateBid(intent: Intent): Promise<IntentResult<Bid>> {
    const { bidId, ...updates } = intent.params;
    
    // Fetch the existing bid
    const existingBid = await this.dataInterface.findById(bidId);
    if (!existingBid) {
      return {
        success: false,
        error: new Error(`Bid with ID ${bidId} not found`)
      };
    }
    
    // Check if bid can be updated
    if (existingBid.status !== BidStatus.DRAFT && existingBid.status !== BidStatus.SUBMITTED) {
      return {
        success: false,
        error: new Error(`Cannot update bid in ${existingBid.status} status`)
      };
    }
    
    // Apply updates
    const updatedBid = await this.dataInterface.update(bidId, {
      ...updates,
      updatedAt: new Date()
    });
    
    // Emit bid updated event
    const events: DomainEvent[] = [{
      type: 'bidding:bid_updated',
      payload: {
        bidId: updatedBid.id,
        projectId: updatedBid.projectId,
        contractorId: updatedBid.contractorId,
        updates: Object.keys(updates)
      },
      source: this.domainName,
      timestamp: new Date(),
      correlationId: intent.correlationId
    }];
    
    // Emit detailed event if configured
    if (this.config.detailedEvents) {
      events.push({
        type: 'bidding:bid_updated:detailed',
        payload: {
          bid: updatedBid,
          previousBid: existingBid
        },
        source: this.domainName,
        timestamp: new Date(),
        correlationId: intent.correlationId
      });
    }
    
    // Propagate events
    if (this.config.eventBus) {
      for (const event of events) {
        await this.config.eventBus.publish(event);
      }
    }
    
    return {
      success: true,
      data: updatedBid,
      events
    };
  }
  
  /**
   * Handles the withdraw bid intent
   * 
   * @param intent The intent to handle
   * @returns The result of the operation
   */
  private async handleWithdrawBid(intent: Intent): Promise<IntentResult<Bid>> {
    const { bidId } = intent.params;
    
    // Fetch the existing bid
    const existingBid = await this.dataInterface.findById(bidId);
    if (!existingBid) {
      return {
        success: false,
        error: new Error(`Bid with ID ${bidId} not found`)
      };
    }
    
    // Check if bid can be withdrawn
    if (existingBid.status !== BidStatus.SUBMITTED) {
      return {
        success: false,
        error: new Error(`Cannot withdraw bid in ${existingBid.status} status`)
      };
    }
    
    // Update bid status
    const updatedBid = await this.dataInterface.updateBidStatus(bidId, BidStatus.WITHDRAWN);
    
    // Emit bid withdrawn event
    const event: DomainEvent = {
      type: 'bidding:bid_withdrawn',
      payload: {
        bidId: updatedBid.id,
        projectId: updatedBid.projectId,
        contractorId: updatedBid.contractorId
      },
      source: this.domainName,
      timestamp: new Date(),
      correlationId: intent.correlationId
    };
    
    // Propagate event
    if (this.config.eventBus) {
      await this.config.eventBus.publish(event);
    }
    
    return {
      success: true,
      data: updatedBid,
      events: [event]
    };
  }
  
  /**
   * Handles the accept bid intent
   * 
   * @param intent The intent to handle
   * @returns The result of the operation
   */
  private async handleAcceptBid(intent: Intent): Promise<IntentResult<Bid>> {
    const { bidId } = intent.params;
    
    // Fetch the existing bid
    const existingBid = await this.dataInterface.findById(bidId);
    if (!existingBid) {
      return {
        success: false,
        error: new Error(`Bid with ID ${bidId} not found`)
      };
    }
    
    // Check if bid can be accepted
    if (existingBid.status !== BidStatus.SUBMITTED && existingBid.status !== BidStatus.COUNTERED) {
      return {
        success: false,
        error: new Error(`Cannot accept bid in ${existingBid.status} status`)
      };
    }
    
    // Update bid status
    const updatedBid = await this.dataInterface.updateBidStatus(bidId, BidStatus.ACCEPTED);
    
    // In a real implementation, we would also:
    // 1. Reject all other bids for this project
    // 2. Create a contract based on the accepted bid
    // 3. Schedule initial payment milestone
    
    // Emit bid accepted event
    const event: DomainEvent = {
      type: 'bidding:bid_accepted',
      payload: {
        bidId: updatedBid.id,
        projectId: updatedBid.projectId,
        contractorId: updatedBid.contractorId,
        amount: updatedBid.amount,
        timelineInDays: updatedBid.timelineInDays
      },
      source: this.domainName,
      timestamp: new Date(),
      correlationId: intent.correlationId
    };
    
    // Propagate event
    if (this.config.eventBus) {
      await this.config.eventBus.publish(event);
    }
    
    return {
      success: true,
      data: updatedBid,
      events: [event]
    };
  }
  
  /**
   * Handles the reject bid intent
   * 
   * @param intent The intent to handle
   * @returns The result of the operation
   */
  private async handleRejectBid(intent: Intent): Promise<IntentResult<Bid>> {
    const { bidId, reason } = intent.params;
    
    // Update bid status
    const updatedBid = await this.dataInterface.updateBidStatus(bidId, BidStatus.REJECTED, { reason });
    
    // Emit bid rejected event
    const event: DomainEvent = {
      type: 'bidding:bid_rejected',
      payload: {
        bidId: updatedBid.id,
        projectId: updatedBid.projectId,
        contractorId: updatedBid.contractorId,
        reason
      },
      source: this.domainName,
      timestamp: new Date(),
      correlationId: intent.correlationId
    };
    
    // Propagate event
    if (this.config.eventBus) {
      await this.config.eventBus.publish(event);
    }
    
    return {
      success: true,
      data: updatedBid,
      events: [event]
    };
  }
  
  /**
   * Handles the counter bid intent
   * 
   * @param intent The intent to handle
   * @returns The result of the operation
   */
  private async handleCounterBid(intent: Intent): Promise<IntentResult<Bid>> {
    // Counter offer implementation
    return {
      success: false,
      error: new Error('Not implemented')
    };
  }
  
  /**
   * Handles the get bid intent
   * 
   * @param intent The intent to handle
   * @returns The result of the operation
   */
  private async handleGetBid(intent: Intent): Promise<IntentResult<Bid>> {
    const { bidId } = intent.params;
    
    const bid = await this.dataInterface.findById(bidId);
    if (!bid) {
      return {
        success: false,
        error: new Error(`Bid with ID ${bidId} not found`)
      };
    }
    
    return {
      success: true,
      data: bid
    };
  }
  
  /**
   * Handles the list bids intent
   * 
   * @param intent The intent to handle
   * @returns The result of the operation
   */
  private async handleListBids(intent: Intent): Promise<IntentResult<Bid[]>> {
    const { projectId, contractorId, status } = intent.params;
    
    if (projectId) {
      const bids = await this.dataInterface.findBidsByProject(projectId, status);
      return {
        success: true,
        data: bids
      };
    } else if (contractorId) {
      const bids = await this.dataInterface.findBidsByContractor(contractorId, status);
      return {
        success: true,
        data: bids
      };
    } else {
      return {
        success: false,
        error: new Error('Either projectId or contractorId must be provided')
      };
    }
  }
  
  /**
   * Handles the get bid stats intent
   * 
   * @param intent The intent to handle
   * @returns The result of the operation
   */
  private async handleGetBidStats(intent: Intent): Promise<IntentResult<any>> {
    const { projectId } = intent.params;
    
    const stats = await this.dataInterface.getBidStats(projectId);
    return {
      success: true,
      data: stats
    };
  }
  
  /**
   * Handles the create group bid intent
   * 
   * @param intent The intent to handle
   * @returns The result of the operation
   */
  private async handleCreateGroupBid(intent: Intent): Promise<IntentResult<any>> {
    // Group bid implementation
    return {
      success: false,
      error: new Error('Not implemented')
    };
  }
  
  /**
   * Handles the join group bid intent
   * 
   * @param intent The intent to handle
   * @returns The result of the operation
   */
  private async handleJoinGroupBid(intent: Intent): Promise<IntentResult<any>> {
    // Join group bid implementation
    return {
      success: false,
      error: new Error('Not implemented')
    };
  }
}
