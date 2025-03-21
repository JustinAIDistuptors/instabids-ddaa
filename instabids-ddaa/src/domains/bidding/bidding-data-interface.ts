/**
 * Bidding Data Interface - Data access layer for the bidding domain
 * 
 * This component handles all data access operations for the bidding domain,
 * isolating the domain logic from the underlying database implementation.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DataInterface, QueryCriteria, QueryOptions, TransactionContext, BulkOperationResult } from '../../core/persistence/data-interface';

/**
 * Data interface implementation for the bidding domain
 */
export class BiddingDataInterface extends DataInterface {
  /**
   * Supabase client instance
   */
  private client: SupabaseClient;

  /**
   * Constructor
   * 
   * @param supabaseUrl Supabase URL
   * @param supabaseKey Supabase API key
   */
  constructor(supabaseUrl: string, supabaseKey: string) {
    super('bidding', 'bidding');
    this.client = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Find a single entity by ID
   * 
   * @param entity Entity type (table name)
   * @param id Entity ID
   * @param options Query options
   * @returns The entity or null if not found
   */
  public async findById<T = any>(
    entity: string,
    id: string,
    options?: QueryOptions
  ): Promise<T | null> {
    const query = this.client
      .from(this.getTableName(entity))
      .select(this.getSelectFields(options))
      .eq('id', id);
    
    if (options?.joinRelations && options.joinRelations.length > 0) {
      // Handle join relations if needed
    }
    
    const { data, error } = await query.single();
    
    if (error) {
      console.error(`Error finding ${entity} by ID:`, error);
      return null;
    }
    
    return data as T;
  }

  /**
   * Find a single entity by criteria
   * 
   * @param entity Entity type (table name)
   * @param criteria Query criteria
   * @param options Query options
   * @returns The entity or null if not found
   */
  public async findOne<T = any>(
    entity: string,
    criteria: QueryCriteria,
    options?: QueryOptions
  ): Promise<T | null> {
    // Build the query
    let query = this.client
      .from(this.getTableName(entity))
      .select(this.getSelectFields(options));
    
    // Apply criteria
    query = this.applyCriteria(query, criteria);
    
    // Apply limit to 1 to ensure we only get a single result
    query = query.limit(1);
    
    const { data, error } = await query;
    
    if (error) {
      console.error(`Error finding ${entity} by criteria:`, error);
      return null;
    }
    
    return data && data.length > 0 ? data[0] as T : null;
  }

  /**
   * Find multiple entities by criteria
   * 
   * @param entity Entity type (table name)
   * @param criteria Query criteria
   * @param options Query options
   * @returns Array of matching entities
   */
  public async findMany<T = any>(
    entity: string,
    criteria?: QueryCriteria,
    options?: QueryOptions
  ): Promise<T[]> {
    // Build the query
    let query = this.client
      .from(this.getTableName(entity))
      .select(this.getSelectFields(options));
    
    // Apply criteria if provided
    if (criteria) {
      query = this.applyCriteria(query, criteria);
    }
    
    // Apply pagination options
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }
    
    // Apply ordering
    if (options?.orderBy) {
      const direction = options.orderDirection || 'desc';
      query = query.order(options.orderBy, { ascending: direction === 'asc' });
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error(`Error finding ${entity} list:`, error);
      return [];
    }
    
    return data as T[];
  }

  /**
   * Count entities by criteria
   * 
   * @param entity Entity type (table name)
   * @param criteria Query criteria
   * @returns Count of matching entities
   */
  public async count(
    entity: string,
    criteria?: QueryCriteria
  ): Promise<number> {
    // Build the query
    let query = this.client
      .from(this.getTableName(entity))
      .select('*', { count: 'exact', head: true });
    
    // Apply criteria if provided
    if (criteria) {
      query = this.applyCriteria(query, criteria);
    }
    
    const { count, error } = await query;
    
    if (error) {
      console.error(`Error counting ${entity}:`, error);
      return 0;
    }
    
    return count || 0;
  }

  /**
   * Create a new entity
   * 
   * @param entity Entity type (table name)
   * @param data Entity data
   * @returns The created entity
   */
  public async create<T = any>(
    entity: string,
    data: Partial<T>
  ): Promise<T> {
    const { data: result, error } = await this.client
      .from(this.getTableName(entity))
      .insert(data as any)
      .select()
      .single();
    
    if (error) {
      console.error(`Error creating ${entity}:`, error);
      throw new Error(`Failed to create ${entity}: ${error.message}`);
    }
    
    return result as T;
  }

  /**
   * Update an existing entity
   * 
   * @param entity Entity type (table name)
   * @param id Entity ID
   * @param data Updated entity data
   * @returns The updated entity
   */
  public async update<T = any>(
    entity: string,
    id: string,
    data: Partial<T>
  ): Promise<T> {
    const { data: result, error } = await this.client
      .from(this.getTableName(entity))
      .update(data as any)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating ${entity}:`, error);
      throw new Error(`Failed to update ${entity}: ${error.message}`);
    }
    
    return result as T;
  }

  /**
   * Delete an entity
   * 
   * @param entity Entity type (table name)
   * @param id Entity ID
   * @param permanent Whether to permanently delete the entity
   * @returns Success indicator
   */
  public async delete(
    entity: string,
    id: string,
    permanent?: boolean
  ): Promise<boolean> {
    if (!permanent) {
      // Soft delete - update the deleted_at field
      const { error } = await this.client
        .from(this.getTableName(entity))
        .update({ deleted_at: new Date() })
        .eq('id', id);
      
      if (error) {
        console.error(`Error soft deleting ${entity}:`, error);
        return false;
      }
    } else {
      // Hard delete - actually remove from the database
      const { error } = await this.client
        .from(this.getTableName(entity))
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error(`Error hard deleting ${entity}:`, error);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Perform a raw SQL query
   * 
   * @param sql SQL query
   * @param params Query parameters
   * @returns Query results
   */
  public async rawQuery<T = any>(
    sql: string,
    params?: any[]
  ): Promise<T[]> {
    const { data, error } = await this.client.rpc('execute_sql', {
      query_text: sql,
      query_params: params
    });
    
    if (error) {
      console.error('Error executing raw query:', error);
      throw new Error(`Failed to execute raw query: ${error.message}`);
    }
    
    return data as T[];
  }

  /**
   * Start a database transaction
   * 
   * @param meta Transaction metadata
   * @returns Transaction context
   */
  public async beginTransaction(
    meta?: Record<string, any>
  ): Promise<TransactionContext> {
    // Supabase doesn't have explicit transaction support in the JS client
    // This is a placeholder implementation
    return {
      transactionId: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      userId: meta?.userId,
      meta
    };
  }

  /**
   * Commit a database transaction
   * 
   * @param context Transaction context
   * @returns Success indicator
   */
  public async commitTransaction(
    context: TransactionContext
  ): Promise<boolean> {
    // Placeholder implementation
    return true;
  }

  /**
   * Rollback a database transaction
   * 
   * @param context Transaction context
   * @returns Success indicator
   */
  public async rollbackTransaction(
    context: TransactionContext
  ): Promise<boolean> {
    // Placeholder implementation
    return true;
  }

  /**
   * Create multiple entities in a single operation
   * 
   * @param entity Entity type (table name)
   * @param data Array of entity data
   * @returns Bulk operation result
   */
  public async bulkCreate<T = any>(
    entity: string,
    data: Partial<T>[]
  ): Promise<BulkOperationResult> {
    const { data: result, error } = await this.client
      .from(this.getTableName(entity))
      .insert(data as any);
    
    if (error) {
      console.error(`Error bulk creating ${entity}:`, error);
      return {
        success: false,
        count: 0,
        errors: [error.message]
      };
    }
    
    return {
      success: true,
      count: data.length
    };
  }

  /**
   * Update multiple entities in a single operation
   * 
   * @param entity Entity type (table name)
   * @param criteria Query criteria
   * @param data Updated entity data
   * @returns Bulk operation result
   */
  public async bulkUpdate<T = any>(
    entity: string,
    criteria: QueryCriteria,
    data: Partial<T>
  ): Promise<BulkOperationResult> {
    // First count how many records we're updating
    const count = await this.count(entity, criteria);
    
    // Build the query
    let query = this.client
      .from(this.getTableName(entity))
      .update(data as any);
    
    // Apply criteria
    query = this.applyCriteria(query, criteria);
    
    const { error } = await query;
    
    if (error) {
      console.error(`Error bulk updating ${entity}:`, error);
      return {
        success: false,
        count: 0,
        errors: [error.message]
      };
    }
    
    return {
      success: true,
      count
    };
  }

  /**
   * Delete multiple entities in a single operation
   * 
   * @param entity Entity type (table name)
   * @param criteria Query criteria
   * @param permanent Whether to permanently delete the entities
   * @returns Bulk operation result
   */
  public async bulkDelete(
    entity: string,
    criteria: QueryCriteria,
    permanent?: boolean
  ): Promise<BulkOperationResult> {
    // First count how many records we're deleting
    const count = await this.count(entity, criteria);
    
    if (!permanent) {
      // Soft delete - update the deleted_at field
      const { error } = await this.client
        .from(this.getTableName(entity))
        .update({ deleted_at: new Date() });
      
      // Apply criteria
      const query = this.applyCriteria(this.client.from(this.getTableName(entity)), criteria);
      
      if (error) {
        console.error(`Error bulk soft deleting ${entity}:`, error);
        return {
          success: false,
          count: 0,
          errors: [error.message]
        };
      }
    } else {
      // Hard delete - actually remove from the database
      // Apply criteria
      const query = this.applyCriteria(this.client.from(this.getTableName(entity)), criteria);
      
      const { error } = await query.delete();
      
      if (error) {
        console.error(`Error bulk hard deleting ${entity}:`, error);
        return {
          success: false,
          count: 0,
          errors: [error.message]
        };
      }
    }
    
    return {
      success: true,
      count
    };
  }

  /**
   * Apply criteria to a query
   * 
   * @param query Supabase query
   * @param criteria Query criteria
   * @returns Modified query
   */
  private applyCriteria(query: any, criteria: QueryCriteria): any {
    // Process each criteria
    for (const [key, value] of Object.entries(criteria)) {
      // Handle special OR operator
      if (key === '$or' && Array.isArray(value)) {
        // Build OR filter
        const orFilters = value.map(condition => {
          const entries = Object.entries(condition);
          if (entries.length === 1) {
            const [field, fieldValue] = entries[0];
            return `${field}.eq.${fieldValue}`;
          }
          return null;
        }).filter(Boolean);
        
        if (orFilters.length > 0) {
          query = query.or(orFilters.join(','));
        }
        continue;
      }
      
      // Handle $in operator
      if (value && typeof value === 'object' && '$in' in value) {
        if (Array.isArray(value.$in)) {
          query = query.in(key, value.$in);
        }
        continue;
      }
      
      // Handle normal equality
      query = query.eq(key, value);
    }
    
    return query;
  }

  /**
   * Get select fields from options
   * 
   * @param options Query options
   * @returns Select fields string
   */
  private getSelectFields(options?: QueryOptions): string {
    if (options?.select && options.select.length > 0) {
      return options.select.join(',');
    }
    return '*';
  }
}
