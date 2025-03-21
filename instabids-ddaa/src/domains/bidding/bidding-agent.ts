/**
 * Bidding Domain Agent - Implementation of the domain agent for the bidding domain
 *
 * This agent handles all bidding-related operations, including:
 * - Creating and managing bid cards
 * - Submitting and managing bids
 * - Accepting bids and handling bid acceptances
 * - Group bidding functionality
 */

import { DomainAgent, DomainIntent, DomainOperationResult, DomainAgentContext } from '../../core/domain/domain-agent';
import { GuardLayer } from '../../core/guard/guard-layer';
import { DataInterface } from '../../core/persistence/data-interface';
import { EventEmitter } from 'events';

/**
 * The Bidding Domain Agent implements the domain-specific business logic
 * for the bidding system, separated from other domains.
 */
export class BiddingAgent extends DomainAgent {
  /**
   * Domain name - this is fixed for this agent
   */
  protected readonly domain: string = 'bidding';

  /**
   * Domain-specific events that aren't exposed outside the domain
   */
  private domainEvents: EventEmitter;

  /**
   * Constructor for the bidding agent
   * 
   * @param guardLayer The guard layer for the bidding domain
   * @param dataInterface The data interface for the bidding domain
   * @param context The domain agent context
   */
  constructor(
    guardLayer: GuardLayer,
    dataInterface: DataInterface,
    context: DomainAgentContext
  ) {
    super(guardLayer, dataInterface, context);
    this.domainEvents = new EventEmitter();
    
    // Set up internal event handlers
    this.initializeEventHandlers();
  }

  /**
   * Set up internal event handlers
   */
  private initializeEventHandlers(): void {
    // Handle bid card created event
    this.domainEvents.on('bid_card_created', (bidCard) => {
      console.log(`Bid card created: ${bidCard.id}`);
      // Add any other internal logic needed when a bid card is created
    });

    // Handle bid submitted event
    this.domainEvents.on('bid_submitted', (bid) => {
      console.log(`Bid submitted: ${bid.id} for bid card ${bid.bid_card_id}`);
      // Add any other internal logic needed when a bid is submitted
    });

    // Handle bid accepted event
    this.domainEvents.on('bid_accepted', (bidAcceptance) => {
      console.log(`Bid accepted: ${bidAcceptance.bid_id}`);
      // Add any other internal logic needed when a bid is accepted
    });
  }

  /**
   * Execute the specific operation for the intent
   * 
   * @param intent Domain-specific intent to execute
   * @returns Result of the operation
   */
  protected async executeIntent(
    intent: DomainIntent
  ): Promise<DomainOperationResult> {
    // Implement operation routing based on the intent's operation
    switch (intent.operation) {
      case 'createBidCard':
        return this.createBidCard(intent.params);
      case 'updateBidCard':
        return this.updateBidCard(intent.params);
      case 'getBidCard':
        return this.getBidCard(intent.params);
      case 'listBidCards':
        return this.listBidCards(intent.params);
      case 'submitBid':
        return this.submitBid(intent.params);
      case 'updateBid':
        return this.updateBid(intent.params);
      case 'getBid':
        return this.getBid(intent.params);
      case 'listBids':
        return this.listBids(intent.params);
      case 'acceptBid':
        return this.acceptBid(intent.params);
      case 'createBidGroup':
        return this.createBidGroup(intent.params);
      case 'joinBidGroup':
        return this.joinBidGroup(intent.params);
      case 'submitGroupBid':
        return this.submitGroupBid(intent.params);
      case 'acceptGroupBid':
        return this.acceptGroupBid(intent.params);
      default:
        return {
          success: false,
          error: 'UNKNOWN_OPERATION',
          message: `Unknown operation: ${intent.operation}`
        };
    }
  }

  /**
   * Get the list of supported operations in this domain
   * 
   * @returns Array of supported operations with descriptions
   */
  public getSupportedOperations(): Array<{
    operation: string;
    description: string;
    parameters: Array<{
      name: string;
      type: string;
      description: string;
      required: boolean;
    }>;
  }> {
    return [
      {
        operation: 'createBidCard',
        description: 'Create a new bid card',
        parameters: [
          {
            name: 'title',
            type: 'string',
            description: 'Title of the bid card',
            required: true
          },
          {
            name: 'description',
            type: 'string',
            description: 'Description of the bid card',
            required: true
          },
          {
            name: 'job_category_id',
            type: 'string',
            description: 'ID of the job category',
            required: true
          },
          {
            name: 'job_type_id',
            type: 'string',
            description: 'ID of the job type',
            required: true
          },
          {
            name: 'location',
            type: 'object',
            description: 'Location details',
            required: true
          },
          {
            name: 'zip_code',
            type: 'string',
            description: 'ZIP code of the project location',
            required: true
          },
          {
            name: 'budget_min',
            type: 'number',
            description: 'Minimum budget for the project',
            required: false
          },
          {
            name: 'budget_max',
            type: 'number',
            description: 'Maximum budget for the project',
            required: false
          },
          {
            name: 'timeline_start',
            type: 'string',
            description: 'Desired project start date',
            required: false
          },
          {
            name: 'timeline_end',
            type: 'string',
            description: 'Desired project end date',
            required: false
          },
          {
            name: 'bid_deadline',
            type: 'string',
            description: 'Deadline for submitting bids',
            required: false
          },
          {
            name: 'group_bidding_enabled',
            type: 'boolean',
            description: 'Whether group bidding is enabled',
            required: false
          }
        ]
      },
      {
        operation: 'updateBidCard',
        description: 'Update an existing bid card',
        parameters: [
          {
            name: 'id',
            type: 'string',
            description: 'ID of the bid card to update',
            required: true
          },
          {
            name: 'title',
            type: 'string',
            description: 'Title of the bid card',
            required: false
          },
          {
            name: 'description',
            type: 'string',
            description: 'Description of the bid card',
            required: false
          },
          // Other update parameters...
        ]
      },
      {
        operation: 'getBidCard',
        description: 'Get details of a specific bid card',
        parameters: [
          {
            name: 'id',
            type: 'string',
            description: 'ID of the bid card to retrieve',
            required: true
          }
        ]
      },
      {
        operation: 'listBidCards',
        description: 'List bid cards matching criteria',
        parameters: [
          {
            name: 'creator_id',
            type: 'string',
            description: 'ID of the creator to filter by',
            required: false
          },
          {
            name: 'status',
            type: 'string',
            description: 'Status to filter by',
            required: false
          },
          {
            name: 'job_category_id',
            type: 'string',
            description: 'Job category ID to filter by',
            required: false
          },
          {
            name: 'zip_code',
            type: 'string',
            description: 'ZIP code to filter by',
            required: false
          },
          {
            name: 'limit',
            type: 'number',
            description: 'Maximum number of records to return',
            required: false
          },
          {
            name: 'offset',
            type: 'number',
            description: 'Number of records to skip',
            required: false
          }
        ]
      },
      {
        operation: 'submitBid',
        description: 'Submit a bid for a bid card',
        parameters: [
          {
            name: 'bid_card_id',
            type: 'string',
            description: 'ID of the bid card to bid on',
            required: true
          },
          {
            name: 'amount',
            type: 'number',
            description: 'Bid amount',
            required: true
          },
          {
            name: 'scope_of_work',
            type: 'string',
            description: 'Scope of work description',
            required: true
          },
          {
            name: 'materials_included',
            type: 'object',
            description: 'Details about included materials',
            required: false
          },
          {
            name: 'timeline',
            type: 'object',
            description: 'Timeline details',
            required: false
          },
          {
            name: 'value_propositions',
            type: 'array',
            description: 'Value propositions for the bid',
            required: true
          },
          {
            name: 'additional_notes',
            type: 'string',
            description: 'Additional notes',
            required: false
          }
        ]
      },
      // Other operations would be defined here...
    ];
  }

  /**
   * Create a new bid card
   * 
   * @param params Bid card creation parameters
   * @returns Operation result with created bid card
   */
  private async createBidCard(params: any): Promise<DomainOperationResult> {
    try {
      // Extract the creator ID from the context
      const creatorId = this.context.userId;
      
      if (!creatorId) {
        return {
          success: false,
          error: 'AUTHENTICATION_ERROR',
          message: 'User must be authenticated to create a bid card'
        };
      }
      
      // Prepare the bid card data
      const bidCardData = {
        creator_id: creatorId,
        title: params.title,
        description: params.description,
        job_category_id: params.job_category_id,
        job_type_id: params.job_type_id,
        location: params.location,
        zip_code: params.zip_code,
        budget_min: params.budget_min,
        budget_max: params.budget_max,
        timeline_start: params.timeline_start ? new Date(params.timeline_start) : null,
        timeline_end: params.timeline_end ? new Date(params.timeline_end) : null,
        bid_deadline: params.bid_deadline ? new Date(params.bid_deadline) : null,
        group_bidding_enabled: params.group_bidding_enabled || false,
        status: 'open',
        visibility: params.visibility || 'public',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Create the bid card in the database
      const bidCard = await this.dataInterface.create('bid_cards', bidCardData);
      
      // Emit internal domain event
      this.domainEvents.emit('bid_card_created', bidCard);
      
      return {
        success: true,
        data: bidCard
      };
    } catch (error) {
      console.error('Error creating bid card:', error);
      return {
        success: false,
        error: 'CREATION_ERROR',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Update an existing bid card
   * 
   * @param params Bid card update parameters
   * @returns Operation result with updated bid card
   */
  private async updateBidCard(params: any): Promise<DomainOperationResult> {
    try {
      // Extract the user ID from the context
      const userId = this.context.userId;
      
      if (!userId) {
        return {
          success: false,
          error: 'AUTHENTICATION_ERROR',
          message: 'User must be authenticated to update a bid card'
        };
      }
      
      // Get the existing bid card to verify ownership
      const existingBidCard = await this.dataInterface.findById('bid_cards', params.id);
      
      if (!existingBidCard) {
        return {
          success: false,
          error: 'NOT_FOUND',
          message: `Bid card with ID ${params.id} not found`
        };
      }
      
      // Verify ownership
      if (existingBidCard.creator_id !== userId) {
        return {
          success: false,
          error: 'PERMISSION_DENIED',
          message: 'You can only update your own bid cards'
        };
      }
      
      // Check if the bid card can be updated (based on status)
      if (['awarded', 'completed', 'cancelled'].includes(existingBidCard.status)) {
        return {
          success: false,
          error: 'INVALID_STATUS',
          message: `Bid card with status '${existingBidCard.status}' cannot be updated`
        };
      }
      
      // If this is a significant update that requires revision tracking
      const needsRevision = this.needsRevisionTracking(existingBidCard, params);
      
      if (needsRevision) {
        // Handle bid card revision logic here
        // This would involve creating a revision record and updating the bid card
        const revisionData = {
          bid_card_id: params.id,
          revision_number: existingBidCard.current_revision_number + 1,
          revision_type: this.determineRevisionType(existingBidCard, params),
          change_summary: params.change_summary || 'Bid card updated',
          detailed_changes: this.extractDetailedChanges(existingBidCard, params),
          created_at: new Date()
        };
        
        // Create the revision record
        const revision = await this.dataInterface.create('bid_card_revisions', revisionData);
        
        // Update the bid card with revision information
        params.current_revision_number = revisionData.revision_number;
        params.has_active_revision = true;
        params.last_revised_at = new Date();
      }
      
      // Update the bid card
      params.updated_at = new Date();
      const updatedBidCard = await this.dataInterface.update('bid_cards', params.id, params);
      
      // Emit internal domain event
      this.domainEvents.emit('bid_card_updated', updatedBidCard);
      
      return {
        success: true,
        data: updatedBidCard,
        meta: needsRevision ? { revision_created: true } : undefined
      };
    } catch (error) {
      console.error('Error updating bid card:', error);
      return {
        success: false,
        error: 'UPDATE_ERROR',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get details of a specific bid card
   * 
   * @param params Parameters containing the bid card ID
   * @returns Operation result with bid card details
   */
  private async getBidCard(params: any): Promise<DomainOperationResult> {
    try {
      // Extract the user ID from the context
      const userId = this.context.userId;
      
      // Get the bid card
      const bidCard = await this.dataInterface.findById('bid_cards', params.id, {
        joinRelations: ['media'] // Join the media relation for complete details
      });
      
      if (!bidCard) {
        return {
          success: false,
          error: 'NOT_FOUND',
          message: `Bid card with ID ${params.id} not found`
        };
      }
      
      // Check visibility permissions
      if (bidCard.visibility !== 'public' && bidCard.creator_id !== userId) {
        // For private bid cards, check if this user is allowed to view it
        const hasAccess = await this.guardLayer.validateAccess(
          `bid_cards:${bidCard.id}`,
          'read',
          this.context
        );
        
        if (!hasAccess) {
          return {
            success: false,
            error: 'PERMISSION_DENIED',
            message: 'You do not have permission to view this bid card'
          };
        }
      }
      
      // Get the associated bids if the user is the creator
      let bids = [];
      if (bidCard.creator_id === userId) {
        bids = await this.dataInterface.findMany('bids', { bid_card_id: bidCard.id });
      }
      
      return {
        success: true,
        data: {
          ...bidCard,
          bids: bidCard.creator_id === userId ? bids : undefined
        }
      };
    } catch (error) {
      console.error('Error getting bid card:', error);
      return {
        success: false,
        error: 'RETRIEVAL_ERROR',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * List bid cards matching criteria
   * 
   * @param params Query parameters
   * @returns Operation result with matching bid cards
   */
  private async listBidCards(params: any): Promise<DomainOperationResult> {
    try {
      // Extract the user ID from the context
      const userId = this.context.userId;
      
      // Build query criteria
      const criteria: Record<string, any> = {};
      
      // Filter by creator if specified
      if (params.creator_id) {
        criteria.creator_id = params.creator_id;
      }
      
      // Filter by status if specified
      if (params.status) {
        criteria.status = params.status;
      }
      
      // Filter by job category if specified
      if (params.job_category_id) {
        criteria.job_category_id = params.job_category_id;
      }
      
      // Filter by ZIP code if specified
      if (params.zip_code) {
        criteria.zip_code = params.zip_code;
      }
      
      // For non-authenticated users, only return public bid cards
      if (!userId) {
        criteria.visibility = 'public';
      } else {
        // For authenticated users, return:
        // 1. Public bid cards
        // 2. Their own bid cards
        // 3. Bid cards they're part of a group for
        
        // This would typically be handled by the database layer or a more complex query
        // For simplicity here, we'll just filter by public visibility or creator
        criteria.$or = [
          { visibility: 'public' },
          { creator_id: userId }
        ];
        
        // Group bidding would add additional complexity here
      }
      
      // Prepare query options
      const options = {
        limit: params.limit || 10,
        offset: params.offset || 0,
        orderBy: params.orderBy || 'created_at',
        orderDirection: params.orderDirection || 'desc',
        joinRelations: ['media'] // Join the media relation for complete details
      };
      
      // Execute the query
      const bidCards = await this.dataInterface.findMany('bid_cards', criteria, options);
      
      // Get total count for pagination
      const totalCount = await this.dataInterface.count('bid_cards', criteria);
      
      return {
        success: true,
        data: {
          items: bidCards,
          total: totalCount,
          limit: options.limit,
          offset: options.offset
        }
      };
    } catch (error) {
      console.error('Error listing bid cards:', error);
      return {
        success: false,
        error: 'RETRIEVAL_ERROR',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Submit a bid for a bid card
   * 
   * @param params Bid submission parameters
   * @returns Operation result with submitted bid
   */
  private async submitBid(params: any): Promise<DomainOperationResult> {
    try {
      // Extract the user ID from the context
      const userId = this.context.userId;
      
      if (!userId) {
        return {
          success: false,
          error: 'AUTHENTICATION_ERROR',
          message: 'User must be authenticated to submit a bid'
        };
      }
      
      // Check if the user is a contractor
      const isContractor = await this.isUserContractor(userId);
      
      if (!isContractor) {
        return {
          success: false,
          error: 'PERMISSION_DENIED',
          message: 'Only contractors can submit bids'
        };
      }
      
      // Get the contractor ID
      const contractor = await this.getContractorByUserId(userId);
      
      if (!contractor) {
        return {
          success: false,
          error: 'CONTRACTOR_NOT_FOUND',
          message: 'Contractor profile not found'
        };
      }
      
      // Get the bid card
      const bidCard = await this.dataInterface.findById('bid_cards', params.bid_card_id);
      
      if (!bidCard) {
        return {
          success: false,
          error: 'BID_CARD_NOT_FOUND',
          message: `Bid card with ID ${params.bid_card_id} not found`
        };
      }
      
      // Check if the bid card is open for bidding
      if (bidCard.status !== 'open') {
        return {
          success: false,
          error: 'INVALID_STATUS',
          message: `Bid card with status '${bidCard.status}' is not open for bidding`
        };
      }
      
      // Check if the bid deadline has passed
      if (bidCard.bid_deadline && new Date(bidCard.bid_deadline) < new Date()) {
        return {
          success: false,
          error: 'BID_DEADLINE_PASSED',
          message: 'The bid deadline has passed'
        };
      }
      
      // Check if the contractor already has a bid for this bid card
      const existingBid = await this.dataInterface.findMany('bids', {
        bid_card_id: params.bid_card_id,
        contractor_id: contractor.id
      });
      
      if (existingBid.length > 0) {
        return {
          success: false,
          error: 'BID_ALREADY_EXISTS',
          message: 'You have already submitted a bid for this bid card'
        };
      }
      
      // Prepare the bid data
      const bidData = {
        bid_card_id: params.bid_card_id,
        contractor_id: contractor.id,
        amount: params.amount,
        is_final_offer: params.is_final_offer !== undefined ? params.is_final_offer : true,
        scope_of_work: params.scope_of_work,
        materials_included: params.materials_included || {},
        timeline: params.timeline || {},
        value_propositions: params.value_propositions || [],
        additional_notes: params.additional_notes,
        status: 'submitted',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Create the bid in the database
      const bid = await this.dataInterface.create('bids', bidData);
      
      // Emit internal domain event
      this.domainEvents.emit('bid_submitted', bid);
      
      return {
        success: true,
        data: bid
      };
    } catch (error) {
      console.error('Error submitting bid:', error);
      return {
        success: false,
        error: 'SUBMISSION_ERROR',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Update an existing bid
   * 
   * @param params Bid update parameters
   * @returns Operation result with updated bid
   */
  private async updateBid(params: any): Promise<DomainOperationResult> {
    try {
      // Extract the user ID from the context
      const userId = this.context.userId;
      
      if (!userId) {
        return {
          success: false,
          error: 'AUTHENTICATION_ERROR',
          message: 'User must be authenticated to update a bid'
        };
      }
      
      // Get the existing bid to verify ownership
      const existingBid = await this.dataInterface.findById('bids', params.id);
      
      if (!existingBid) {
        return {
          success: false,
          error: 'NOT_FOUND',
          message: `Bid with ID ${params.id} not found`
        };
      }
      
      // Get the contractor
      const contractor = await this.getContractorByUserId(userId);
      
      if (!contractor || contractor.id !== existingBid.contractor_id) {
        return {
          success: false,
          error: 'PERMISSION_DENIED',
          message: 'You can only update your own bids'
        };
      }
      
      // Get the bid card to check status
      const bidCard = await this.dataInterface.findById('bid_cards', existingBid.bid_card_id);
      
      if (!bidCard) {
        return {
          success: false,
          error: 'BID_CARD_NOT_FOUND',
          message: `Bid card with ID ${existingBid.bid_card_id} not found`
        };
      }
      
      // Check if the bid card is still open
      if (bidCard.status !== 'open' && bidCard.status !== 'negotiation') {
        return {
          success: false,
          error: 'INVALID_STATUS',
          message: `Bid card with status '${bidCard.status}' does not allow bid updates`
        };
      }
      
      // Check if the bid deadline has passed
      if (bidCard.bid_deadline && new Date(bidCard.bid_deadline) < new Date()) {
        return {
          success: false,
          error: 'BID_DEADLINE_PASSED',
          message: 'The bid deadline has passed'
        };
      }
      
      // Check if the bid is already accepted
      if (existingBid.status === 'accepted') {
        return {
          success: false,
          error: 'BID_ALREADY_ACCEPTED',
          message: 'This bid has already been accepted and cannot be updated'
        };
      }
      
      // Prepare the update data
      const updateData: Record<string, any> = {
        updated_at: new Date(),
        last_updated_at: new Date(),
        update_count: (existingBid.update_count || 0) + 1
      };
      
      // Only update fields that are provided
      if (params.amount !== undefined) updateData.amount = params.amount;
      if (params.is_final_offer !== undefined) updateData.is_final_offer = params.is_final_offer;
      if (params.scope_of_work !== undefined) updateData.scope_of_work = params.scope_of_work;
      if (params.materials_included !== undefined) updateData.materials_included = params.materials_included;
      if (params.timeline !== undefined) updateData.timeline = params.timeline;
      if (params.value_propositions !== undefined) updateData.value_propositions = params.value_propositions;
      if (params.additional_notes !== undefined) updateData.additional_notes = params.additional_notes;
      
      // Update the bid
      const updatedBid = await this.dataInterface.update('bids', params.id, updateData);
      
      // Emit internal domain event
      this.domainEvents.emit('bid_updated', updatedBid);
      
      return {
        success: true,
        data: updatedBid
      };
    } catch (error) {
      console.error('Error updating bid:', error);
      return {
        success: false,
        error: 'UPDATE_ERROR',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get details of a specific bid
   * 
   * @param params Parameters containing the bid ID
   * @returns Operation result with bid details
   */
  private async getBid(params: any): Promise<DomainOperationResult> {
    try {
      // Extract the user ID from the context
      const userId = this.context.userId;
      
      // Get the bid
      const bid = await this.dataInterface.findById('bids', params.id);
      
      if (!bid) {
        return {
          success: false,
          error: 'NOT_FOUND',
          message: `Bid with ID ${params.id} not found`
        };
      }
      
      // Get the bid card to check permissions
      const bidCard = await this.dataInterface.findById('bid_cards', bid.bid_card_id);
      
      if (!bidCard) {
        return {
          success: false,
          error: 'BID_CARD_NOT_FOUND',
          message: `Bid card with ID ${bid.bid_card_id} not found`
        };
      }
      
      // Check if the user is authorized to view this bid
      if (!userId) {
        // Anonymous users can't view bids
        return {
          success: false,
          error: 'AUTHENTICATION_ERROR',
          message: 'You must be authenticated to view bids'
        };
      }
      
      // Get the contractor
      const contractor = userId ? await this.getContractorByUserId(userId) : null;
      
      // Check permissions:
      // 1. The user is the bid card creator (homeowner)
      // 2. The user is the contractor who submitted the bid
      const isBidCardCreator = bidCard.creator_id === userId;
      const isContractorOwner = contractor && contractor.id === bid.contractor_id;
      
      if (!isBidCardCreator && !isContractorOwner) {
        return {
          success: false,
          error: 'PERMISSION_DENIED',
          message: 'You do not have permission to view this bid'
        };
      }
      
      // Get contractor profile if the viewer is the homeowner
      let contractorProfile = null;
      if (isBidCardCreator) {
        contractorProfile = await this.getContractorById(bid.contractor_id);
      }
      
      return {
        success: true,
        data: {
          ...bid,
          contractor: isBidCardCreator ? contractorProfile : undefined
        }
      };
    } catch (error) {
      console.error('Error getting bid:', error);
      return {
        success: false,
        error: 'RETRIEVAL_ERROR',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * List bids matching criteria
   * 
   * @param params Query parameters
   * @returns Operation result with matching bids
   */
  private async listBids(params: any): Promise<DomainOperationResult> {
    try {
      // Extract the user ID from the context
      const userId = this.context.userId;
      
      if (!userId) {
        return {
          success: false,
          error: 'AUTHENTICATION_ERROR',
          message: 'User must be authenticated to list bids'
        };
      }
      
      // Build query criteria
      const criteria: Record<string, any> = {};
      
      // Filter by bid card if specified
      if (params.bid_card_id) {
        criteria.bid_card_id = params.bid_card_id;
      }
      
      // Filter by contractor if specified
      if (params.contractor_id) {
        criteria.contractor_id = params.contractor_id;
      }
      
      // Filter by status if specified
      if (params.status) {
        criteria.status = params.status;
      }
      
      // Get contractor profile for the user
      const contractor = await this.getContractorByUserId(userId);
      
      // Apply permission filters
      if (contractor) {
        // For contractors, they can only see their own bids
        criteria.contractor_id = contractor.id;
      } else {
        // For homeowners, they can only see bids on their own bid cards
        const ownedBidCardIds = await this.getBidCardIdsByCreator(userId);
        
        if (ownedBidCardIds.length === 0) {
          return {
            success: false,
            error: 'NO_BID_CARDS',
            message: 'You have no bid cards to view bids for'
          };
        }
        
        criteria.bid_card_id = { $in: ownedBidCardIds };
      }
      
      // Prepare query options
      const options = {
        limit: params.limit || 10,
        offset: params.offset || 0,
        orderBy: params.orderBy || 'created_at',
        orderDirection: params.orderDirection || 'desc'
      };
      
      // Execute the query
      const bids = await this.dataInterface.findMany('bids', criteria, options);
      
      // Get total count for pagination
      const totalCount = await this.dataInterface.count('bids', criteria);
      
      return {
        success: true,
        data: {
          items: bids,
          total: totalCount,
          limit: options.limit,
          offset: options.offset
        }
      };
    } catch (error) {
      console.error('Error listing bids:', error);
      return {
        success: false,
        error: 'RETRIEVAL_ERROR',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Accept a bid for a bid card
   * 
   * @param params Parameters containing the bid ID
   * @returns Operation result with acceptance details
   */
  private async acceptBid(params: any): Promise<DomainOperationResult> {
    try {
      // Extract the user ID from the context
      const userId = this.context.userId;
      
      if (!userId) {
        return {
          success: false,
          error: 'AUTHENTICATION_ERROR',
          message: 'User must be authenticated to accept a bid'
        };
      }
      
      // Get the bid
      const bid = await this.dataInterface.findById('bids', params.bid_id);
      
      if (!bid) {
        return {
          success: false,
          error: 'NOT_FOUND',
          message: `Bid with ID ${params.bid_id} not found`
        };
      }
      
      // Get the bid card to check ownership
      const bidCard = await this.dataInterface.findById('bid_cards', bid.bid_card_id);
      
      if (!bidCard) {
        return {
          success: false,
          error: 'BID_CARD_NOT_FOUND',
          message: `Bid card with ID ${bid.bid_card_id} not found`
        };
      }
      
      // Verify ownership
      if (bidCard.creator_id !== userId) {
        return {
          success: false,
          error: 'PERMISSION_DENIED',
          message: 'You can only accept bids on your own bid cards'
        };
      }
      
      // Check if the bid card is still open
      if (bidCard.status !== 'open') {
        return {
          success: false,
          error: 'INVALID_STATUS',
          message: `Bid card with status '${bidCard.status}' does not allow bid acceptance`
        };
      }
      
      // Check if the bid is already accepted
      if (bid.status === 'accepted') {
        return {
          success: false,
          error: 'BID_ALREADY_ACCEPTED',
          message: 'This bid has already been accepted'
        };
      }
      
      // Update the bid status
      const updatedBid = await this.dataInterface.update('bids', params.bid_id, {
        status: 'accepted',
        accepted_at: new Date(),
        updated_at: new Date()
      });
      
      // Update the bid card status
      const updatedBidCard = await this.dataInterface.update('bid_cards', bid.bid_card_id, {
        status: 'awarded',
        awarded_bid_id: params.bid_id,
        awarded_at: new Date(),
        updated_at: new Date()
      });
      
      // Create an acceptance record
      const acceptanceData = {
        bid_id: params.bid_id,
        bid_card_id: bid.bid_card_id,
        homeowner_id: userId,
        contractor_id: bid.contractor_id,
        amount: bid.amount,
        terms_accepted: params.terms_accepted || true,
        status: 'pending_contractor_confirmation',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const acceptance = await this.dataInterface.create('bid_acceptances', acceptanceData);
      
      // Emit internal domain event
      this.domainEvents.emit('bid_accepted', acceptance);
      
      return {
        success: true,
        data: {
          acceptance,
          bid: updatedBid,
          bid_card: updatedBidCard
        }
      };
    } catch (error) {
      console.error('Error accepting bid:', error);
      return {
        success: false,
        error: 'ACCEPTANCE_ERROR',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Create a new bid group for group bidding
   * 
   * @param params Group creation parameters
   * @returns Operation result with created group
   */
  private async createBidGroup(params: any): Promise<DomainOperationResult> {
    try {
      // Extract the creator ID from the context
      const creatorId = this.context.userId;
      
      if (!creatorId) {
        return {
          success: false,
          error: 'AUTHENTICATION_ERROR',
          message: 'User must be authenticated to create a bid group'
        };
      }
      
      // Get the bid card to check if group bidding is enabled
      const bidCard = await this.dataInterface.findById('bid_cards', params.bid_card_id);
      
      if (!bidCard) {
        return {
          success: false,
          error: 'BID_CARD_NOT_FOUND',
          message: `Bid card with ID ${params.bid_card_id} not found`
        };
      }
      
      // Check if group bidding is enabled
      if (!bidCard.group_bidding_enabled) {
        return {
          success: false,
          error: 'GROUP_BIDDING_DISABLED',
          message: 'Group bidding is not enabled for this bid card'
        };
      }
      
      // Prepare the group data
      const groupData = {
        bid_card_id: params.bid_card_id,
        creator_id: creatorId,
        name: params.name,
        description: params.description,
        max_members: params.max_members || 5,
        status: 'open',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Create the group in the database
      const group = await this.dataInterface.create('bid_groups', groupData);
      
      // Add the creator as the first member
      const memberData = {
        bid_group_id: group.id as string,
        contractor_id: creatorId,
        role: 'leader',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const member = await this.dataInterface.create('bid_group_members', memberData);
      
      // Emit internal domain event
      this.domainEvents.emit('bid_group_created', { group, member });
      
      return {
        success: true,
        data: {
          group,
          member
        }
      };
    } catch (error) {
      console.error('Error creating bid group:', error);
      return {
        success: false,
        error: 'CREATION_ERROR',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Join an existing bid group
   * 
   * @param params Group joining parameters
   * @returns Operation result with join details
   */
  private async joinBidGroup(params: any): Promise<DomainOperationResult> {
    try {
      // Extract the user ID from the context
      const userId = this.context.userId;
      
      if (!userId) {
        return {
          success: false,
          error: 'AUTHENTICATION_ERROR',
          message: 'User must be authenticated to join a bid group'
        };
      }
      
      // Check if the user is a contractor
      const isContractor = await this.isUserContractor(userId);
      
      if (!isContractor) {
        return {
          success: false,
          error: 'PERMISSION_DENIED',
          message: 'Only contractors can join bid groups'
        };
      }
      
      // Get the group
      const group = await this.dataInterface.findById('bid_groups', params.bid_group_id);
      
      if (!group) {
        return {
          success: false,
          error: 'GROUP_NOT_FOUND',
          message: `Bid group with ID ${params.bid_group_id} not found`
        };
      }
      
      // Check if the group is open for joining
      if (group.status !== 'open') {
        return {
          success: false,
          error: 'GROUP_CLOSED',
          message: `Group with status '${group.status}' is not open for new members`
        };
      }
      
      // Get the current member count
      const currentMembers = await this.dataInterface.findMany('bid_group_members', {
        bid_group_id: params.bid_group_id,
        status: 'active'
      });
      
      // Check if the group is full
      if (currentMembers.length >= group.max_members) {
        return {
          success: false,
          error: 'GROUP_FULL',
          message: 'This bid group is already at maximum capacity'
        };
      }
      
      // Check if the user is already a member
      const existingMembership = currentMembers.find(m => m.contractor_id === userId);
      
      if (existingMembership) {
        return {
          success: false,
          error: 'ALREADY_MEMBER',
          message: 'You are already a member of this bid group'
        };
      }
      
      // Add the user as a member
      const memberData = {
        bid_group_id: params.bid_group_id,
        contractor_id: userId,
        role: 'member',
        join_message: params.join_message,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const member = await this.dataInterface.create('bid_group_members', memberData);
      
      // Emit internal domain event
      this.domainEvents.emit('bid_group_joined', { group, member });
      
      return {
        success: true,
        data: {
          group,
          member
        }
      };
    } catch (error) {
      console.error('Error joining bid group:', error);
      return {
        success: false,
        error: 'JOIN_ERROR',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Submit a group bid on behalf of a bid group
   * 
   * @param params Group bid submission parameters
   * @returns Operation result with submitted group bid
   */
  private async submitGroupBid(params: any): Promise<DomainOperationResult> {
    try {
      // Extract the user ID from the context
      const userId = this.context.userId;
      
      if (!userId) {
        return {
          success: false,
          error: 'AUTHENTICATION_ERROR',
          message: 'User must be authenticated to submit a group bid'
        };
      }
      
      // Get the group
      const group = await this.dataInterface.findById('bid_groups', params.bid_group_id);
      
      if (!group) {
        return {
          success: false,
          error: 'GROUP_NOT_FOUND',
          message: `Bid group with ID ${params.bid_group_id} not found`
        };
      }
      
      // Check if the user is the group leader
      const membership = await this.dataInterface.findOne('bid_group_members', {
        bid_group_id: params.bid_group_id,
        contractor_id: userId
      });
      
      if (!membership || membership.role !== 'leader') {
        return {
          success: false,
          error: 'PERMISSION_DENIED',
          message: 'Only the group leader can submit a group bid'
        };
      }
      
      // Get the bid card
      const bidCard = await this.dataInterface.findById('bid_cards', group.bid_card_id);
      
      if (!bidCard) {
        return {
          success: false,
          error: 'BID_CARD_NOT_FOUND',
          message: `Bid card with ID ${group.bid_card_id} not found`
        };
      }
      
      // Check if the bid card is open for bidding
      if (bidCard.status !== 'open') {
        return {
          success: false,
          error: 'INVALID_STATUS',
          message: `Bid card with status '${bidCard.status}' is not open for bidding`
        };
      }
      
      // Check if the bid deadline has passed
      if (bidCard.bid_deadline && new Date(bidCard.bid_deadline) < new Date()) {
        return {
          success: false,
          error: 'BID_DEADLINE_PASSED',
          message: 'The bid deadline has passed'
        };
      }
      
      // Check if the group already has a bid for this bid card
      const existingBid = await this.dataInterface.findOne('group_bids', {
        bid_card_id: group.bid_card_id,
        bid_group_id: params.bid_group_id
      });
      
      if (existingBid) {
        return {
          success: false,
          error: 'BID_ALREADY_EXISTS',
          message: 'This group has already submitted a bid for this bid card'
        };
      }
      
      // Get all group members
      const members = await this.dataInterface.findMany('bid_group_members', {
        bid_group_id: params.bid_group_id,
        status: 'active'
      });
      
      // Prepare the group bid data
      const groupBidData = {
        bid_card_id: group.bid_card_id,
        bid_group_id: params.bid_group_id,
        leader_id: userId,
        amount: params.amount,
        scope_of_work: params.scope_of_work,
        materials_included: params.materials_included || {},
        timeline: params.timeline || {},
        value_propositions: params.value_propositions || [],
        member_roles: params.member_roles || {},
        additional_notes: params.additional_notes,
        member_count: members.length,
        status: 'submitted',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Create the group bid in the database
      const groupBid = await this.dataInterface.create('group_bids', groupBidData);
      
      // Emit internal domain event
      this.domainEvents.emit('group_bid_submitted', groupBid);
      
      return {
        success: true,
        data: groupBid
      };
    } catch (error) {
      console.error('Error submitting group bid:', error);
      return {
        success: false,
        error: 'SUBMISSION_ERROR',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Accept a group bid
   * 
   * @param params Parameters containing the group bid ID
   * @returns Operation result with acceptance details
   */
  private async acceptGroupBid(params: any): Promise<DomainOperationResult> {
    try {
      // Extract the user ID from the context
      const userId = this.context.userId;
      
      if (!userId) {
        return {
          success: false,
          error: 'AUTHENTICATION_ERROR',
          message: 'User must be authenticated to accept a group bid'
        };
      }
      
      // Get the group bid
      const groupBid = await this.dataInterface.findById('group_bids', params.group_bid_id);
      
      if (!groupBid) {
        return {
          success: false,
          error: 'NOT_FOUND',
          message: `Group bid with ID ${params.group_bid_id} not found`
        };
      }
      
      // Get the bid card to check ownership
      const bidCard = await this.dataInterface.findById('bid_cards', groupBid.bid_card_id);
      
      if (!bidCard) {
        return {
          success: false,
          error: 'BID_CARD_NOT_FOUND',
          message: `Bid card with ID ${groupBid.bid_card_id} not found`
        };
      }
      
      // Verify ownership
      if (bidCard.creator_id !== userId) {
        return {
          success: false,
          error: 'PERMISSION_DENIED',
          message: 'You can only accept bids on your own bid cards'
        };
      }
      
      // Check if the bid card is still open
      if (bidCard.status !== 'open') {
        return {
          success: false,
          error: 'INVALID_STATUS',
          message: `Bid card with status '${bidCard.status}' does not allow bid acceptance`
        };
      }
      
      // Check if the group bid is already accepted
      if (groupBid.status === 'accepted') {
        return {
          success: false,
          error: 'BID_ALREADY_ACCEPTED',
          message: 'This group bid has already been accepted'
        };
      }
      
      // Update the group bid status
      const updatedGroupBid = await this.dataInterface.update('group_bids', params.group_bid_id, {
        status: 'accepted',
        accepted_at: new Date(),
        updated_at: new Date()
      });
      
      // Update the bid card status
      const updatedBidCard = await this.dataInterface.update('bid_cards', groupBid.bid_card_id, {
        status: 'awarded',
        awarded_group_bid_id: params.group_bid_id,
        awarded_at: new Date(),
        updated_at: new Date()
      });
      
      // Create a group acceptance record
      const acceptanceData = {
        group_bid_id: params.group_bid_id,
        bid_card_id: groupBid.bid_card_id,
        homeowner_id: userId,
        bid_group_id: groupBid.bid_group_id,
        amount: groupBid.amount,
        terms_accepted: params.terms_accepted || true,
        status: 'pending_group_confirmation',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const acceptance = await this.dataInterface.create('group_bid_acceptances', acceptanceData);
      
      // Emit internal domain event
      this.domainEvents.emit('group_bid_accepted', acceptance);
      
      return {
        success: true,
        data: {
          acceptance,
          group_bid: updatedGroupBid,
          bid_card: updatedBidCard
        }
      };
    } catch (error) {
      console.error('Error accepting group bid:', error);
      return {
        success: false,
        error: 'ACCEPTANCE_ERROR',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Determine if a bid card update requires revision tracking
   * 
   * @param existingBidCard The existing bid card
   * @param params The update parameters
   * @returns Whether revision tracking is needed
   */
  private needsRevisionTracking(existingBidCard: any, params: any): boolean {
    // Check for significant changes that would require revision tracking
    const significantFields = [
      'title',
      'description',
      'budget_min',
      'budget_max',
      'timeline_start',
      'timeline_end',
      'bid_deadline'
    ];
    
    // Check if any significant fields have changed
    for (const field of significantFields) {
      if (params[field] !== undefined && params[field] !== existingBidCard[field]) {
        return true;
      }
    }
    
    // Check specifically for location changes
    if (params.location && JSON.stringify(params.location) !== JSON.stringify(existingBidCard.location)) {
      return true;
    }
    
    return false;
  }

  /**
   * Determine the type of revision for a bid card update
   * 
   * @param existingBidCard The existing bid card
   * @param params The update parameters
   * @returns The revision type
   */
  private determineRevisionType(existingBidCard: any, params: any): string {
    // Check for significant changes to determine revision type
    
    // Budget changes
    if (
      (params.budget_min !== undefined && params.budget_min !== existingBidCard.budget_min) ||
      (params.budget_max !== undefined && params.budget_max !== existingBidCard.budget_max)
    ) {
      return 'budget_change';
    }
    
    // Timeline changes
    if (
      (params.timeline_start !== undefined && params.timeline_start !== existingBidCard.timeline_start) ||
      (params.timeline_end !== undefined && params.timeline_end !== existingBidCard.timeline_end) ||
      (params.bid_deadline !== undefined && params.bid_deadline !== existingBidCard.bid_deadline)
    ) {
      return 'timeline_change';
    }
    
    // Scope changes (title/description)
    if (
      (params.title !== undefined && params.title !== existingBidCard.title) ||
      (params.description !== undefined && params.description !== existingBidCard.description)
    ) {
      return 'scope_change';
    }
    
    // Location changes
    if (params.location && JSON.stringify(params.location) !== JSON.stringify(existingBidCard.location)) {
      return 'location_change';
    }
    
    // Default to general update
    return 'general_update';
  }

  /**
   * Extract detailed changes between existing bid card and update params
   * 
   * @param existingBidCard The existing bid card
   * @param params The update parameters
   * @returns Object containing the detailed changes
   */
  private extractDetailedChanges(existingBidCard: any, params: any): Record<string, any> {
    const changes: Record<string, any> = {};
    
    // Check each field for changes
    for (const key of Object.keys(params)) {
      // Skip non-data fields
      if (['id', 'change_summary', 'updated_at'].includes(key)) {
        continue;
      }
      
      // Special handling for object types
      if (typeof params[key] === 'object' && params[key] !== null) {
        // Skip if both are objects and are equal
        if (
          typeof existingBidCard[key] === 'object' &&
          existingBidCard[key] !== null &&
          JSON.stringify(params[key]) === JSON.stringify(existingBidCard[key])
        ) {
          continue;
        }
        
        changes[key] = {
          previous: existingBidCard[key],
          new: params[key]
        };
      }
      // Simple value comparison for primitive types
      else if (params[key] !== existingBidCard[key]) {
        changes[key] = {
          previous: existingBidCard[key],
          new: params[key]
        };
      }
    }
    
    return changes;
  }

  /**
   * Check if a user is a contractor
   * 
   * @param userId User ID to check
   * @returns Whether the user is a contractor
   */
  private async isUserContractor(userId: string): Promise<boolean> {
    // Check if the user has the contractor role
    const user = await this.dataInterface.findById('users', userId);
    
    if (!user) {
      return false;
    }
    
    // Check user role
    if (user.role === 'contractor') {
      return true;
    }
    
    // Check if the user has a contractor profile
    const contractor = await this.getContractorByUserId(userId);
    
    return contractor !== null;
  }

  /**
   * Get a contractor by user ID
   * 
   * @param userId User ID to look up
   * @returns Contractor object or null if not found
   */
  private async getContractorByUserId(userId: string): Promise<any | null> {
    try {
      // Query the contractor table
      const contractor = await this.dataInterface.findOne('contractors', { user_id: userId });
      
      return contractor || null;
    } catch (error) {
      console.error('Error getting contractor by user ID:', error);
      return null;
    }
  }

  /**
   * Get a contractor by contractor ID
   * 
   * @param contractorId Contractor ID to look up
   * @returns Contractor object or null if not found
   */
  private async getContractorById(contractorId: string): Promise<any | null> {
    try {
      // Query the contractor table
      const contractor = await this.dataInterface.findById('contractors', contractorId);
      
      return contractor || null;
    } catch (error) {
      console.error('Error getting contractor by ID:', error);
      return null;
    }
  }

  /**
   * Get all bid card IDs created by a specific user
   * 
   * @param userId User ID to look up
   * @returns Array of bid card IDs
   */
  private async getBidCardIdsByCreator(userId: string): Promise<string[]> {
    try {
      // Query the bid_cards table
      const bidCards = await this.dataInterface.findMany('bid_cards', { creator_id: userId });
      
      // Extract the IDs
      return bidCards.map(card => card.id);
    } catch (error) {
      console.error('Error getting bid card IDs by creator:', error);
      return [];
    }
  }
}
