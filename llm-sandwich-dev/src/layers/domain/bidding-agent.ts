/**
 * @file Bidding Agent
 * 
 * This file provides the Bidding Domain Agent for the LLM Sandwich Architecture.
 * It forms the middle layer of the sandwich, implementing domain-specific business
 * logic while leveraging the guard and persistence layers.
 */

import { LLMClient, CompletionParams } from '../../integration/llm-client.js';
import { DatabaseAgentProxy } from '../guard/database-agent-proxy.js';
import { QueryIntentType, SelectQueryIntent, InsertQueryIntent, UpdateQueryIntent } from '../persistence/data-interface.js';

/**
 * Bid creation options
 */
export interface CreateBidOptions {
  /** Project ID */
  project_id: string;
  /** Bid amount in dollars */
  amount: number;
  /** Bid description */
  description: string;
  /** Timeline in days */
  timeline_days: number;
  /** Services offered */
  services?: string[];
  /** Materials included */
  materials_included?: boolean;
  /** Warranty information */
  warranty?: string;
  /** Additional notes */
  notes?: string;
  /** Payment schedule */
  payment_schedule?: {
    upfront_percentage: number;
    milestone_payments: { description: string; percentage: number }[];
    final_percentage: number;
  };
}

/**
 * Bid evaluation options
 */
export interface EvaluateBidsOptions {
  /** How important is price (0-1) */
  priceFactor?: number;
  /** How important is timeline (0-1) */
  timelineFactor?: number;
  /** How important is contractor rating (0-1) */
  ratingFactor?: number;
}

/**
 * Bid summary data structure
 */
export interface BidSummary {
  /** Bid ID */
  id: string;
  /** Contractor ID */
  contractor_id: string;
  /** Contractor name */
  contractor_name: string;
  /** Bid amount */
  amount: number;
  /** Timeline in days */
  timeline_days: number;
  /** Contractor rating */
  contractor_rating: number;
  /** Score calculated during evaluation */
  score?: number;
  /** Services offered */
  services?: string[];
  /** Whether materials are included */
  materials_included?: boolean;
}

/**
 * Bid with complete details
 */
export interface BidDetail extends BidSummary {
  /** Project ID */
  project_id: string;
  /** Full bid description */
  description: string;
  /** Warranty information */
  warranty?: string;
  /** Additional notes */
  notes?: string;
  /** Payment schedule */
  payment_schedule?: {
    upfront_percentage: number;
    milestone_payments: { description: string; percentage: number }[];
    final_percentage: number;
  };
  /** Bid created timestamp */
  created_at: string;
  /** Last updated timestamp */
  updated_at: string;
}

/**
 * The Bidding Agent
 */
export class BiddingAgent {
  private databaseProxy: DatabaseAgentProxy;
  private llmClient?: LLMClient;
  private authId: string;
  private entityType: string;
  
  /**
   * Create a new Bidding Agent
   */
  constructor(
    authId: string,
    databaseProxy: DatabaseAgentProxy,
    entityType: 'contractor' | 'homeowner' = 'contractor',
    llmClient?: LLMClient
  ) {
    this.databaseProxy = databaseProxy;
    this.llmClient = llmClient;
    this.authId = authId;
    this.entityType = entityType;
    
    // Verify the user has the correct profile
    this.verifyProfile();
  }
  
  /**
   * Verify the user has the correct profile type
   */
  private async verifyProfile(): Promise<void> {
    const isVerified = await this.databaseProxy.verifyProfile(this.authId, this.entityType);
    
    if (!isVerified) {
      throw new Error(`User is not a ${this.entityType}. Access denied.`);
    }
  }
  
  /**
   * Create a new bid
   */
  public async createBid(options: CreateBidOptions): Promise<string> {
    // Contractors can create bids
    if (this.entityType !== 'contractor') {
      throw new Error('Only contractors can create bids');
    }
    
    // Get contractor ID from profile
    const contractorResult = await this.databaseProxy.execute({
      type: QueryIntentType.SELECT,
      description: 'Get contractor ID for current user',
      tables: ['contractors'],
      authId: this.authId,
      entityType: this.entityType,
      fields: ['id'],
      filters: {
        user_id: this.authId
      }
    } as SelectQueryIntent);
    
    if (!contractorResult.success || !(contractorResult.data?.length ?? 0)) {
      throw new Error('Contractor profile not found');
    }
    
    const contractor_id = contractorResult.data![0].id;
    
    // Create the bid
    const result = await this.databaseProxy.execute({
      type: QueryIntentType.INSERT,
      description: 'Create a new bid',
      tables: ['bids'],
      authId: this.authId,
      entityType: this.entityType,
      data: {
        contractor_id,
        project_id: options.project_id,
        amount: options.amount,
        description: options.description,
        timeline_days: options.timeline_days,
        services: options.services || [],
        materials_included: options.materials_included || false,
        warranty: options.warranty || null,
        notes: options.notes || null,
        payment_schedule: options.payment_schedule ? JSON.stringify(options.payment_schedule) : null,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    } as InsertQueryIntent);
    
    if (!result.success) {
      throw new Error(`Failed to create bid: ${result.error}`);
    }
    
    return result.data![0].id;
  }
  
  /**
   * Get bids for a project
   */
  public async getBidsForProject(projectId: string): Promise<BidSummary[]> {
    // Both contractors and homeowners can view bids but need different filters
    let filters: any;
    
    if (this.entityType === 'contractor') {
      // Contractors can only see their own bids
      filters = {
        project_id: projectId,
        contractor_id: this.authId
      };
    } else {
      // Homeowners need to own the project
      const projectOwnerId = await this.getProjectOwnerId(projectId);
      
      if (projectOwnerId !== this.authId) {
        throw new Error('Access denied: You do not own this project');
      }
      
      filters = {
        project_id: projectId
      };
    }
    
    // Get bids with contractor info
    const result = await this.databaseProxy.execute({
      type: QueryIntentType.SELECT,
      description: 'Get bids for a project with contractor info',
      tables: ['bids', 'contractors'],
      authId: this.authId,
      entityType: this.entityType,
      joins: [
        {
          table: 'contractors',
          type: 'inner',
          on: { 'bids.contractor_id': 'contractors.id' }
        }
      ],
      fields: [
        'bids.id',
        'bids.contractor_id',
        'contractors.business_name as contractor_name',
        'bids.amount',
        'bids.timeline_days',
        'contractors.internal_rating as contractor_rating',
        'bids.services',
        'bids.materials_included'
      ],
      filters,
      orderBy: 'bids.created_at',
      orderDirection: 'desc'
    } as SelectQueryIntent);
    
    if (!result.success) {
      throw new Error(`Failed to get bids: ${result.error}`);
    }
    
    return result.data || [];
  }
  
  /**
   * Get detailed information about a bid
   */
  public async getBidDetail(bidId: string): Promise<BidDetail> {
    // Both contractors and homeowners can view bid details but need different filters
    let filters: any = { 'bids.id': bidId };
    
    if (this.entityType === 'contractor') {
      // Contractors can only see their own bids
      const contractorResult = await this.databaseProxy.execute({
        type: QueryIntentType.SELECT,
        description: 'Get contractor ID for current user',
        tables: ['contractors'],
        authId: this.authId,
        entityType: this.entityType,
        fields: ['id'],
        filters: { user_id: this.authId }
      } as SelectQueryIntent);
      
      if (!contractorResult.success || !(contractorResult.data?.length ?? 0)) {
        throw new Error('Contractor profile not found');
      }
      
      const contractor_id = contractorResult.data![0].id;
      filters['bids.contractor_id'] = contractor_id;
    } else {
      // Homeowners must own the project
      filters = {
        'bids.id': bidId
      };
    }
    
    // Get bid details with contractor info
    const result = await this.databaseProxy.execute({
      type: QueryIntentType.SELECT,
      description: 'Get detailed information about a bid',
      tables: ['bids', 'contractors', 'projects'],
      authId: this.authId,
      entityType: this.entityType,
      joins: [
        {
          table: 'contractors',
          type: 'inner',
          on: { 'bids.contractor_id': 'contractors.id' }
        },
        {
          table: 'projects',
          type: 'inner',
          on: { 'bids.project_id': 'projects.id' }
        }
      ],
      fields: [
        'bids.id',
        'bids.project_id',
        'bids.contractor_id',
        'contractors.business_name as contractor_name',
        'bids.amount',
        'bids.description',
        'bids.timeline_days',
        'contractors.internal_rating as contractor_rating',
        'bids.services',
        'bids.materials_included',
        'bids.warranty',
        'bids.notes',
        'bids.payment_schedule',
        'bids.created_at',
        'bids.updated_at'
      ],
      filters
    } as SelectQueryIntent);
    
    if (!result.success || !(result.data?.length ?? 0)) {
      throw new Error(`Bid not found or access denied: ${result.error}`);
    }
    
    const bid = result.data![0];
    
    // If homeowner, verify they own the project
    if (this.entityType === 'homeowner') {
      const projectOwnerId = await this.getProjectOwnerId(bid.project_id);
      
      if (projectOwnerId !== this.authId) {
        throw new Error('Access denied: You do not own this project');
      }
    }
    
    // Convert payment_schedule from string to object if needed
    if (typeof bid.payment_schedule === 'string') {
      try {
        bid.payment_schedule = JSON.parse(bid.payment_schedule);
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    return bid;
  }
  
  /**
   * Get project owner ID
   */
  private async getProjectOwnerId(projectId: string): Promise<string> {
    const result = await this.databaseProxy.execute({
      type: QueryIntentType.SELECT,
      description: 'Get project owner ID',
      tables: ['projects'],
      authId: this.authId,
      entityType: this.entityType,
      fields: ['homeowner_id'],
      filters: { id: projectId }
    } as SelectQueryIntent);
    
    if (!result.success || !(result.data?.length ?? 0)) {
      throw new Error('Project not found');
    }
    
    return result.data![0].homeowner_id;
  }
  
  /**
   * Accept a bid (homeowners only)
   */
  public async acceptBid(bidId: string): Promise<void> {
    if (this.entityType !== 'homeowner') {
      throw new Error('Only homeowners can accept bids');
    }
    
    // Get the bid to check project ownership
    const bid = await this.getBidDetail(bidId);
    
    // Homeowner must own the project
    const projectOwnerId = await this.getProjectOwnerId(bid.project_id);
    
    if (projectOwnerId !== this.authId) {
      throw new Error('Access denied: You do not own this project');
    }
    
    // Update bid status
    const updateResult = await this.databaseProxy.execute({
      type: QueryIntentType.UPDATE,
      description: 'Accept a bid',
      tables: ['bids'],
      authId: this.authId,
      entityType: this.entityType,
      filters: { id: bidId },
      data: { 
        status: 'accepted',
        updated_at: new Date().toISOString()
      }
    } as UpdateQueryIntent);
    
    if (!updateResult.success) {
      throw new Error(`Failed to accept bid: ${updateResult.error}`);
    }
    
    // Mark other bids as rejected
    await this.databaseProxy.execute({
      type: QueryIntentType.UPDATE,
      description: 'Reject other bids for this project',
      tables: ['bids'],
      authId: this.authId,
      entityType: this.entityType,
      filters: { 
        project_id: bid.project_id,
        id: { $ne: bidId },
        status: 'pending'
      },
      data: { 
        status: 'rejected',
        updated_at: new Date().toISOString()
      }
    } as UpdateQueryIntent);
    
    // Create a project record (simplified)
    await this.databaseProxy.execute({
      type: QueryIntentType.INSERT,
      description: 'Create a project from the accepted bid',
      tables: ['projects'],
      authId: this.authId,
      entityType: this.entityType,
      data: {
        bid_id: bidId,
        homeowner_id: this.authId,
        contractor_id: bid.contractor_id,
        title: `Project from bid ${bidId}`,
        description: bid.description,
        status: 'starting',
        total_amount: bid.amount,
        timeline_days: bid.timeline_days,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    } as InsertQueryIntent);
  }
  
  /**
   * Evaluate bids for a project using LLM (homeowners only)
   */
  public async evaluateBids(
    projectId: string,
    options: EvaluateBidsOptions = {}
  ): Promise<BidSummary[]> {
    if (this.entityType !== 'homeowner') {
      throw new Error('Only homeowners can evaluate bids');
    }
    
    if (!this.llmClient) {
      throw new Error('LLM client is required for bid evaluation');
    }
    
    // Get all bids for the project
    const bids = await this.getBidsForProject(projectId);
    
    if (bids.length === 0) {
      return [];
    }
    
    // Get project details
    const projectResult = await this.databaseProxy.execute({
      type: QueryIntentType.SELECT,
      description: 'Get project details for bid evaluation',
      tables: ['projects'],
      authId: this.authId,
      entityType: this.entityType,
      fields: ['title', 'description', 'estimated_budget', 'estimated_timeline'],
      filters: { id: projectId, homeowner_id: this.authId }
    } as SelectQueryIntent);
    
    if (!projectResult.success || !(projectResult.data?.length ?? 0)) {
      throw new Error('Project not found or access denied');
    }
    
    const project = projectResult.data![0];
    
    // Set default weighting factors
    const priceFactor = options.priceFactor ?? 0.4;
    const timelineFactor = options.timelineFactor ?? 0.3;
    const ratingFactor = options.ratingFactor ?? 0.3;
    
    // Use LLM to evaluate bids
    const prompt = `
You are a construction bid evaluation assistant. Please evaluate the following bids
for a construction project and provide a score from 0-100 for each bid.

Project details:
Title: ${project.title}
Description: ${project.description}
Estimated budget: $${project.estimated_budget || 'Not specified'}
Estimated timeline: ${project.estimated_timeline || 'Not specified'} days

Bids to evaluate:
${bids.map((bid, index) => `
Bid ${index + 1}:
- Contractor: ${bid.contractor_name}
- Amount: $${bid.amount}
- Timeline: ${bid.timeline_days} days
- Contractor rating: ${bid.contractor_rating}/5.0
- Services offered: ${bid.services ? bid.services.join(', ') : 'Not specified'}
- Materials included: ${bid.materials_included ? 'Yes' : 'No'}
`).join('')}

Evaluation factors:
- Price (${priceFactor * 100}% weight)
- Timeline (${timelineFactor * 100}% weight)
- Contractor rating (${ratingFactor * 100}% weight)

Provide your evaluation as a JSON array with a score for each bid, where each object
includes the bid index (0-based) and a score from 0-100:
[
  {"index": 0, "score": 85, "reasoning": "..."},
  {"index": 1, "score": 78, "reasoning": "..."},
  ...
]
`;
    
    const completionParams: CompletionParams = {
      prompt,
      temperature: 0.3,
      maxTokens: 2000,
    };
    
    const response = await this.llmClient.complete(completionParams);
    
    // Parse the evaluation results
    try {
      // Extract JSON from response
      const match = response.content.match(/\[\s*\{[\s\S]*\}\s*\]/);
      
      if (!match) {
        throw new Error('Could not parse evaluation results');
      }
      
      const evaluations = JSON.parse(match[0]);
      
      // Add scores to bids
      evaluations.forEach((evaluation: any) => {
        if (typeof evaluation.index === 'number' && typeof evaluation.score === 'number') {
          if (bids[evaluation.index]) {
            bids[evaluation.index].score = evaluation.score;
          }
        }
      });
      
      // Sort bids by score (highest first)
      return bids.sort((a, b) => ((b.score ?? 0) - (a.score ?? 0)));
    } catch (error) {
      console.error('Failed to parse evaluation results:', error);
      return bids;
    }
  }
}
