/**
 * @file Data Interface
 * 
 * This file provides the Persistence Layer for the LLM Sandwich Architecture.
 * It forms the "bottom bread" of the sandwich, handling database operations
 * with schema awareness and validation.
 */

import { Schema, SchemaType, SchemaField } from '../../knowledge-base/types.js';
import { ContextManager } from '../../integration/context-manager.js';
import { LLMClient, CompletionParams } from '../../integration/llm-client.js';

/**
 * Database operation types
 */
export enum DatabaseOperation {
  SELECT = 'select',
  INSERT = 'insert',
  UPDATE = 'update',
  DELETE = 'delete',
  UPSERT = 'upsert',
}

/**
 * Database query intent type
 */
export enum QueryIntentType {
  SELECT = 'select',
  INSERT = 'insert',
  UPDATE = 'update',
  DELETE = 'delete',
  UPSERT = 'upsert',
  JOIN = 'join',
  AGGREGATE = 'aggregate',
  SEARCH = 'search',
}

/**
 * Database filter operation
 */
export enum FilterOperation {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_THAN_OR_EQUALS = 'greater_than_or_equals',
  LESS_THAN_OR_EQUALS = 'less_than_or_equals',
  IN = 'in',
  NOT_IN = 'not_in',
  LIKE = 'like',
  ILIKE = 'ilike',
  CONTAINS = 'contains',
  CONTAINED_BY = 'contained_by',
  OVERLAPS = 'overlaps',
  IS_NULL = 'is_null',
  IS_NOT_NULL = 'is_not_null',
}

/**
 * Join type for queries
 */
export enum JoinType {
  INNER = 'inner',
  LEFT = 'left',
  RIGHT = 'right',
  FULL = 'full',
}

/**
 * Order direction for queries
 */
export enum OrderDirection {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * Common interface for all query intents
 */
export interface QueryIntent {
  /** Type of query */
  type: QueryIntentType;
  /** Description of what the query is trying to do */
  description: string;
  /** Tables involved in the query */
  tables: string[];
  /** User auth ID (for security enforcement) */
  authId?: string;
  /** User entity type (e.g., 'homeowner', 'contractor') */
  entityType?: string;
}

/**
 * Basic filter for queries
 */
export interface QueryFilter {
  /** Field to filter on */
  field: string;
  /** Operation to perform */
  operation: FilterOperation;
  /** Value to compare against */
  value: any;
}

/**
 * Join condition for queries
 */
export interface JoinCondition {
  /** Table to join with */
  table: string;
  /** Type of join */
  type: JoinType;
  /** Join conditions (field mappings) */
  on: { [sourceField: string]: string };
}

/**
 * SELECT query intent
 */
export interface SelectQueryIntent extends QueryIntent {
  type: QueryIntentType.SELECT;
  /** Fields to select */
  fields?: string[];
  /** Filters to apply */
  filters?: { [field: string]: any } | QueryFilter[];
  /** Joins to perform */
  joins?: JoinCondition[];
  /** Field to order by */
  orderBy?: string;
  /** Direction to order */
  orderDirection?: OrderDirection;
  /** Maximum number of rows */
  limit?: number;
  /** Number of rows to skip */
  offset?: number;
}

/**
 * INSERT query intent
 */
export interface InsertQueryIntent extends QueryIntent {
  type: QueryIntentType.INSERT;
  /** Data to insert */
  data: { [field: string]: any } | { [field: string]: any }[];
  /** Whether to return the inserted data */
  returning?: boolean;
}

/**
 * UPDATE query intent
 */
export interface UpdateQueryIntent extends QueryIntent {
  type: QueryIntentType.UPDATE;
  /** Filters to identify rows to update */
  filters: { [field: string]: any } | QueryFilter[];
  /** Data to update */
  data: { [field: string]: any };
  /** Whether to return the updated data */
  returning?: boolean;
}

/**
 * DELETE query intent
 */
export interface DeleteQueryIntent extends QueryIntent {
  type: QueryIntentType.DELETE;
  /** Filters to identify rows to delete */
  filters: { [field: string]: any } | QueryFilter[];
  /** Whether to return the deleted data */
  returning?: boolean;
}

/**
 * Query execution result
 */
export interface QueryResult {
  /** Success status */
  success: boolean;
  /** Error message if any */
  error?: string;
  /** Result data if any */
  data?: any[];
  /** Number of rows affected */
  rowCount?: number;
  /** Generated SQL query */
  sql?: string;
  /** Pattern violations if any */
  patternViolations?: string[];
}

/**
 * DB client interface
 * This is an abstraction over the actual database client (e.g., Postgres, Supabase)
 */
export interface DBClient {
  /** Execute a raw SQL query */
  query(sql: string, params?: any[]): Promise<QueryResult>;
  /** Get schema information */
  getTableSchema(tableName: string): Promise<Schema | null>;
  /** Execute a SELECT query */
  select(table: string, query?: Partial<SelectQueryIntent>): Promise<QueryResult>;
  /** Execute an INSERT query */
  insert(table: string, query: Partial<InsertQueryIntent>): Promise<QueryResult>;
  /** Execute an UPDATE query */
  update(table: string, query: Partial<UpdateQueryIntent>): Promise<QueryResult>;
  /** Execute a DELETE query */
  delete(table: string, query: Partial<DeleteQueryIntent>): Promise<QueryResult>;
}

/**
 * Data Interface options
 */
export interface DataInterfaceOptions {
  /** DB client to use */
  dbClient: DBClient;
  /** Context manager for schema awareness */
  contextManager: ContextManager;
  /** LLM client for query generation */
  llmClient?: LLMClient;
  /** Debug mode */
  debug?: boolean;
  /** Validate queries against patterns */
  validatePatterns?: boolean;
  /** Maximum query size to execute */
  maxQuerySize?: number;
}

/**
 * Data Interface for the LLM Sandwich Architecture
 */
export class DataInterface {
  private dbClient: DBClient;
  private contextManager: ContextManager;
  private llmClient?: LLMClient;
  private debug: boolean;
  private validatePatterns: boolean;
  private maxQuerySize: number;
  private schemaCache: Map<string, Schema> = new Map();
  
  /**
   * Create a new Data Interface
   */
  constructor(options: DataInterfaceOptions) {
    this.dbClient = options.dbClient;
    this.contextManager = options.contextManager;
    this.llmClient = options.llmClient;
    this.debug = options.debug || false;
    this.validatePatterns = options.validatePatterns || true;
    this.maxQuerySize = options.maxQuerySize || 100000;
  }
  
  /**
   * Execute a database operation
   */
  public async executeOperation(
    table: string,
    operation: DatabaseOperation,
    params: any = {}
  ): Promise<QueryResult> {
    try {
      // Get schema for validation
      const schema = await this.getTableSchema(table);
      
      // Validate parameters against schema
      if (schema) {
        this.validateAgainstSchema(schema, operation, params);
      } else if (this.debug) {
        console.warn(`No schema found for table ${table}, skipping validation`);
      }
      
      // Execute the operation
      let result: QueryResult;
      
      switch (operation) {
        case DatabaseOperation.SELECT:
          result = await this.dbClient.select(table, params as Partial<SelectQueryIntent>);
          break;
        case DatabaseOperation.INSERT:
          result = await this.dbClient.insert(table, params as Partial<InsertQueryIntent>);
          break;
        case DatabaseOperation.UPDATE:
          result = await this.dbClient.update(table, params as Partial<UpdateQueryIntent>);
          break;
        case DatabaseOperation.DELETE:
          result = await this.dbClient.delete(table, params as Partial<DeleteQueryIntent>);
          break;
        case DatabaseOperation.UPSERT:
          // Upsert is a special case of insert
          const upsertParams = { ...params, onConflict: true };
          result = await this.dbClient.insert(table, upsertParams as Partial<InsertQueryIntent>);
          break;
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
      
      if (this.debug) {
        console.log(`Executed ${operation} on ${table}`);
        console.log(`SQL: ${result.sql}`);
        console.log(`Result: ${JSON.stringify(result.data || result, null, 2)}`);
      }
      
      return result;
    } catch (error: any) {
      const errorMessage = `Error executing ${operation} on ${table}: ${error.message}`;
      
      if (this.debug) {
        console.error(errorMessage);
        console.error(error.stack);
      }
      
      return {
        success: false,
        error: errorMessage,
        data: [],
        rowCount: 0,
      };
    }
  }
  
  /**
   * Get table schema
   */
  private async getTableSchema(table: string): Promise<Schema | null> {
    // First check cache
    if (this.schemaCache.has(table)) {
      return this.schemaCache.get(table)!;
    }
    
    // Try to get from context manager
    const schemas = await this.contextManager.getRelevantContext({
      includeSchemas: true,
      includePatterns: false,
      includeSecurityRules: false,
      tableNames: [table],
    });
    
    // Find the schema in the contexts
    for (const context of schemas) {
      if (context.source === 'schemas' && context.name.includes(table)) {
        try {
          const schema = JSON.parse(context.content) as Schema;
          this.schemaCache.set(table, schema);
          return schema;
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }
    
    // If not found, try to get from DB client
    try {
      const schema = await this.dbClient.getTableSchema(table);
      if (schema) {
        this.schemaCache.set(table, schema);
        return schema;
      }
    } catch (e) {
      // Ignore errors
    }
    
    return null;
  }
  
  /**
   * Validate parameters against schema
   */
  private validateAgainstSchema(
    schema: Schema,
    operation: DatabaseOperation,
    params: any
  ): void {
    // Skip validation for SELECT operations
    if (operation === DatabaseOperation.SELECT) {
      return;
    }
    
    const schemaFields = new Map<string, SchemaField>();
    schema.fields.forEach(field => {
      schemaFields.set(field.name, field);
    });
    
    // Get data to validate based on operation
    let data: any;
    
    switch (operation) {
      case DatabaseOperation.INSERT:
        data = params.data;
        break;
      case DatabaseOperation.UPDATE:
        data = params.data;
        break;
      default:
        return; // No data to validate
    }
    
    // Handle array of data objects
    if (Array.isArray(data)) {
      data.forEach((item, index) => {
        this.validateDataObject(item, schemaFields, `data[${index}]`);
      });
    } else if (typeof data === 'object') {
      this.validateDataObject(data, schemaFields, 'data');
    }
  }
  
  /**
   * Validate a data object against schema fields
   */
  private validateDataObject(
    data: any,
    schemaFields: Map<string, SchemaField>,
    path: string
  ): void {
    // Check for required fields
    schemaFields.forEach((field, fieldName) => {
      if (field.required && !(fieldName in data) && !field.defaultValue) {
        throw new Error(`Required field ${fieldName} is missing in ${path}`);
      }
    });
    
    // Check data types
    Object.keys(data).forEach(fieldName => {
      const field = schemaFields.get(fieldName);
      if (!field) {
        throw new Error(`Unknown field ${fieldName} in ${path}`);
      }
      
      const value = data[fieldName];
      
      // Skip null values
      if (value === null) {
        return;
      }
      
      // Check data type
      switch (field.type) {
        case 'string':
          if (typeof value !== 'string') {
            throw new Error(`Field ${fieldName} should be a string in ${path}`);
          }
          break;
        case 'number':
          if (typeof value !== 'number') {
            throw new Error(`Field ${fieldName} should be a number in ${path}`);
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            throw new Error(`Field ${fieldName} should be a boolean in ${path}`);
          }
          break;
        case 'Date':
          if (!(value instanceof Date) && !isValidDateString(value)) {
            throw new Error(`Field ${fieldName} should be a valid date in ${path}`);
          }
          break;
        case 'object':
          if (typeof value !== 'object' || Array.isArray(value)) {
            throw new Error(`Field ${fieldName} should be an object in ${path}`);
          }
          break;
        case 'array':
        case 'Array<any>':
          if (!Array.isArray(value)) {
            throw new Error(`Field ${fieldName} should be an array in ${path}`);
          }
          break;
      }
    });
  }
  
  /**
   * Generate a query from natural language intent
   */
  public async generateQueryFromIntent(
    intent: string,
    entityType: string,
    authId?: string
  ): Promise<any> {
    if (!this.llmClient) {
      throw new Error('LLM client is required for query generation');
    }
    
    try {
      // Get relevant contexts for the LLM
      const contexts = await this.contextManager.getRelevantContext({
        includeSchemas: true,
        includePatterns: true,
        includeSecurityRules: true,
      });
      
      const contextPrompt = this.contextManager.formatContextsForPrompt(contexts);
      
      // Build the prompt for the LLM
      const prompt = `
${contextPrompt}

I need to generate a database query based on the following intent:
"${intent}"

The query will be executed as a ${entityType} user with auth ID "${authId || 'anonymous'}".

Please analyze the intent and generate a structured query object following our QueryIntent interfaces.
Make sure to follow all security patterns, especially checking that users can only access their own data.

Return ONLY the JSON object without explanation, formatted as a valid TypeScript object.`;
      
      const completionParams: CompletionParams = {
        prompt,
        temperature: 0.2, // Low temperature for deterministic output
        maxTokens: 1000,
      };
      
      // Generate the query using LLM
      const response = await this.llmClient.complete(completionParams);
      
      // Parse the response as JSON
      try {
        const queryJson = this.extractJSON(response.content);
        return JSON.parse(queryJson);
      } catch (parseError) {
        throw new Error(`Failed to parse LLM response as JSON: ${parseError}`);
      }
    } catch (error: any) {
      throw new Error(`Error generating query from intent: ${error.message}`);
    }
  }
  
  /**
   * Extract JSON from a string
   */
  private extractJSON(text: string): string {
    // Try to find JSON object in the text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return match[0];
    }
    
    throw new Error('No JSON object found in the text');
  }
  
  /**
   * Execute a query intent
   */
  public async executeQueryIntent(queryIntent: QueryIntent): Promise<QueryResult> {
    // Validate the query intent
    this.validateQueryIntent(queryIntent);
    
    // Execute based on intent type
    switch (queryIntent.type) {
      case QueryIntentType.SELECT:
        return this.executeOperation(
          queryIntent.tables[0],
          DatabaseOperation.SELECT,
          queryIntent as SelectQueryIntent
        );
      case QueryIntentType.INSERT:
        return this.executeOperation(
          queryIntent.tables[0],
          DatabaseOperation.INSERT,
          queryIntent as InsertQueryIntent
        );
      case QueryIntentType.UPDATE:
        return this.executeOperation(
          queryIntent.tables[0],
          DatabaseOperation.UPDATE,
          queryIntent as UpdateQueryIntent
        );
      case QueryIntentType.DELETE:
        return this.executeOperation(
          queryIntent.tables[0],
          DatabaseOperation.DELETE,
          queryIntent as DeleteQueryIntent
        );
      case QueryIntentType.JOIN:
      case QueryIntentType.AGGREGATE:
      case QueryIntentType.SEARCH:
      case QueryIntentType.UPSERT:
        // Complex queries, pass to DB client as-is
        return this.dbClient.query(
          await this.buildSqlFromIntent(queryIntent),
          []
        );
      default:
        throw new Error(`Unsupported query intent type: ${(queryIntent as any).type}`);
    }
  }
  
  /**
   * Validate a query intent
   */
  private validateQueryIntent(queryIntent: QueryIntent): void {
    // Check required fields
    if (!queryIntent.type) {
      throw new Error('Query intent type is required');
    }
    
    if (!queryIntent.tables || queryIntent.tables.length === 0) {
      throw new Error('At least one table is required in query intent');
    }
    
    // Check type-specific requirements
    switch (queryIntent.type) {
      case QueryIntentType.INSERT:
        const insertIntent = queryIntent as InsertQueryIntent;
        if (!insertIntent.data) {
          throw new Error('Data is required for INSERT query intent');
        }
        break;
      case QueryIntentType.UPDATE:
        const updateIntent = queryIntent as UpdateQueryIntent;
        if (!updateIntent.data) {
          throw new Error('Data is required for UPDATE query intent');
        }
        if (!updateIntent.filters) {
          throw new Error('Filters are required for UPDATE query intent');
        }
        break;
      case QueryIntentType.DELETE:
        const deleteIntent = queryIntent as DeleteQueryIntent;
        if (!deleteIntent.filters) {
          throw new Error('Filters are required for DELETE query intent');
        }
        break;
    }
    
    // Validate against security patterns
    this.validateSecurityPatterns(queryIntent);
  }
  
  /**
   * Validate a query intent against security patterns
   */
  private validateSecurityPatterns(queryIntent: QueryIntent): void {
    if (!this.validatePatterns) {
      return;
    }
    
    // Check Auth ID pattern
    if (queryIntent.authId) {
      const hasAuthCheck = this.hasAuthIdCheck(queryIntent);
      
      if (!hasAuthCheck) {
        throw new Error(
          'Security violation: Missing auth ID check. Queries must filter based on the user\'s auth ID.'
        );
      }
    }
    
    // Add more pattern checks as needed
  }
  
  /**
   * Check if a query intent has an auth ID check
   */
  private hasAuthIdCheck(queryIntent: QueryIntent): boolean {
    // For SELECT, UPDATE, DELETE, check filters
    if (
      queryIntent.type === QueryIntentType.SELECT ||
      queryIntent.type === QueryIntentType.UPDATE ||
      queryIntent.type === QueryIntentType.DELETE
    ) {
      const intentWithFilters = queryIntent as SelectQueryIntent | UpdateQueryIntent | DeleteQueryIntent;
      
      if (!intentWithFilters.filters) {
        return false;
      }
      
      // Check if there's a direct auth ID filter
      const filters = intentWithFilters.filters;
      
      // For object-style filters
      if (!Array.isArray(filters)) {
        return Object.keys(filters).some(key => 
          key === 'user_id' || 
          key === 'auth_id' || 
          key === 'homeowner_id' ||
          key === 'contractor_id' ||
          key === 'created_by'
        );
      }
      
      // For array-style filters
      return filters.some(filter => 
        filter.field === 'user_id' || 
        filter.field === 'auth_id' || 
        filter.field === 'homeowner_id' ||
        filter.field === 'contractor_id' ||
        filter.field === 'created_by'
      );
    }
    
    // For INSERT, check the data
    if (queryIntent.type === QueryIntentType.INSERT) {
      const insertIntent = queryIntent as InsertQueryIntent;
      const data = insertIntent.data;
      
      if (Array.isArray(data)) {
        // Check every object in the array
        return data.every(item => 
          'user_id' in item || 
          'auth_id' in item || 
          'homeowner_id' in item ||
          'contractor_id' in item ||
          'created_by' in item
        );
      }
      
      // Check the single data object
      return (
        'user_id' in data || 
        'auth_id' in data || 
        'homeowner_id' in data ||
        'contractor_id' in data ||
        'created_by' in data
      );
    }
    
    // Default to false for other query types
    return false;
  }
  
  /**
   * Build SQL from a query intent
   */
  private async buildSqlFromIntent(queryIntent: QueryIntent): Promise<string> {
    if (!this.llmClient) {
      throw new Error('LLM client is required for SQL generation');
    }
    
    try {
      // Get relevant contexts for the LLM
      const contexts = await this.contextManager.getRelevantContext({
        includeSchemas: true,
        includePatterns: false,
        includeSecurityRules: true,
        tableNames: queryIntent.tables,
      });
      
      const contextPrompt = this.contextManager.formatContextsForPrompt(contexts);
      
      // Build the prompt for the LLM
      const prompt = `
${contextPrompt}

I need to generate a SQL query for PostgreSQL based on the following query intent:
${JSON.stringify(queryIntent, null, 2)}

Please generate ONLY the SQL query without explanation or commentary.
Ensure the SQL follows best practices and is properly secured against SQL injection.`;
      
      const completionParams: CompletionParams = {
        prompt,
        temperature: 0.2, // Low temperature for deterministic output
        maxTokens: 1000,
      };
      
      // Generate the SQL using LLM
      const response = await this.llmClient.complete(completionParams);
      
      // Extract the SQL query from the response
      const sql = response.content.trim();
      
      // Validate SQL size
      if (sql.length > this.maxQuerySize) {
        throw new Error(`Generated SQL query is too large (${sql.length} chars)`);
      }
      
      return sql;
    } catch (error: any) {
      throw new Error(`Error building SQL from intent: ${error.message}`);
    }
  }
}

/**
 * Check if a string is a valid date
 */
function isValidDateString(value: string): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  
  // Try ISO format
  const date = new Date(value);
  return !isNaN(date.getTime());
}
