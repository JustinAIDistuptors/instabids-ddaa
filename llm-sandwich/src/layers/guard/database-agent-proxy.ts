/**
 * DatabaseAgentProxy - The LLM Guard Layer
 * 
 * This is the core component of the LLM Sandwich Architecture that acts as
 * a guardian of architectural patterns and database access rules. It intercepts
 * database operations, validates them against known patterns, and ensures
 * all queries follow the established rules, especially the critical ID relationship
 * pattern.
 */

import { llmClient, LLMCompletionRequest } from '../../integration/llm-client.js';
import { contextManager, ContextType } from '../../integration/context-manager.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

// Validation status for operations
export enum ValidationStatus {
  VALID = 'valid',
  INVALID = 'invalid',
  NEEDS_MODIFICATION = 'needs_modification'
}

// Query intent types supported
export enum QueryIntentType {
  SELECT = 'select',
  INSERT = 'insert',
  UPDATE = 'update',
  DELETE = 'delete',
  JOIN = 'join',
  TRANSACTION = 'transaction'
}

// Intent for database operations
export interface QueryIntent {
  type: QueryIntentType;
  description: string;
  tables: string[];
  authId?: string; // Current user's auth ID
  entityType?: string; // Type of entity (e.g., 'homeowner', 'contractor')
  filters?: Record<string, any>;
  data?: Record<string, any>;
  options?: {
    includeDeleted?: boolean;
    limit?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
  };
}

// Result of database operations
export interface QueryResult<T = any> {
  data: T | null;
  error: string | null;
  explanation?: string; // Explanation of the operation
  modified?: boolean; // Whether the query was modified
}

/**
 * The DatabaseAgentProxy enforces architectural patterns and provides
 * intelligent query construction and validation
 */
export class DatabaseAgentProxy {
  private supabase: SupabaseClient;
  private enablePatternEnforcement: boolean;
  private enablePatternLearning: boolean;
  private idRelationshipEnforce: boolean;
  private patterns: Record<string, any> = {}; // Cached patterns

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration. Check SUPABASE_URL and SUPABASE_KEY in .env');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    // Feature flags from environment
    this.enablePatternEnforcement = process.env.ENABLE_PATTERN_ENFORCEMENT !== 'false';
    this.enablePatternLearning = process.env.ENABLE_PATTERN_LEARNING === 'true';
    this.idRelationshipEnforce = process.env.ID_RELATIONSHIP_ENFORCE !== 'false';
  }

  /**
   * Execute a database operation based on intent
   */
  async execute<T = any>(intent: QueryIntent): Promise<QueryResult<T>> {
    try {
      // Validate the intent if pattern enforcement is enabled
      if (this.enablePatternEnforcement) {
        const validationResult = await this.validateIntent(intent);
        
        if (validationResult.status === ValidationStatus.INVALID) {
          return {
            data: null,
            error: `Invalid operation: ${validationResult.reason}`,
            explanation: validationResult.explanation
          };
        }
        
        // If modification needed, update the intent
        if (validationResult.status === ValidationStatus.NEEDS_MODIFICATION && validationResult.modifiedIntent) {
          intent = validationResult.modifiedIntent;
        }
      }
      
      // Execute the appropriate query based on intent type
      switch (intent.type) {
        case QueryIntentType.SELECT:
          return await this.executeSelect<T>(intent);
        case QueryIntentType.INSERT:
          return await this.executeInsert<T>(intent);
        case QueryIntentType.UPDATE:
          return await this.executeUpdate<T>(intent);
        case QueryIntentType.DELETE:
          return await this.executeDelete<T>(intent);
        case QueryIntentType.JOIN:
          return await this.executeJoin<T>(intent);
        case QueryIntentType.TRANSACTION:
          return await this.executeTransaction<T>(intent);
        default:
          return {
            data: null,
            error: `Unsupported query intent type: ${intent.type}`,
            explanation: 'This operation type is not supported by the DatabaseAgentProxy.'
          };
      }
    } catch (error: any) {
      return {
        data: null,
        error: error.message || String(error),
        explanation: 'An unexpected error occurred while processing the database operation.'
      };
    }
  }

  /**
   * Validate an operation intent against architectural patterns
   */
  private async validateIntent(intent: QueryIntent): Promise<{
    status: ValidationStatus;
    reason?: string;
    explanation?: string;
    modifiedIntent?: QueryIntent;
  }> {
    // Skip validation if no auth ID provided and tables don't require auth
    if (!intent.authId && !this.requiresAuthValidation(intent.tables)) {
      return { status: ValidationStatus.VALID };
    }
    
    // For operations that involve user data, enforce ID relationship pattern
    if (intent.authId && this.idRelationshipEnforce) {
      return await this.validateWithLLM(intent);
    }
    
    // Default to valid for simple operations
    return { status: ValidationStatus.VALID };
  }

  /**
   * Check if any tables in the operation require auth validation
   */
  private requiresAuthValidation(tables: string[]): boolean {
    // Tables that require auth validation
    const authTables = [
      'profiles', 'users', 'projects', 'bids', 
      'contractors', 'homeowners', 'messages', 'payments'
    ];
    
    return tables.some(table => authTables.includes(table.toLowerCase()));
  }

  /**
   * Validate intent using LLM
   */
  private async validateWithLLM(intent: QueryIntent): Promise<{
    status: ValidationStatus;
    reason?: string;
    explanation?: string;
    modifiedIntent?: QueryIntent;
  }> {
    // Prepare context for LLM
    const contextTypes = [
      ContextType.ID_RELATIONSHIP,
      ContextType.SCHEMA,
      ContextType.PATTERNS
    ];
    
    const context = await contextManager.generateContext(contextTypes, {
      entityType: intent.entityType,
      tableOrDomain: intent.tables[0],
      maxLength: 2000 // Limit context size
    });
    
    // Construct the prompt for LLM
    const systemPrompt = `
    You are DatabaseAgentProxy, a guardian of database integrity and architectural patterns.
    Your job is to validate database operations against architectural patterns, especially the critical ID relationship pattern.
    
    When presented with a query intent, you must:
    1. Analyze the intent against known patterns.
    2. Verify that IDs are properly validated, especially that auth.id maps to profile.id.
    3. Determine if the operation is VALID, INVALID, or NEEDS_MODIFICATION.
    4. If NEEDS_MODIFICATION, provide a corrected intent.
    5. Always explain your reasoning clearly.
    
    CONTEXT:
    ${context}
    `;
    
    const userPrompt = `
    Please validate this database operation intent against the patterns, especially the ID relationship pattern:
    
    \`\`\`json
    ${JSON.stringify(intent, null, 2)}
    \`\`\`
    
    Your response should be a JSON object with these fields:
    - status: "VALID", "INVALID", or "NEEDS_MODIFICATION"
    - reason: (only if INVALID or NEEDS_MODIFICATION) explanation of what's wrong
    - explanation: detailed reasoning behind your decision
    - modifiedIntent: (only if NEEDS_MODIFICATION) the corrected intent
    
    Do not include any other text in your response, just the JSON.
    `;
    
    const request: LLMCompletionRequest = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    };
    
    // Get validation from LLM
    const llmResponse = await llmClient.complete(request, {
      temperature: 0.1, // Low temperature for more deterministic response
      maxTokens: 1000
    });
    
    try {
      // Parse LLM response
      const result = JSON.parse(llmResponse.content);
      
      // Convert status string to enum
      let status: ValidationStatus;
      switch (result.status) {
        case 'VALID':
          status = ValidationStatus.VALID;
          break;
        case 'INVALID':
          status = ValidationStatus.INVALID;
          break;
        case 'NEEDS_MODIFICATION':
          status = ValidationStatus.NEEDS_MODIFICATION;
          break;
        default:
          status = ValidationStatus.INVALID;
      }
      
      return {
        status,
        reason: result.reason,
        explanation: result.explanation,
        modifiedIntent: result.modifiedIntent
      };
    } catch (error) {
      console.error('Failed to parse LLM validation response:', error);
      // Default to invalid if we can't parse the response
      return {
        status: ValidationStatus.INVALID,
        reason: 'Failed to validate the operation',
        explanation: 'The system encountered an error while validating the database operation.'
      };
    }
  }

  /**
   * Execute a SELECT query
   */
  private async executeSelect<T>(intent: QueryIntent): Promise<QueryResult<T>> {
    const { tables, filters, options } = intent;
    const mainTable = tables[0];
    let query = this.supabase.from(mainTable).select('*');
    
    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          query = query.eq(key, value);
        }
      });
    }
    
    // Apply options
    if (options) {
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.orderBy) {
        const direction = options.orderDirection || 'asc';
        query = query.order(options.orderBy, { ascending: direction === 'asc' });
      }
    }
    
    // Execute query
    const { data, error } = await query;
    
    // Format result
    return {
      data: data as T,
      error: error ? error.message : null,
      explanation: `Selected ${data?.length || 0} records from ${mainTable}`
    };
  }

  /**
   * Execute an INSERT query
   */
  private async executeInsert<T>(intent: QueryIntent): Promise<QueryResult<T>> {
    const { tables, data } = intent;
    const table = tables[0];
    
    if (!data) {
      return {
        data: null,
        error: 'No data provided for insert operation',
        explanation: 'An insert operation requires data to be specified'
      };
    }
    
    // Execute query
    const result = await this.supabase.from(table).insert(data).select();
    
    // Format result
    return {
      data: result.data as T,
      error: result.error ? result.error.message : null,
      explanation: `Inserted data into ${table}`
    };
  }

  /**
   * Execute an UPDATE query
   */
  private async executeUpdate<T>(intent: QueryIntent): Promise<QueryResult<T>> {
    const { tables, filters, data } = intent;
    const table = tables[0];
    
    if (!data) {
      return {
        data: null,
        error: 'No data provided for update operation',
        explanation: 'An update operation requires data to be specified'
      };
    }
    
    if (!filters || Object.keys(filters).length === 0) {
      return {
        data: null,
        error: 'No filters provided for update operation',
        explanation: 'An update operation requires filters to specify which records to update'
      };
    }
    
    let query = this.supabase.from(table).update(data);
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        query = query.eq(key, value);
      }
    });
    
    // Execute query
    const result = await query.select();
    
    // Format result
    return {
      data: result.data as T,
      error: result.error ? result.error.message : null,
      explanation: `Updated data in ${table}`
    };
  }

  /**
   * Execute a DELETE query
   */
  private async executeDelete<T>(intent: QueryIntent): Promise<QueryResult<T>> {
    const { tables, filters } = intent;
    const table = tables[0];
    
    if (!filters || Object.keys(filters).length === 0) {
      return {
        data: null,
        error: 'No filters provided for delete operation',
        explanation: 'A delete operation requires filters to specify which records to delete'
      };
    }
    
    let query = this.supabase.from(table).delete();
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        query = query.eq(key, value);
      }
    });
    
    // Execute query
    const result = await query.select();
    
    // Format result
    return {
      data: result.data as T,
      error: result.error ? result.error.message : null,
      explanation: `Deleted data from ${table}`
    };
  }

  /**
   * Execute a JOIN query (multiple tables)
   */
  private async executeJoin<T>(intent: QueryIntent): Promise<QueryResult<T>> {
    const { tables, filters, options } = intent;
    
    if (tables.length < 2) {
      return {
        data: null,
        error: 'JOIN operation requires at least two tables',
        explanation: 'A join operation needs multiple tables to be specified'
      };
    }
    
    const mainTable = tables[0];
    const joinTables = tables.slice(1);
    
    // Build select string with joins
    const selectString = joinTables.map(table => `${table}(*)`).join(',');
    let query = this.supabase.from(mainTable).select(`*, ${selectString}`);
    
    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          query = query.eq(key, value);
        }
      });
    }
    
    // Apply options
    if (options) {
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.orderBy) {
        const direction = options.orderDirection || 'asc';
        query = query.order(options.orderBy, { ascending: direction === 'asc' });
      }
    }
    
    // Execute query
    const { data, error } = await query;
    
    // Format result
    return {
      data: data as T,
      error: error ? error.message : null,
      explanation: `Joined ${mainTable} with ${joinTables.join(', ')}`
    };
  }

  /**
   * Execute a transaction (multiple operations)
   */
  private async executeTransaction<T>(intent: QueryIntent): Promise<QueryResult<T>> {
    // This is a simplified implementation - a real one would parse
    // the transaction steps from the intent and execute them in order
    return {
      data: null,
      error: 'Transaction execution not fully implemented',
      explanation: 'Transaction support is not yet fully implemented'
    };
  }

  /**
   * Get the profile for a user based on auth ID
   * This demonstrates the ID relationship pattern implementation
   */
  async getProfileByAuthId<T>(authId: string, tableName = 'profiles'): Promise<QueryResult<T>> {
    if (!authId) {
      return {
        data: null,
        error: 'Auth ID is required',
        explanation: 'Cannot fetch profile without authentication ID'
      };
    }
    
    const { data, error } = await this.supabase
      .from(tableName)
      .select('*')
      .eq('auth_id', authId)
      .single();
    
    return {
      data: data as T,
      error: error ? error.message : null,
      explanation: `Retrieved profile for user with auth ID ${authId}`
    };
  }
}

/**
 * Singleton instance of the DatabaseAgentProxy
 */
export const databaseAgentProxy = new DatabaseAgentProxy();
