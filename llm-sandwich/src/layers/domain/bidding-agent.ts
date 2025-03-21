/**
 * Bidding Domain Agent for the LLM Domain Layer
 * 
 * This agent handles all bidding-related operations in the InstaBids platform,
 * implementing business logic for creating, evaluating, and managing bids.
 */

import { DomainAgent, DomainAgentResponse } from './domain-agent.js';
import { QueryIntentType, QueryResult } from '../guard/database-agent-proxy.js';
import { ContextType } from '../../integration/context-manager.js';

/**
 * Interface for bid data
 */
export interface Bid {
  id?: string;
  project_id: string;
  contractor_id: string;
  amount: number;
  description: string;
  materials?: string[];
  labor_hours?: number;
  timeline_days?: number;
  status: 'draft' | 'submitted' | 'accepted' | 'rejected' | 'withdrawn';
  created_at?: string;
  updated_at?: string;
}

/**
 * Interface for project data
 */
export interface Project {
  id: string;
  title: string;
  description: string;
  homeowner_id: string;
  location: string;
  budget_min?: number;
  budget_max?: number;
  timeline_start?: string;
  timeline_end?: string;
  status: 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled';
  created_at?: string;
  updated_at?: string;
}

/**
 * Interface for bid evaluation criteria
 */
export interface BidEvaluationCriteria {
  priceFactor: number; // 0-1, importance of price
  timelineFactor: number; // 0-1, importance of timeline
  ratingFactor: number; // 0-1, importance of contractor rating
  // Additional factors can be added
}

/**
 * Bidding Domain Agent - handles all bidding-related operations
 */
export class BiddingAgent extends DomainAgent {
  
  constructor(authId?: string) {
    super(authId);
  }
  
  /**
   * Get the entity type for this domain agent
   */
  protected getEntityType(): string {
    return 'contractor'; // Default entity type for bidding is contractor
  }
  
  /**
   * Get the domain name for this agent
   */
  protected getDomain(): string {
    return 'bidding';
  }
  
  /**
   * Create a new bid for a project
   */
  async createBid(bid: Omit<Bid, 'contractor_id' | 'status'>): Promise<DomainAgentResponse<Bid>> {
    // Get contractor profile to ensure ID relationship pattern is followed
    const profileResult = await this.getProfile<{ id: string }>();
    
    if (profileResult.error || !profileResult.data) {
      return {
        success: false,
        error: profileResult.error || 'Profile not found',
        explanation: 'Failed to get contractor profile'
      };
    }
    
    // Prepare bid data with proper contractor ID from profile
    const bidData: Bid = {
      ...bid,
      contractor_id: profileResult.data.id,
      status: 'draft'
    };
    
    // Create the bid
    const result = await this.executeDatabase<Bid>({
      type: QueryIntentType.INSERT,
      description: 'Create a new bid for a project',
      tables: ['bids'],
      data: bidData
    });
    
    return this.formatResponse(result, 'Bid created successfully');
  }
  
  /**
   * Get all bids for a specific project
   */
  async getProjectBids(projectId: string): Promise<DomainAgentResponse<Bid[]>> {
    const result = await this.executeDatabase<Bid[]>({
      type: QueryIntentType.SELECT,
      description: 'Get all bids for a project',
      tables: ['bids'],
      filters: { project_id: projectId }
    });
    
    return this.formatResponse(result, `Retrieved ${result.data?.length || 0} bids for project`);
  }
  
  /**
   * Get all bids submitted by the current contractor
   */
  async getMyBids(): Promise<DomainAgentResponse<Bid[]>> {
    // Get contractor profile to ensure ID relationship pattern is followed
    const profileResult = await this.getProfile<{ id: string }>();
    
    if (profileResult.error || !profileResult.data) {
      return {
        success: false,
        error: profileResult.error || 'Profile not found',
        explanation: 'Failed to get contractor profile',
        data: []
      };
    }
    
    // Get bids for this contractor
    const result = await this.executeDatabase<Bid[]>({
      type: QueryIntentType.SELECT,
      description: 'Get all bids submitted by the current contractor',
      tables: ['bids'],
      filters: { contractor_id: profileResult.data.id }
    });
    
    return this.formatResponse(result, `Retrieved ${result.data?.length || 0} bids for contractor`);
  }
  
  /**
   * Update an existing bid
   */
  async updateBid(bidId: string, bidUpdates: Partial<Bid>): Promise<DomainAgentResponse<Bid>> {
    // Get contractor profile to ensure ID relationship pattern is followed
    const profileResult = await this.getProfile<{ id: string }>();
    
    if (profileResult.error || !profileResult.data) {
      return {
        success: false,
        error: profileResult.error || 'Profile not found',
        explanation: 'Failed to get contractor profile'
      };
    }
    
    // Ensure this contractor owns the bid (ID relationship pattern)
    const bidResult = await this.executeDatabase<Bid>({
      type: QueryIntentType.SELECT,
      description: 'Verify bid ownership',
      tables: ['bids'],
      filters: { 
        id: bidId,
        contractor_id: profileResult.data.id
      }
    });
    
    if (bidResult.error || !bidResult.data) {
      return this.formatResponse(bidResult, 'Failed to update bid: Not found or not authorized');
    }
    
    // Don't allow changing contractor_id or project_id
    const { contractor_id, project_id, ...allowedUpdates } = bidUpdates;
    
    // Update the bid
    const result = await this.executeDatabase<Bid>({
      type: QueryIntentType.UPDATE,
      description: 'Update an existing bid',
      tables: ['bids'],
      filters: { id: bidId },
      data: allowedUpdates
    });
    
    return this.formatResponse(result, 'Bid updated successfully');
  }
  
  /**
   * Submit a bid (change status from draft to submitted)
   */
  async submitBid(bidId: string): Promise<DomainAgentResponse<Bid>> {
    return await this.updateBid(bidId, { status: 'submitted' });
  }
  
  /**
   * Withdraw a bid (change status to withdrawn)
   */
  async withdrawBid(bidId: string): Promise<DomainAgentResponse<Bid>> {
    return await this.updateBid(bidId, { status: 'withdrawn' });
  }
  
  /**
   * Use LLM to evaluate and rank bids for a project
   * This demonstrates the "adaptive domain logic" capability
   */
  async evaluateBids(
    projectId: string,
    criteria?: BidEvaluationCriteria
  ): Promise<DomainAgentResponse<{ rankedBids: Bid[], explanation: string }>> {
    // First, get the project details
    const projectResult = await this.executeDatabase<Project>({
      type: QueryIntentType.SELECT,
      description: 'Get project details for bid evaluation',
      tables: ['projects'],
      filters: { id: projectId }
    });
    
    if (projectResult.error || !projectResult.data) {
      return {
        success: false,
        error: projectResult.error || 'Project not found',
        explanation: 'Cannot evaluate bids without project details'
      };
    }
    
    // Then get all bids for this project
    const bidsResult = await this.getProjectBids(projectId);
    
    if (!bidsResult.success || !bidsResult.data || bidsResult.data.length === 0) {
      return {
        success: false,
        error: bidsResult.error || 'No bids found',
        explanation: 'Cannot evaluate bids when none exist'
      };
    }
    
    // Default criteria if not provided
    const evaluationCriteria = criteria || {
      priceFactor: 0.5,
      timelineFactor: 0.3,
      ratingFactor: 0.2
    };
    
    // Use LLM to evaluate bids based on criteria
    const userPrompt = `
    Please evaluate and rank the following bids for project "${projectResult.data.title}".
    
    Project details:
    ${JSON.stringify(projectResult.data, null, 2)}
    
    Bids to evaluate:
    ${JSON.stringify(bidsResult.data, null, 2)}
    
    Evaluation criteria:
    ${JSON.stringify(evaluationCriteria, null, 2)}
    
    Please rank the bids and explain your reasoning. Return your response as a JSON object with these properties:
    1. "rankedBids": An array of bid objects ordered from best to worst
    2. "explanation": A detailed explanation of your ranking rationale
    
    Only include the JSON in your response.
    `;
    
    const systemContext = `
    You are an expert in evaluating contractor bids for construction and home improvement projects.
    Your task is to analyze bids objectively based on the given criteria and provide a ranked list.
    Consider price, timeline, contractor ratings, and any other relevant factors in your evaluation.
    `;
    
    try {
      // Get bid evaluations from LLM
      const llmResult = await this.useLLM(userPrompt, systemContext, {
        contextTypes: [ContextType.SCHEMA],
        tableOrDomain: 'bidding',
        temperature: 0.2 // Lower temperature for more deterministic ranking
      });
      
      // Parse the result
      const evaluation = JSON.parse(llmResult);
      
      return {
        success: true,
        data: evaluation,
        explanation: 'Bids evaluated and ranked successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to evaluate bids',
        explanation: 'An error occurred during bid evaluation'
      };
    }
  }
}
