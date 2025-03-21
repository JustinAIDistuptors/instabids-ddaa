/**
 * LLM Persistence Layer - Data Interface
 * 
 * This module implements the bottom layer of the LLM Sandwich Architecture,
 * providing an intelligent interface to the database that understands schemas,
 * relationships, and optimizes queries based on the application's needs.
 */

import { createClient, SupabaseClient, PostgrestFilterBuilder } from '@supabase/supabase-js';
import { llmClient, LLMCompletionRequest } from '../../integration/llm-client.js';
import { contextManager, ContextType } from '../../integration/context-manager.js';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Query builder options
 */
export interface QueryOptions {
  select?: string[];
  filters?: Record<string, any>;
  joins?: string[];
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Database operation types
 */
export enum DatabaseOperation {
  SELECT = 'select',
  INSERT = 'insert',
  UPDATE = 'update',
  DELETE = 'delete',
  UPSERT = 'upsert'
}

/**
 * Database operation result
 */
export interface OperationResult<T = any> {
  data: T | null;
  error: Error | null;
  status: number;
  count?: number;
  query?: string; // The generated query
}

/**
 * Schema information
 */
export interface SchemaInfo {
  tables: string[];
  columns: Record<string, string[]>;
  relationships: Array<{
    table: string;
    column: string;
    referencedTable: string;
    referencedColumn: string;
  }>;
}

/**
 * Data Interface for the LLM Persistence Layer
 */
export class DataInterface {
  private supabase: SupabaseClient;
  private schemaCache: SchemaInfo | null = null;
  
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration. Check SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }
  
  /**
   * Initialize the schema cache
   */
  async initializeSchema(): Promise<SchemaInfo> {
    if (this.schemaCache) {
      return this.schemaCache;
    }
    
    // In a real implementation, we would introspect the actual database
    // For now, we'll use a cached schema from knowledge base
    const schemaContext = await contextManager.getSchemaContext();
    
    // Use LLM to extract schema information from context
    const extractRequest: LLMCompletionRequest = {
      messages: [
        {
          role: 'system',
          content: `
          You are a database schema extraction agent. Your job is to extract structured
          schema information from a database description. Please output a valid JSON
          object containing the schema information.
          `
        },
        {
          role: 'user',
          content: `
          Please extract the schema information from this database description:
          
          ${schemaContext}
          
          Return a JSON object with:
          1. "tables": array of table names
          2. "columns": object with table names as keys and arrays of column names as values
          3. "relationships": array of objects describing foreign key relationships
            - Each relationship object should have: table, column, referencedTable, referencedColumn
          
          If you can't extract this information, provide a minimal placeholder schema.
          `
        }
      ]
    };
    
    try {
      const response = await llmClient.complete(extractRequest, {
        temperature: 0.1,
        maxTokens: 2000
      });
      
      // Parse the schema info from the response
      const schemaInfo = JSON.parse(response.content);
      this.schemaCache = schemaInfo;
      return schemaInfo;
    } catch (error) {
      console.error('Failed to extract schema:', error);
      
      // Fallback to minimal schema
      const fallbackSchema: SchemaInfo = {
        tables: ['profiles', 'projects', 'bids', 'messages'],
        columns: {
          profiles: ['id', 'auth_id', 'user_type', 'name', 'email'],
          projects: ['id', 'title', 'description', 'homeowner_id', 'status'],
          bids: ['id', 'project_id', 'contractor_id', 'amount', 'status'],
          messages: ['id', 'sender_id', 'receiver_id', 'content', 'read']
        },
        relationships: [
          {
            table: 'projects',
            column: 'homeowner_id',
            referencedTable: 'profiles',
            referencedColumn: 'id'
          },
          {
            table: 'bids',
            column: 'project_id',
            referencedTable: 'projects',
            referencedColumn: 'id'
          },
          {
            table: 'bids',
            column: 'contractor_id',
            referencedTable: 'profiles',
            referencedColumn: 'id'
          }
        ]
      };
      
      this.schemaCache = fallbackSchema;
      return fallbackSchema;
    }
  }
  
  /**
   * Build a database query with intelligent optimization
   */
  async buildQuery<T>(
    table: string,
    operation: DatabaseOperation,
    options: QueryOptions = {},
    data?: Record<string, any>
  ): Promise<PostgrestFilterBuilder<any, any, any>> {
    await this.initializeSchema();
    
    const { select, filters, joins, orderBy, orderDirection, limit, offset } = options;
    
    let query: PostgrestFilterBuilder<any, any, any>;
    
    switch (operation) {
      case DatabaseOperation.SELECT:
        query = this.supabase
          .from(table)
          .select(select?.join(', ') || '*');
        
        // Apply joins if needed
        if (joins && joins.length > 0) {
          const joinString = joins.map(join => `${join}(*)`).join(',');
          query = query.select(`*, ${joinString}`);
        }
        break;
        
      case DatabaseOperation.INSERT:
        if (!data) {
          throw new Error('Data is required for insert operations');
        }
        query = this.supabase
          .from(table)
          .insert(data)
          .select();
        break;
        
      case DatabaseOperation.UPDATE:
        if (!data) {
          throw new Error('Data is required for update operations');
        }
        if (!filters || Object.keys(filters).length === 0) {
          throw new Error('Filters are required for update operations');
        }
        query = this.supabase
          .from(table)
          .update(data)
          .select();
        break;
        
      case DatabaseOperation.DELETE:
        if (!filters || Object.keys(filters).length === 0) {
          throw new Error('Filters are required for delete operations');
        }
        query = this.supabase
          .from(table)
          .delete()
          .select();
        break;
        
      case DatabaseOperation.UPSERT:
        if (!data) {
          throw new Error('Data is required for upsert operations');
        }
        query = this.supabase
          .from(table)
          .upsert(data)
          .select();
        break;
        
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
    
    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          query = query.eq(key, value);
        }
      });
    }
    
    // Apply order by
    if (orderBy) {
      query = query.order(orderBy, { ascending: orderDirection !== 'desc' });
    }
    
    // Apply limit
    if (limit !== undefined) {
      query = query.limit(limit);
    }
    
    // Apply offset
    if (offset !== undefined) {
      query = query.offset(offset);
    }
    
    return query;
  }
  
  /**
   * Execute a database operation
   */
  async executeOperation<T = any>(
    table: string,
    operation: DatabaseOperation,
    options: QueryOptions = {},
    data?: Record<string, any>
  ): Promise<OperationResult<T>> {
    try {
      const query = await this.buildQuery<T>(table, operation, options, data);
      const { data: result, error, status, count } = await query;
      
      return {
        data: result as T,
        error: error,
        status: status || 200,
        count: count || (Array.isArray(result) ? result.length : undefined)
      };
    } catch (error: any) {
      return {
        data: null,
        error: error,
        status: 500
      };
    }
  }
  
  /**
   * Use LLM to generate an optimized query based on natural language intent
   */
  async generateQueryFromIntent<T>(
    intent: string,
    entityType?: string,
    authId?: string
  ): Promise<{
    table: string;
    operation: DatabaseOperation;
    options: QueryOptions;
    data?: Record<string, any>;
  }> {
    // Initialize schema info
    await this.initializeSchema();
    
    // Prepare context with schema information
    const schemaContext = await contextManager.getSchemaContext();
    const idContext = await contextManager.getIdRelationshipContext(entityType);
    
    // Use LLM to generate query parameters
    const queryRequest: LLMCompletionRequest = {
      messages: [
        {
          role: 'system',
          content: `
          You are a database query generation assistant. Your job is to convert natural
          language descriptions of database operations into structured query parameters.
          
          Schema Context:
          ${schemaContext}
          
          ID Relationship Pattern:
          ${idContext}
          
          Always ensure that ID relationship patterns are enforced in your queries.
          For example, when querying user data, ensure auth_id is properly checked.
          
          Return a JSON object with:
          - table: The main table to query
          - operation: One of "select", "insert", "update", "delete", "upsert"
          - options: Query options (select, filters, joins, orderBy, orderDirection, limit, offset)
          - data: The data to insert/update/upsert (if applicable)
          `
        },
        {
          role: 'user',
          content: `
          Generate a database query for this intent: "${intent}"
          
          Additional context:
          - Entity type: ${entityType || 'unknown'}
          - Auth ID: ${authId || 'none provided'}
          
          Return only the JSON query specification.
          `
        }
      ]
    };
    
    const response = await llmClient.complete(queryRequest, {
      temperature: 0.1,
      maxTokens: 1000
    });
    
    try {
      // Parse the query parameters from the response
      return JSON.parse(response.content);
    } catch (error) {
      console.error('Failed to parse generated query:', error);
      throw new Error('Failed to generate query from intent');
    }
  }
  
  /**
   * Get schema verification for a data object
   */
  async verifyData(
    table: string,
    data: Record<string, any>
  ): Promise<{
    valid: boolean;
    errors: string[];
    correctedData?: Record<string, any>;
  }> {
    await this.initializeSchema();
    
    if (!this.schemaCache || !this.schemaCache.columns[table]) {
      return {
        valid: false,
        errors: [`Unknown table: ${table}`]
      };
    }
    
    const expectedColumns = this.schemaCache.columns[table];
    const schemaContext = await contextManager.getSchemaContext(table);
    
    // Use LLM to verify data against schema
    const verifyRequest: LLMCompletionRequest = {
      messages: [
        {
          role: 'system',
          content: `
          You are a data validation assistant. Your job is to verify that data objects
          match the expected schema for a database table, and suggest corrections when needed.
          
          Table Schema:
          ${schemaContext}
          `
        },
        {
          role: 'user',
          content: `
          Verify this data object for the "${table}" table:
          
          ${JSON.stringify(data, null, 2)}
          
          Return a JSON object with:
          - valid: boolean indicating if the data is valid
          - errors: array of error messages (empty if valid)
          - correctedData: corrected version of the data (if corrections were needed)
          
          Focus on:
          1. Required fields being present
          2. Data types matching the schema
          3. Foreign key constraints being respected
          4. Any other schema violations
          
          Return only the JSON validation result.
          `
        }
      ]
    };
    
    const response = await llmClient.complete(verifyRequest, {
      temperature: 0.1,
      maxTokens: 1000
    });
    
    try {
      // Parse the validation result from the response
      return JSON.parse(response.content);
    } catch (error) {
      console.error('Failed to parse validation result:', error);
      return {
        valid: false,
        errors: ['Failed to verify data']
      };
    }
  }
}

/**
 * Singleton instance of the data interface
 */
export const dataInterface = new DataInterface();
