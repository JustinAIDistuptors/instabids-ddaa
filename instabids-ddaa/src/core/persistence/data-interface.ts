/**
 * Data Interface - The bottom slice of the sandwich architecture
 * 
 * This is responsible for all data access and persistence operations
 * in a domain-specific context. It isolates domain operations from the 
 * underlying database implementation and ensures proper schema separation.
 */

/**
 * Query criteria for filtering data
 */
export type QueryCriteria = Record<string, any>;

/**
 * Query options for pagination, sorting, etc.
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  includeSoftDeleted?: boolean;
  joinRelations?: string[];
  select?: string[];
}

/**
 * Database transaction context
 */
export interface TransactionContext {
  transactionId: string;
  timestamp: number;
  userId?: string;
  meta?: Record<string, any>;
}

/**
 * Result of a bulk operation
 */
export interface BulkOperationResult {
  success: boolean;
  count: number;
  failedIds?: string[];
  errors?: string[];
}

/**
 * Base interface for domain-specific data interfaces
 * This is the bottom slice of the sandwich architecture
 */
export abstract class DataInterface {
  /**
   * Domain this data interface is responsible for
   */
  protected readonly domain: string;
  
  /**
   * Schema to use for all database operations
   */
  protected readonly schema: string;
  
  /**
   * Constructor for the data interface
   * 
   * @param domain Domain name
   * @param schema Database schema name
   */
  constructor(domain: string, schema: string) {
    this.domain = domain;
    this.schema = schema;
  }
  
  /**
   * Get full table name with schema
   * 
   * @param entity Entity name
   * @returns Fully qualified table name
   */
  protected getTableName(entity: string): string {
    return `${this.schema}.${entity}`;
  }
  
  /**
   * Find a single entity by ID
   * 
   * @param entity Entity type (table name)
   * @param id Entity ID
   * @param options Query options
   * @returns The entity or null if not found
   */
  public abstract findById<T = any>(
    entity: string,
    id: string,
    options?: QueryOptions
  ): Promise<T | null>;
  
  /**
   * Find multiple entities by criteria
   * 
   * @param entity Entity type (table name)
   * @param criteria Query criteria
   * @param options Query options
   * @returns Array of matching entities
   */
  public abstract findMany<T = any>(
    entity: string,
    criteria?: QueryCriteria,
    options?: QueryOptions
  ): Promise<T[]>;
  
  /**
   * Count entities by criteria
   * 
   * @param entity Entity type (table name)
   * @param criteria Query criteria
   * @returns Count of matching entities
   */
  public abstract count(
    entity: string,
    criteria?: QueryCriteria
  ): Promise<number>;
  
  /**
   * Create a new entity
   * 
   * @param entity Entity type (table name)
   * @param data Entity data
   * @returns The created entity
   */
  public abstract create<T = any>(
    entity: string,
    data: Partial<T>
  ): Promise<T>;
  
  /**
   * Update an existing entity
   * 
   * @param entity Entity type (table name)
   * @param id Entity ID
   * @param data Updated entity data
   * @returns The updated entity
   */
  public abstract update<T = any>(
    entity: string,
    id: string,
    data: Partial<T>
  ): Promise<T>;
  
  /**
   * Delete an entity (can be soft delete depending on implementation)
   * 
   * @param entity Entity type (table name)
   * @param id Entity ID
   * @param permanent Whether to permanently delete the entity
   * @returns Success indicator
   */
  public abstract delete(
    entity: string,
    id: string,
    permanent?: boolean
  ): Promise<boolean>;
  
  /**
   * Perform a raw SQL query (use with caution)
   * 
   * @param sql SQL query
   * @param params Query parameters
   * @returns Query results
   */
  public abstract rawQuery<T = any>(
    sql: string,
    params?: any[]
  ): Promise<T[]>;
  
  /**
   * Start a database transaction
   * 
   * @param meta Transaction metadata
   * @returns Transaction context
   */
  public abstract beginTransaction(
    meta?: Record<string, any>
  ): Promise<TransactionContext>;
  
  /**
   * Commit a database transaction
   * 
   * @param context Transaction context
   * @returns Success indicator
   */
  public abstract commitTransaction(
    context: TransactionContext
  ): Promise<boolean>;
  
  /**
   * Rollback a database transaction
   * 
   * @param context Transaction context
   * @returns Success indicator
   */
  public abstract rollbackTransaction(
    context: TransactionContext
  ): Promise<boolean>;
  
  /**
   * Create multiple entities in a single operation
   * 
   * @param entity Entity type (table name)
   * @param data Array of entity data
   * @returns Bulk operation result
   */
  public abstract bulkCreate<T = any>(
    entity: string,
    data: Partial<T>[]
  ): Promise<BulkOperationResult>;
  
  /**
   * Update multiple entities in a single operation
   * 
   * @param entity Entity type (table name)
   * @param criteria Query criteria
   * @param data Updated entity data
   * @returns Bulk operation result
   */
  public abstract bulkUpdate<T = any>(
    entity: string,
    criteria: QueryCriteria,
    data: Partial<T>
  ): Promise<BulkOperationResult>;
  
  /**
   * Delete multiple entities in a single operation
   * 
   * @param entity Entity type (table name)
   * @param criteria Query criteria
   * @param permanent Whether to permanently delete the entities
   * @returns Bulk operation result
   */
  public abstract bulkDelete(
    entity: string,
    criteria: QueryCriteria,
    permanent?: boolean
  ): Promise<BulkOperationResult>;
}
