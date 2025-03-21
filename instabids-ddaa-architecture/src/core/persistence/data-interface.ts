/**
 * Data Interface
 * 
 * The Data Interface is the bottom layer in the Domain-Driven Agent Architecture.
 * It provides domain-specific abstractions for interacting with the persistence layer
 * and encapsulates knowledge about the database schema and query patterns.
 */

export interface DataQuery<T = any> {
  filters?: Record<string, any>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  }[];
  pagination?: {
    page: number;
    pageSize: number;
  };
  select?: string[];
  relations?: string[];
  search?: string;
}

export interface QueryResult<T = any> {
  data: T[];
  total: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

export interface DataInterface<T extends Record<string, any> = Record<string, any>> {
  /**
   * The name of the domain this data interface belongs to
   */
  readonly domainName: string;
  
  /**
   * Finds entities matching the given query
   * 
   * @param query Query parameters to filter, sort, and paginate results
   * @returns A promise resolving to a QueryResult containing the matched entities
   */
  findMany(query?: DataQuery<T>): Promise<QueryResult<T>>;
  
  /**
   * Finds a single entity by its ID
   * 
   * @param id The unique identifier of the entity
   * @param options Optional query options like select and relations
   * @returns A promise resolving to the entity or null if not found
   */
  findById(id: string, options?: Pick<DataQuery<T>, 'select' | 'relations'>): Promise<T | null>;
  
  /**
   * Finds a single entity matching the given criteria
   * 
   * @param criteria Criteria to filter by
   * @param options Optional query options like select and relations
   * @returns A promise resolving to the entity or null if not found
   */
  findOne(criteria: Record<string, any>, options?: Pick<DataQuery<T>, 'select' | 'relations'>): Promise<T | null>;
  
  /**
   * Creates a new entity
   * 
   * @param data The data for the new entity
   * @returns A promise resolving to the created entity
   */
  create(data: Partial<T>): Promise<T>;
  
  /**
   * Creates multiple entities in a single operation
   * 
   * @param dataArray An array of data for the new entities
   * @returns A promise resolving to an array of created entities
   */
  createMany(dataArray: Partial<T>[]): Promise<T[]>;
  
  /**
   * Updates an existing entity
   * 
   * @param id The unique identifier of the entity to update
   * @param data The updated data
   * @returns A promise resolving to the updated entity
   */
  update(id: string, data: Partial<T>): Promise<T>;
  
  /**
   * Updates multiple entities matching the criteria
   * 
   * @param criteria Criteria to filter by
   * @param data The updated data
   * @returns A promise resolving to the number of updated entities
   */
  updateMany(criteria: Record<string, any>, data: Partial<T>): Promise<number>;
  
  /**
   * Deletes an entity by its ID
   * 
   * @param id The unique identifier of the entity to delete
   * @returns A promise resolving to a boolean indicating success
   */
  delete(id: string): Promise<boolean>;
  
  /**
   * Deletes multiple entities matching the criteria
   * 
   * @param criteria Criteria to filter by
   * @returns A promise resolving to the number of deleted entities
   */
  deleteMany(criteria: Record<string, any>): Promise<number>;
  
  /**
   * Counts entities matching the criteria
   * 
   * @param criteria Criteria to filter by
   * @returns A promise resolving to the count
   */
  count(criteria?: Record<string, any>): Promise<number>;
  
  /**
   * Executes a custom query for domain-specific operations
   * that don't fit into the standard CRUD operations
   * 
   * @param name The name of the custom query
   * @param params Parameters for the custom query
   * @returns A promise resolving to the query result
   */
  executeCustomQuery<R = any>(name: string, params?: Record<string, any>): Promise<R>;
  
  /**
   * Executes a transaction that groups multiple operations into a single atomic unit
   * 
   * @param callback A function that receives a transaction object and returns a promise
   * @returns A promise resolving to the result of the callback
   */
  transaction<R = any>(callback: (transaction: DataTransaction<T>) => Promise<R>): Promise<R>;
}

export interface DataTransaction<T extends Record<string, any> = Record<string, any>> {
  findMany(query?: DataQuery<T>): Promise<QueryResult<T>>;
  findById(id: string, options?: Pick<DataQuery<T>, 'select' | 'relations'>): Promise<T | null>;
  findOne(criteria: Record<string, any>, options?: Pick<DataQuery<T>, 'select' | 'relations'>): Promise<T | null>;
  create(data: Partial<T>): Promise<T>;
  createMany(dataArray: Partial<T>[]): Promise<T[]>;
  update(id: string, data: Partial<T>): Promise<T>;
  updateMany(criteria: Record<string, any>, data: Partial<T>): Promise<number>;
  delete(id: string): Promise<boolean>;
  deleteMany(criteria: Record<string, any>): Promise<number>;
  count(criteria?: Record<string, any>): Promise<number>;
  executeCustomQuery<R = any>(name: string, params?: Record<string, any>): Promise<R>;
}

/**
 * Abstract base implementation of the Data Interface
 * Provides common functionality and can be extended for specific persistence technologies
 */
export abstract class BaseDataInterface<T extends Record<string, any> = Record<string, any>> implements DataInterface<T> {
  readonly domainName: string;
  
  constructor(domainName: string) {
    this.domainName = domainName;
  }
  
  abstract findMany(query?: DataQuery<T>): Promise<QueryResult<T>>;
  abstract findById(id: string, options?: Pick<DataQuery<T>, 'select' | 'relations'>): Promise<T | null>;
  abstract findOne(criteria: Record<string, any>, options?: Pick<DataQuery<T>, 'select' | 'relations'>): Promise<T | null>;
  abstract create(data: Partial<T>): Promise<T>;
  abstract createMany(dataArray: Partial<T>[]): Promise<T[]>;
  abstract update(id: string, data: Partial<T>): Promise<T>;
  abstract updateMany(criteria: Record<string, any>, data: Partial<T>): Promise<number>;
  abstract delete(id: string): Promise<boolean>;
  abstract deleteMany(criteria: Record<string, any>): Promise<number>;
  abstract count(criteria?: Record<string, any>): Promise<number>;
  abstract executeCustomQuery<R = any>(name: string, params?: Record<string, any>): Promise<R>;
  abstract transaction<R = any>(callback: (transaction: DataTransaction<T>) => Promise<R>): Promise<R>;
}

/**
 * Supabase-specific implementation of the Data Interface
 * (Simplified version - would need to be expanded for full implementation)
 */
export abstract class SupabaseDataInterface<T extends Record<string, any> = Record<string, any>> extends BaseDataInterface<T> {
  protected abstract get tableName(): string;
  
  // Implementation would use Supabase client to interact with the database
  // This is a placeholder showing how it would be structured
  
  async findMany(query?: DataQuery<T>): Promise<QueryResult<T>> {
    // Implementation would use Supabase query builder:
    // const supabaseQuery = supabase.from(this.tableName).select()
    // Apply filters, pagination, etc., from query param
    // Execute the query and return results
    
    throw new Error('Method not implemented');
  }
  
  async findById(id: string, options?: Pick<DataQuery<T>, 'select' | 'relations'>): Promise<T | null> {
    // Implementation would use Supabase query builder:
    // const result = await supabase.from(this.tableName).select().eq('id', id).single()
    // Return result.data
    
    throw new Error('Method not implemented');
  }
  
  // ...other method implementations would follow similar pattern
  
  async transaction<R = any>(callback: (transaction: DataTransaction<T>) => Promise<R>): Promise<R> {
    // Supabase doesn't directly support transactions through the client
    // Would need to implement using custom RPC functions or multiple queries with rollback logic
    throw new Error('Method not implemented');
  }
}
