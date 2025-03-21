/**
 * @file Database Agent Proxy
 * 
 * This file provides the Guard Layer for the LLM Sandwich Architecture.
 * It forms the "top bread" of the sandwich, enforcing architectural patterns
 * and providing a secure interface for domain agents to interact with the database.
 */

import { LLMClient, CompletionParams } from '../../integration/llm-client.js';
import { ContextManager } from '../../integration/context-manager.js';
import {
  DataInterface,
  QueryIntent,
  QueryIntentType,
  QueryResult,
  SelectQueryIntent,
  InsertQueryIntent,
  UpdateQueryIntent,
  DeleteQueryIntent,
} from '../persistence/data-interface.js';

/**
 * Pattern violation severity
 */
export enum ViolationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

/**
 * Pattern violation
 */
export interface PatternViolation {
  /** Pattern ID that was violated */
  patternId: string;
  /** Message describing the violation */
  message: string;
  /** Severity of the violation */
  severity: ViolationSeverity;
  /** Query that caused the violation */
  query?: QueryIntent;
}

/**
 * Options for query execution
 */
export interface ExecuteOptions {
  /** Whether to bypass pattern checking */
  bypassPatternCheck?: boolean;
  /** Whether to throw on pattern violations */
  throwOnViolation?: boolean;
  /** Patterns to specifically check for */
  patternsToCheck?: string[];
  /** Should validate IDs */
  validateIds?: boolean;
  /** Should respect domain boundaries */
  checkDomainBoundaries?: boolean;
}

/**
 * Default execute options
 */
const DEFAULT_EXECUTE_OPTIONS: ExecuteOptions = {
  bypassPatternCheck: false,
  throwOnViolation: true,
  validateIds: true,
  checkDomainBoundaries: true,
};

/**
 * Database Agent Proxy options
 */
export interface DatabaseAgentProxyOptions {
  /** Data interface to use */
  dataInterface: DataInterface;
  /** Context manager for pattern awareness */
  contextManager: ContextManager;
  /** LLM client for query validation and generation */
  llmClient?: LLMClient;
  /** Default execute options */
  defaultExecuteOptions?: Partial<ExecuteOptions>;
  /** Debug mode */
  debug?: boolean;
}

/**
 * Database Agent Proxy for the LLM Sandwich Architecture
 */
export class DatabaseAgentProxy {
  private dataInterface: DataInterface;
  private contextManager: ContextManager;
  private llmClient?: LLMClient;
  private defaultOptions: ExecuteOptions;
  private debug: boolean;
  
  // Cached patterns
  private authIdPattern: any;
  private domainBoundariesPattern: any;
  private secureDataAccessPattern: any;
  
  /**
   * Create a new Database Agent Proxy
   */
  constructor(options: DatabaseAgentProxyOptions) {
    this.dataInterface = options.dataInterface;
    this.contextManager = options.contextManager;
    this.llmClient = options.llmClient;
    this.defaultOptions = {
      ...DEFAULT_EXECUTE_OPTIONS,
      ...(options.defaultExecuteOptions || {}),
    };
    this.debug = options.debug || false;
  }
  
  /**
   * Initialize the proxy
   */
  public async initialize(): Promise<void> {
    // Load the patterns from the context manager
    try {
      const patterns = await this.contextManager.getRelevantContext({
        includePatterns: true,
        includeSchemas: false,
        includeSecurityRules: false,
      });
      
      // Find the auth ID pattern
      this.authIdPattern = patterns.find(pattern => 
        pattern.name.includes('Auth ID') ||
        pattern.name.includes('Authentication')
      );
      
      // Find the domain boundaries pattern
      this.domainBoundariesPattern = patterns.find(pattern => 
        pattern.name.includes('Domain Boundary') ||
        pattern.name.includes('Domains')
      );
      
      // Find the secure data access pattern
      this.secureDataAccessPattern = patterns.find(pattern => 
        pattern.name.includes('Secure Data') ||
        pattern.name.includes('Security')
      );
      
      if (this.debug) {
        console.log('Loaded patterns:');
        console.log(`- Auth ID Pattern: ${this.authIdPattern?.name}`);
        console.log(`- Domain Boundaries Pattern: ${this.domainBoundariesPattern?.name}`);
        console.log(`- Secure Data Access Pattern: ${this.secureDataAccessPattern?.name}`);
      }
    } catch (error) {
      console.error('Failed to initialize Database Agent Proxy:', error);
      throw error;
    }
  }
  
  /**
   * Execute a query intent
   */
  public async execute(
    queryIntent: QueryIntent,
    options: Partial<ExecuteOptions> = {}
  ): Promise<QueryResult> {
    const executeOptions = { ...this.defaultOptions, ...options };
    
    try {
      // Validate the query against patterns
      if (!executeOptions.bypassPatternCheck) {
        const violations = await this.validateQueryIntent(queryIntent, executeOptions);
        
        if (violations.length > 0) {
          const errorViolations = violations.filter(v => v.severity === ViolationSeverity.ERROR);
          
          if (errorViolations.length > 0 && executeOptions.throwOnViolation) {
            throw new Error(
              `Pattern violations detected: ${errorViolations.map(v => v.message).join(', ')}`
            );
          }
          
          if (this.debug) {
            console.warn('Pattern violations detected:');
            violations.forEach(violation => {
              console.warn(`- [${violation.severity}] ${violation.message}`);
            });
          }
        }
      }
      
      // Execute the query
      const result = await this.dataInterface.executeQueryIntent(queryIntent);
      
      return result;
    } catch (error: any) {
      // Handle error recovery if possible
      if (this.llmClient) {
        try {
          const recoveredQuery = await this.attemptQueryRecovery(queryIntent, error.message);
          
          if (recoveredQuery) {
            if (this.debug) {
              console.log('Attempting query recovery with:', recoveredQuery);
            }
            
            // Try executing the recovered query
            return await this.dataInterface.executeQueryIntent(recoveredQuery);
          }
        } catch (recoveryError) {
          if (this.debug) {
            console.error('Query recovery failed:', recoveryError);
          }
        }
      }
      
      // If recovery failed or wasn't attempted, return an error result
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }
  
  /**
   * Validate a query intent against patterns
   */
  private async validateQueryIntent(
    queryIntent: QueryIntent,
    options: ExecuteOptions
  ): Promise<PatternViolation[]> {
    const violations: PatternViolation[] = [];
    
    // Check for ID validation
    if (options.validateIds) {
      const idViolations = this.validateAuthIdPattern(queryIntent);
      violations.push(...idViolations);
    }
    
    // Check for domain boundaries
    if (options.checkDomainBoundaries) {
      const domainViolations = await this.validateDomainBoundaries(queryIntent);
      violations.push(...domainViolations);
    }
    
    // Additional pattern checks can be added here
    
    return violations;
  }
  
  /**
   * Validate a query intent against the auth ID pattern
   */
  private validateAuthIdPattern(queryIntent: QueryIntent): PatternViolation[] {
    const violations: PatternViolation[] = [];
    
    // Skip validation if query doesn't involve user data
    const userTables = [
      'users', 'profiles', 'homeowners', 'contractors', 'property_managers', 
      'labor_helpers', 'bids', 'projects', 'conversations', 'messages', 'payments'
    ];
    
    const isUserDataQuery = queryIntent.tables.some(table => 
      userTables.some(userTable => table.includes(userTable))
    );
    
    if (!isUserDataQuery) {
      return violations;
    }
    
    // Check if auth ID is provided
    if (!queryIntent.authId) {
      violations.push({
        patternId: 'AUTH_ID_PATTERN',
        message: 'Authentication ID is required for user data operations',
        severity: ViolationSeverity.ERROR,
        query: queryIntent,
      });
      
      return violations;
    }
    
    // Check for auth ID filtering based on query type
    switch (queryIntent.type) {
      case QueryIntentType.SELECT:
        this.validateSelectAuthIdPattern(queryIntent as SelectQueryIntent, violations);
        break;
      case QueryIntentType.INSERT:
        this.validateInsertAuthIdPattern(queryIntent as InsertQueryIntent, violations);
        break;
      case QueryIntentType.UPDATE:
        this.validateUpdateAuthIdPattern(queryIntent as UpdateQueryIntent, violations);
        break;
      case QueryIntentType.DELETE:
        this.validateDeleteAuthIdPattern(queryIntent as DeleteQueryIntent, violations);
        break;
    }
    
    return violations;
  }
  
  /**
   * Validate a SELECT query against the auth ID pattern
   */
  private validateSelectAuthIdPattern(
    queryIntent: SelectQueryIntent,
    violations: PatternViolation[]
  ): void {
    if (!queryIntent.filters) {
      violations.push({
        patternId: 'AUTH_ID_PATTERN',
        message: 'SELECT queries must include authentication ID filters',
        severity: ViolationSeverity.ERROR,
        query: queryIntent,
      });
      
      return;
    }
    
    // Check if filters contain auth ID
    const hasAuthIdFilter = this.hasAuthIdInFilters(queryIntent.filters);
    
    if (!hasAuthIdFilter) {
      violations.push({
        patternId: 'AUTH_ID_PATTERN',
        message: 'SELECT queries must filter by authentication ID',
        severity: ViolationSeverity.ERROR,
        query: queryIntent,
      });
    }
  }
  
  /**
   * Validate an INSERT query against the auth ID pattern
   */
  private validateInsertAuthIdPattern(
    queryIntent: InsertQueryIntent,
    violations: PatternViolation[]
  ): void {
    // For arrays of data
    if (Array.isArray(queryIntent.data)) {
      for (let i = 0; i < queryIntent.data.length; i++) {
        const item = queryIntent.data[i];
        const hasAuthIdField = this.hasAuthIdInData(item);
        
        if (!hasAuthIdField) {
          violations.push({
            patternId: 'AUTH_ID_PATTERN',
            message: `INSERT data[${i}] must include authentication ID field`,
            severity: ViolationSeverity.ERROR,
            query: queryIntent,
          });
        }
      }
    } else {
      // For single data object
      const hasAuthIdField = this.hasAuthIdInData(queryIntent.data);
      
      if (!hasAuthIdField) {
        violations.push({
          patternId: 'AUTH_ID_PATTERN',
          message: 'INSERT data must include authentication ID field',
          severity: ViolationSeverity.ERROR,
          query: queryIntent,
        });
      }
    }
  }
  
  /**
   * Validate an UPDATE query against the auth ID pattern
   */
  private validateUpdateAuthIdPattern(
    queryIntent: UpdateQueryIntent,
    violations: PatternViolation[]
  ): void {
    // Check filters for auth ID
    if (!queryIntent.filters) {
      violations.push({
        patternId: 'AUTH_ID_PATTERN',
        message: 'UPDATE queries must include authentication ID filters',
        severity: ViolationSeverity.ERROR,
        query: queryIntent,
      });
      
      return;
    }
    
    const hasAuthIdFilter = this.hasAuthIdInFilters(queryIntent.filters);
    
    if (!hasAuthIdFilter) {
      violations.push({
        patternId: 'AUTH_ID_PATTERN',
        message: 'UPDATE queries must filter by authentication ID',
        severity: ViolationSeverity.ERROR,
        query: queryIntent,
      });
    }
    
    // Check if we're trying to change auth ID fields
    const authIdFields = [
      'user_id', 'auth_id', 'homeowner_id', 'contractor_id', 'created_by'
    ];
    
    const isChangingAuthId = Object.keys(queryIntent.data).some(key => 
      authIdFields.includes(key)
    );
    
    if (isChangingAuthId) {
      violations.push({
        patternId: 'AUTH_ID_PATTERN',
        message: 'UPDATE queries should not modify authentication ID fields',
        severity: ViolationSeverity.WARNING,
        query: queryIntent,
      });
    }
  }
  
  /**
   * Validate a DELETE query against the auth ID pattern
   */
  private validateDeleteAuthIdPattern(
    queryIntent: DeleteQueryIntent,
    violations: PatternViolation[]
  ): void {
    // Check filters for auth ID
    if (!queryIntent.filters) {
      violations.push({
        patternId: 'AUTH_ID_PATTERN',
        message: 'DELETE queries must include authentication ID filters',
        severity: ViolationSeverity.ERROR,
        query: queryIntent,
      });
      
      return;
    }
    
    const hasAuthIdFilter = this.hasAuthIdInFilters(queryIntent.filters);
    
    if (!hasAuthIdFilter) {
      violations.push({
        patternId: 'AUTH_ID_PATTERN',
        message: 'DELETE queries must filter by authentication ID',
        severity: ViolationSeverity.ERROR,
        query: queryIntent,
      });
    }
  }
  
  /**
   * Check if filters contain auth ID fields
   */
  private hasAuthIdInFilters(filters: any): boolean {
    const authIdFields = [
      'user_id', 'auth_id', 'homeowner_id', 'contractor_id', 'created_by'
    ];
    
    // For object-style filters
    if (!Array.isArray(filters)) {
      return Object.keys(filters).some(key => 
        authIdFields.includes(key)
      );
    }
    
    // For array-style filters
    return filters.some(filter => 
      authIdFields.includes(filter.field)
    );
  }
  
  /**
   * Check if data contains auth ID fields
   */
  private hasAuthIdInData(data: any): boolean {
    const authIdFields = [
      'user_id', 'auth_id', 'homeowner_id', 'contractor_id', 'created_by'
    ];
    
    return Object.keys(data).some(key => 
      authIdFields.includes(key)
    );
  }
  
  /**
   * Validate a query intent against domain boundaries
   */
  private async validateDomainBoundaries(
    queryIntent: QueryIntent
  ): Promise<PatternViolation[]> {
    const violations: PatternViolation[] = [];
    
    // Skip if there's only one table
    if (queryIntent.tables.length <= 1) {
      return violations;
    }
    
    // Domain mappings
    const domainMappings: Record<string, string> = {
      'users': 'user',
      'profiles': 'user',
      'homeowners': 'user',
      'contractors': 'user',
      'property_managers': 'user',
      'labor_helpers': 'user',
      'bid_cards': 'bidding',
      'bids': 'bidding',
      'group_bids': 'bidding',
      'projects': 'project',
      'project_milestones': 'project',
      'project_tasks': 'project',
      'conversations': 'messaging',
      'messages': 'messaging',
      'payments': 'payment',
      'transactions': 'payment',
      'escrow_accounts': 'payment',
      'reviews': 'community',
      'ratings': 'community',
      'trust_scores': 'community',
    };
    
    // Check if query spans multiple domains
    const domains = new Set<string>();
    
    queryIntent.tables.forEach(table => {
      const tableName = table.toLowerCase();
      
      // Determine domain from table name
      for (const [key, domain] of Object.entries(domainMappings)) {
        if (tableName.includes(key)) {
          domains.add(domain);
          break;
        }
      }
    });
    
    if (domains.size > 1) {
      // Check if this is an allowed cross-domain query
      const allowedCrossDomainPairs = [
        ['user', 'bidding'],
        ['user', 'project'],
        ['bidding', 'project'],
        ['user', 'messaging'],
        ['user', 'payment'],
      ];
      
      const domainsArray = Array.from(domains);
      const isAllowedCrossDomain = allowedCrossDomainPairs.some(pair => 
        domainsArray.includes(pair[0]) && domainsArray.includes(pair[1])
      );
      
      if (!isAllowedCrossDomain) {
        violations.push({
          patternId: 'DOMAIN_BOUNDARY_PATTERN',
          message: `Query spans multiple domains: ${Array.from(domains).join(', ')}`,
          severity: ViolationSeverity.WARNING,
          query: queryIntent,
        });
      }
    }
    
    return violations;
  }
  
  /**
   * Attempt to recover a failed query using LLM
   */
  private async attemptQueryRecovery(
    queryIntent: QueryIntent,
    errorMessage: string
  ): Promise<QueryIntent | null> {
    if (!this.llmClient) {
      return null;
    }
    
    try {
      // Build the prompt for the LLM
      const prompt = `
You are a database query recovery assistant. A query has failed and you need to fix it.

Original Query Intent:
${JSON.stringify(queryIntent, null, 2)}

Error Message:
${errorMessage}

Please analyze the error and provide a corrected version of the Query Intent.
Make the minimum changes needed to fix the issue while preserving the original intent.
If you cannot fix the query, return null.

Return ONLY the fixed JSON object without explanation, formatted as a valid TypeScript object.`;
      
      const completionParams: CompletionParams = {
        prompt,
        temperature: 0.2,
        maxTokens: 1000,
      };
      
      // Generate the fixed query using LLM
      const response = await this.llmClient.complete(completionParams);
      
      // Parse the response as JSON
      try {
        // Extract JSON object from the text
        const match = response.content.match(/\{[\s\S]*\}/);
        if (!match) {
          return null;
        }
        
        const recoveredQuery = JSON.parse(match[0]);
        
        // Validate the recovered query
        if (!this.isValidQueryIntent(recoveredQuery)) {
          return null;
        }
        
        return recoveredQuery;
      } catch (error) {
        return null;
      }
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Validate that an object is a valid query intent
   */
  private isValidQueryIntent(obj: any): boolean {
    return (
      obj &&
      typeof obj === 'object' &&
      typeof obj.type === 'string' &&
      Array.isArray(obj.tables) &&
      obj.tables.length > 0
    );
  }
  
  /**
   * Create a query with intent
   */
  public async createQuery(
    intentDescription: string,
    entityType: string,
    authId?: string
  ): Promise<QueryIntent> {
    if (!this.llmClient) {
      throw new Error('LLM client is required for query generation');
    }
    
    return await this.dataInterface.generateQueryFromIntent(
      intentDescription,
      entityType,
      authId
    );
  }
  
  /**
   * Profile verification - validate that a user ID belongs to a specific user type
   */
  public async verifyProfile(
    authId: string,
    profileType: string
  ): Promise<boolean> {
    try {
      const result = await this.execute({
        type: QueryIntentType.SELECT,
        description: `Verify that user ${authId} is a ${profileType}`,
        tables: [profileType + 's'], // e.g., homeowners, contractors
        authId: authId,
        entityType: 'system',
        fields: ['id'],
        filters: {
          user_id: authId
        }
      } as SelectQueryIntent);
      
      return result.success && (result.data?.length ?? 0) > 0;
    } catch (error) {
      return false;
    }
  }
}
