/**
 * @file LLM Sandwich Architecture Integration Test
 * 
 * This file contains tests that verify the LLM Sandwich Architecture
 * works correctly by testing all three layers together:
 * 1. Guard Layer (DatabaseAgentProxy)
 * 2. Domain Layer (BiddingAgent)
 * 3. Persistence Layer (DataInterface)
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, jest } from '@jest/globals';
import { KnowledgeRepositoryService } from '../src/knowledge-base/repository/knowledge-repository.js';
import { ContextManager } from '../src/integration/context-manager.js';
import { DataInterface, DBClient, QueryResult, SelectQueryIntent } from '../src/layers/persistence/data-interface.js';
import { DatabaseAgentProxy } from '../src/layers/guard/database-agent-proxy.js';
import { BiddingAgent } from '../src/layers/domain/bidding-agent.js';
import { Schema, SchemaType } from '../src/knowledge-base/types.js';

/**
 * Mock database client for testing
 */
class MockDBClient implements DBClient {
  // Mock database tables
  private tables: Record<string, any[]> = {
    contractors: [
      {
        id: 'contractor-1',
        user_id: 'auth-contractor-1',
        business_name: 'ABC Contracting',
        internal_rating: 4.5,
        verification_status: 'verified'
      }
    ],
    homeowners: [
      {
        id: 'homeowner-1',
        user_id: 'auth-homeowner-1',
        name: 'John Smith',
        address_id: 'address-1',
        rating: 4.2
      }
    ],
    projects: [
      {
        id: 'project-1',
        homeowner_id: 'auth-homeowner-1',
        contractor_id: 'contractor-1',
        title: 'Kitchen Renovation',
        description: 'Full kitchen renovation',
        status: 'bidding',
        estimated_budget: 15000,
        estimated_timeline: 30
      }
    ],
    bids: []
  };

  // Track executed queries for testing
  public executedQueries: any[] = [];

  /**
   * Execute a raw SQL query
   */
  async query(sql: string, params?: any[]): Promise<QueryResult> {
    // Log the query for testing
    this.executedQueries.push({ type: 'raw', sql, params });
    
    // Mock implementation - just return success
    return {
      success: true,
      data: [],
      rowCount: 0,
      sql
    };
  }

  /**
   * Get schema information for a table
   */
  async getTableSchema(tableName: string): Promise<Schema | null> {
    // Create a simple schema definition based on the table name
    if (tableName in this.tables) {
      // Get a sample record to infer schema
      const sample = this.tables[tableName][0] || {};
      
      const schema: Schema = {
        id: tableName,
        name: tableName,
        type: SchemaType.TABLE,
        fields: Object.keys(sample).map(key => ({
          name: key,
          type: typeof sample[key] === 'number' ? 'number' : 'string',
          required: key === 'id',
          isPrimaryKey: key === 'id',
          isForeignKey: key.endsWith('_id') && key !== 'id',
          description: `${key} field`
        })),
        relationships: [],
        constraints: []
      };
      
      return schema;
    }
    
    return null;
  }

  /**
   * Execute a SELECT query
   */
  async select(table: string, query?: Partial<SelectQueryIntent>): Promise<QueryResult> {
    // Log the query for testing
    this.executedQueries.push({ type: 'select', table, query });
    
    // If the table doesn't exist, return error
    if (!(table in this.tables)) {
      return {
        success: false,
        error: `Table ${table} does not exist`,
        data: [],
        rowCount: 0
      };
    }
    
    // Filter data based on query
    let data = [...this.tables[table]];
    
    // Apply filters if any
    if (query?.filters) {
      data = data.filter(row => {
        // Simple filter implementation for testing
        for (const [key, value] of Object.entries(query.filters as Record<string, any>)) {
          if (row[key] !== value) {
            return false;
          }
        }
        return true;
      });
    }
    
    // Select specific fields if specified
    if (query?.fields?.length) {
      data = data.map(row => {
        const result: Record<string, any> = {};
        for (const field of query.fields!) {
          // Handle 'as' aliases
          const [fieldName, alias] = field.split(' as ');
          result[alias || fieldName] = row[fieldName];
        }
        return result;
      });
    }
    
    return {
      success: true,
      data,
      rowCount: data.length,
      sql: `SELECT * FROM ${table} WHERE ...`
    };
  }

  /**
   * Execute an INSERT query
   */
  async insert(table: string, query: any): Promise<QueryResult> {
    // Log the query for testing
    this.executedQueries.push({ type: 'insert', table, query });
    
    // If the table doesn't exist, return error
    if (!(table in this.tables)) {
      return {
        success: false,
        error: `Table ${table} does not exist`,
        data: [],
        rowCount: 0
      };
    }
    
    // Generate an ID if not provided
    const data = Array.isArray(query.data) ? query.data : [query.data];
    
    // Add IDs and insert into table
    const insertedData = data.map(item => {
      const newItem = { ...item };
      if (!newItem.id) {
        newItem.id = `${table}-${this.tables[table].length + 1}`;
      }
      this.tables[table].push(newItem);
      return newItem;
    });
    
    return {
      success: true,
      data: insertedData,
      rowCount: insertedData.length,
      sql: `INSERT INTO ${table} ...`
    };
  }

  /**
   * Execute an UPDATE query
   */
  async update(table: string, query: any): Promise<QueryResult> {
    // Log the query for testing
    this.executedQueries.push({ type: 'update', table, query });
    
    // If the table doesn't exist, return error
    if (!(table in this.tables)) {
      return {
        success: false,
        error: `Table ${table} does not exist`,
        data: [],
        rowCount: 0
      };
    }
    
    // Find rows to update
    let updateCount = 0;
    if (query.filters) {
      this.tables[table].forEach((row, index) => {
        let matches = true;
        
        // Check if row matches filters
        for (const [key, value] of Object.entries(query.filters as Record<string, any>)) {
          if (row[key] !== value) {
            matches = false;
            break;
          }
        }
        
        // Update row if it matches
        if (matches) {
          this.tables[table][index] = { ...row, ...query.data };
          updateCount++;
        }
      });
    }
    
    return {
      success: true,
      data: [],
      rowCount: updateCount,
      sql: `UPDATE ${table} ...`
    };
  }

  /**
   * Execute a DELETE query
   */
  async delete(table: string, query: any): Promise<QueryResult> {
    // Log the query for testing
    this.executedQueries.push({ type: 'delete', table, query });
    
    // If the table doesn't exist, return error
    if (!(table in this.tables)) {
      return {
        success: false,
        error: `Table ${table} does not exist`,
        data: [],
        rowCount: 0
      };
    }
    
    // Find rows to delete
    let initialLength = this.tables[table].length;
    
    if (query.filters) {
      this.tables[table] = this.tables[table].filter(row => {
        for (const [key, value] of Object.entries(query.filters as Record<string, any>)) {
          if (row[key] === value) {
            return false; // Delete this row
          }
        }
        return true; // Keep this row
      });
    }
    
    const deleteCount = initialLength - this.tables[table].length;
    
    return {
      success: true,
      data: [],
      rowCount: deleteCount,
      sql: `DELETE FROM ${table} ...`
    };
  }

  /**
   * Clear all executed queries (for test setup)
   */
  clearExecutedQueries(): void {
    this.executedQueries = [];
  }
}

describe('LLM Sandwich Architecture Integration Tests', () => {
  // Test components
  let mockDBClient: MockDBClient;
  let knowledgeRepository: KnowledgeRepositoryService;
  let contextManager: ContextManager;
  let dataInterface: DataInterface;
  let databaseProxy: DatabaseAgentProxy;
  let contractorBiddingAgent: BiddingAgent;
  let homeownerBiddingAgent: BiddingAgent;
  
  beforeAll(async () => {
    // Create mock database client
    mockDBClient = new MockDBClient();
    
    // Create and initialize knowledge repository
    knowledgeRepository = new KnowledgeRepositoryService({
      storagePath: 'memory', // Use in-memory storage for tests
    });
    await knowledgeRepository.initialize();
    
    // Add some schema definitions for testing
    await knowledgeRepository.addSchema({
      id: 'contractors',
      name: 'contractors',
      type: SchemaType.TABLE,
      fields: [
        {
          name: 'id',
          type: 'string',
          required: true,
          isPrimaryKey: true,
          isForeignKey: false,
        },
        {
          name: 'user_id',
          type: 'string',
          required: true,
          isPrimaryKey: false,
          isForeignKey: true,
        },
        {
          name: 'business_name',
          type: 'string', 
          required: true,
          isPrimaryKey: false,
          isForeignKey: false,
        }
      ],
      relationships: [],
      constraints: [],
    });
    
    // Create and initialize context manager
    contextManager = new ContextManager(knowledgeRepository);
    await contextManager.initialize();
    
    // Create data interface (persistence layer)
    dataInterface = new DataInterface({
      dbClient: mockDBClient,
      contextManager,
      debug: false,
    });
    
    // Create database agent proxy (guard layer)
    databaseProxy = new DatabaseAgentProxy({
      dataInterface,
      contextManager,
      debug: false,
    });
    await databaseProxy.initialize();
    
    // Create bidding agents (domain layer) for both user types
    contractorBiddingAgent = new BiddingAgent(
      'auth-contractor-1',
      databaseProxy,
      'contractor'
    );
    
    homeownerBiddingAgent = new BiddingAgent(
      'auth-homeowner-1',
      databaseProxy,
      'homeowner'
    );
  });
  
  beforeEach(() => {
    // Clear executed queries before each test
    mockDBClient.clearExecutedQueries();
  });
  
  describe('Layered Architecture Integration', () => {
    it('enforces auth ID pattern when contractor creates a bid', async () => {
      // Test creating a bid as a contractor
      await contractorBiddingAgent.createBid({
        project_id: 'project-1',
        amount: 12500,
        description: 'Kitchen renovation including cabinets and countertops',
        timeline_days: 25,
        services: ['cabinets', 'countertops', 'plumbing'],
        materials_included: true
      });
      
      // Check that the persistence layer was called with auth ID
      const insertQuery = mockDBClient.executedQueries.find(q => q.type === 'insert' && q.table === 'bids');
      expect(insertQuery).toBeDefined();
      
      // The guard layer should have enforced the auth ID pattern
      // Check that select query to get contractor profile was executed
      const selectQuery = mockDBClient.executedQueries.find(q => q.type === 'select' && q.table === 'contractors');
      expect(selectQuery).toBeDefined();
      expect(selectQuery.query.filters.user_id).toBe('auth-contractor-1');
    });
    
    it('enforces domain boundaries when accessing project data', async () => {
      // Homeowners can access project data directly
      await homeownerBiddingAgent.getBidsForProject('project-1');
      
      // Check that the right queries were executed with proper auth checks
      const projectQuery = mockDBClient.executedQueries.find(
        q => q.type === 'select' && q.table === 'projects'
      );
      expect(projectQuery).toBeDefined();
      expect(projectQuery.query.filters).toEqual({ id: 'project-1' });
      
      const bidsQuery = mockDBClient.executedQueries.find(
        q => q.type === 'select' && q.table === 'bids' && q.query.joins?.[0]?.table === 'contractors'
      );
      expect(bidsQuery).toBeDefined();
      expect(bidsQuery.query.filters).toEqual({ project_id: 'project-1' });
    });
    
    it('prevents unauthorized actors from accepting bids', async () => {
      // Create a new bid
      const bidData = {
        contractor_id: 'contractor-1',
        project_id: 'project-1',
        amount: 12000,
        description: 'Kitchen renovation',
        timeline_days: 20,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const insertResult = await mockDBClient.insert('bids', { data: bidData });
      const bidId = insertResult.data[0].id;
      
      // Trying to accept a bid as a contractor should fail
      await expect(contractorBiddingAgent.acceptBid(bidId)).rejects.toThrow('Only homeowners can accept bids');
      
      // Homeowner can accept the bid
      mockDBClient.clearExecutedQueries();
      await homeownerBiddingAgent.acceptBid(bidId);
      
      // Check that the right queries were executed
      const updateQuery = mockDBClient.executedQueries.find(
        q => q.type === 'update' && q.table === 'bids' && q.query.data.status === 'accepted'
      );
      expect(updateQuery).toBeDefined();
      
      // Verify a project was created
      const createProjectQuery = mockDBClient.executedQueries.find(
        q => q.type === 'insert' && q.table === 'projects'
      );
      expect(createProjectQuery).toBeDefined();
      expect(createProjectQuery.query.data.bid_id).toBe(bidId);
      expect(createProjectQuery.query.data.homeowner_id).toBe('auth-homeowner-1');
    });
  });
});
