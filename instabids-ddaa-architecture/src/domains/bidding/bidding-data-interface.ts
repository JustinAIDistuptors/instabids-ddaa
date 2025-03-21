/**
 * Bidding Domain Data Interface
 * 
 * This interface provides persistence capabilities specific to the bidding domain.
 * It implements the generic data interface but adds bid-specific operations.
 */

import { BaseDataInterface, DataQuery, DataTransaction, QueryResult, SupabaseDataInterface } from '../../core/persistence/data-interface';

/**
 * Bid entity representing a contractor's bid on a project
 */
export interface Bid {
  id: string;
  projectId: string;
  contractorId: string;
  amount: number;
  description: string;
  materials?: string[];
  timelineInDays: number;
  startDate?: Date;
  status: BidStatus;
  visibility: BidVisibility;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  tags?: string[];
  groupBidId?: string;
  isLeadBid?: boolean;
  customFields?: Record<string, any>;
  attachmentUrls?: string[];
  revisionCount?: number;
  previousBidIds?: string[];
}

/**
 * The status of a bid in its lifecycle
 */
export enum BidStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  WITHDRAWN = 'withdrawn',
  COUNTERED = 'countered'
}

/**
 * Who can see this bid
 */
export enum BidVisibility {
  PUBLIC = 'public',        // Visible to project owner and all bidders
  PRIVATE = 'private',      // Visible only to project owner
  GROUP = 'group'           // Visible to project owner and group members
}

/**
 * Custom queries specific to the bidding domain
 */
export interface BiddingQueries {
  /**
   * Finds bids that are about to expire
   * 
   * @param thresholdHours Hours until expiration
   * @returns Bids that will expire within the threshold
   */
  findSoonToExpireBids(thresholdHours: number): Promise<Bid[]>;
  
  /**
   * Finds all bids for a specific contractor
   * 
   * @param contractorId The contractor's ID
   * @param statuses Optional filter for specific statuses
   * @returns Bids submitted by the contractor
   */
  findBidsByContractor(contractorId: string, statuses?: BidStatus[]): Promise<Bid[]>;
  
  /**
   * Finds all bids for a specific project
   * 
   * @param projectId The project's ID
   * @param statuses Optional filter for specific statuses
   * @returns Bids for the project
   */
  findBidsByProject(projectId: string, statuses?: BidStatus[]): Promise<Bid[]>;
  
  /**
   * Gets statistics about bids for a specific project
   * 
   * @param projectId The project's ID
   * @returns Statistics about the bids
   */
  getBidStats(projectId: string): Promise<BidStatistics>;
  
  /**
   * Finds bids that are part of a group bid
   * 
   * @param groupBidId The group bid's ID
   * @returns Bids in the group
   */
  findGroupBids(groupBidId: string): Promise<Bid[]>;
}

/**
 * Statistics about bids for a project
 */
export interface BidStatistics {
  projectId: string;
  totalBids: number;
  averageBidAmount: number;
  lowestBidAmount: number;
  highestBidAmount: number;
  medianBidAmount: number;
  bidsPerStatus: Record<BidStatus, number>;
  bidCountHistory: Array<{
    date: string;
    count: number;
  }>;
}

/**
 * Data interface specific to the bidding domain
 */
export interface BiddingDataInterface extends BaseDataInterface<Bid>, BiddingQueries {
  /**
   * Updates the status of a bid
   * 
   * @param bidId The ID of the bid to update
   * @param newStatus The new status
   * @param metadata Optional metadata about the status change
   * @returns The updated bid
   */
  updateBidStatus(bidId: string, newStatus: BidStatus, metadata?: Record<string, any>): Promise<Bid>;
  
  /**
   * Creates a revision of a bid
   * 
   * @param bidId The ID of the original bid
   * @param revisionData The data for the revision
   * @returns The newly created revision bid
   */
  createBidRevision(bidId: string, revisionData: Partial<Bid>): Promise<Bid>;
  
  /**
   * Adds a bid to a group
   * 
   * @param bidId The ID of the bid to add
   * @param groupBidId The ID of the group
   * @param isLeadBid Whether this bid is the lead bid for the group
   * @returns The updated bid
   */
  addBidToGroup(bidId: string, groupBidId: string, isLeadBid?: boolean): Promise<Bid>;
}

/**
 * Supabase implementation of the bidding data interface
 */
export class SupabaseBiddingDataInterface extends SupabaseDataInterface<Bid> implements BiddingDataInterface {
  protected get tableName(): string {
    return 'bids';
  }
  
  constructor() {
    super('bidding');
  }
  
  // Implement required methods from DataInterface
  async findMany(query?: DataQuery<Bid>): Promise<QueryResult<Bid>> {
    // Implementation with Supabase
    throw new Error('Method not implemented');
  }
  
  async findById(id: string, options?: Pick<DataQuery<Bid>, 'select' | 'relations'>): Promise<Bid | null> {
    // Implementation with Supabase
    throw new Error('Method not implemented');
  }
  
  async findOne(criteria: Record<string, any>, options?: Pick<DataQuery<Bid>, 'select' | 'relations'>): Promise<Bid | null> {
    // Implementation with Supabase
    throw new Error('Method not implemented');
  }
  
  async create(data: Partial<Bid>): Promise<Bid> {
    // Implementation with Supabase
    throw new Error('Method not implemented');
  }
  
  async createMany(dataArray: Partial<Bid>[]): Promise<Bid[]> {
    // Implementation with Supabase
    throw new Error('Method not implemented');
  }
  
  async update(id: string, data: Partial<Bid>): Promise<Bid> {
    // Implementation with Supabase
    throw new Error('Method not implemented');
  }
  
  async updateMany(criteria: Record<string, any>, data: Partial<Bid>): Promise<number> {
    // Implementation with Supabase
    throw new Error('Method not implemented');
  }
  
  async delete(id: string): Promise<boolean> {
    // Implementation with Supabase
    throw new Error('Method not implemented');
  }
  
  async deleteMany(criteria: Record<string, any>): Promise<number> {
    // Implementation with Supabase
    throw new Error('Method not implemented');
  }
  
  async count(criteria?: Record<string, any>): Promise<number> {
    // Implementation with Supabase
    throw new Error('Method not implemented');
  }
  
  async executeCustomQuery<R = any>(name: string, params?: Record<string, any>): Promise<R> {
    // Implementation with Supabase
    throw new Error('Method not implemented');
  }
  
  async transaction<R = any>(callback: (transaction: DataTransaction<Bid>) => Promise<R>): Promise<R> {
    // Implementation with Supabase
    throw new Error('Method not implemented');
  }
  
  // Implement custom queries for the bidding domain
  async findSoonToExpireBids(thresholdHours: number): Promise<Bid[]> {
    // Implementation would use Supabase:
    // const now = new Date();
    // const threshold = new Date(now.getTime() + thresholdHours * 60 * 60 * 1000);
    // const result = await supabase
    //   .from(this.tableName)
    //   .select('*')
    //   .eq('status', BidStatus.SUBMITTED)
    //   .lt('expiresAt', threshold.toISOString())
    //   .gt('expiresAt', now.toISOString());
    // return result.data || [];
    
    throw new Error('Method not implemented');
  }
  
  async findBidsByContractor(contractorId: string, statuses?: BidStatus[]): Promise<Bid[]> {
    // Implementation with Supabase
    throw new Error('Method not implemented');
  }
  
  async findBidsByProject(projectId: string, statuses?: BidStatus[]): Promise<Bid[]> {
    // Implementation with Supabase
    throw new Error('Method not implemented');
  }
  
  async getBidStats(projectId: string): Promise<BidStatistics> {
    // Implementation with Supabase
    throw new Error('Method not implemented');
  }
  
  async findGroupBids(groupBidId: string): Promise<Bid[]> {
    // Implementation with Supabase
    throw new Error('Method not implemented');
  }
  
  async updateBidStatus(bidId: string, newStatus: BidStatus, metadata?: Record<string, any>): Promise<Bid> {
    // Implementation with Supabase
    throw new Error('Method not implemented');
  }
  
  async createBidRevision(bidId: string, revisionData: Partial<Bid>): Promise<Bid> {
    // Implementation with Supabase
    throw new Error('Method not implemented');
  }
  
  async addBidToGroup(bidId: string, groupBidId: string, isLeadBid?: boolean): Promise<Bid> {
    // Implementation with Supabase
    throw new Error('Method not implemented');
  }
}

/**
 * Factory for creating bidding data interface instances
 */
export class BiddingDataInterfaceFactory {
  /**
   * Creates a bidding data interface
   * 
   * @param implementation The implementation to use
   * @returns A bidding data interface instance
   */
  static create(implementation: 'supabase' = 'supabase'): BiddingDataInterface {
    switch (implementation) {
      case 'supabase':
        return new SupabaseBiddingDataInterface();
      
      default:
        throw new Error(`Unknown bidding data interface implementation: ${implementation}`);
    }
  }
}
