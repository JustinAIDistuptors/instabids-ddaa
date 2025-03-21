/**
 * @file Context Manager
 * 
 * This file provides a context manager for the LLM Sandwich Architecture.
 * It is responsible for managing and providing relevant context to the LLM,
 * including schema information, architectural patterns, and business rules.
 */

import { KnowledgeRepositoryService } from '../knowledge-base/repository/knowledge-repository.js';
import { Schema, Pattern, RuleSeverity, PatternRule } from '../knowledge-base/types.js';

/**
 * Context source enum
 */
export enum ContextSource {
  SCHEMAS = 'schemas',
  PATTERNS = 'patterns',
  SECURITY_RULES = 'security_rules',
  USER_DEFINED = 'user_defined',
}

/**
 * Type for naming the context
 */
export type ContextName = string;

/**
 * Interface for the context data
 */
export interface ContextData {
  /** Name of the context */
  name: ContextName;
  /** Source of the context */
  source: ContextSource;
  /** Content of the context */
  content: string;
  /** Importance/relevance score (0-1) */
  relevanceScore?: number;
  /** Context format (e.g., 'json', 'text', 'code') */
  format?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Options for context retrieval
 */
export interface ContextRetrievalOptions {
  /** Maximum contexts to retrieve */
  maxContexts?: number;
  /** Include patterns */
  includePatterns?: boolean;
  /** Include schemas */
  includeSchemas?: boolean;
  /** Include security rules */
  includeSecurityRules?: boolean;
  /** Include only specific schemas */
  schemaIds?: string[];
  /** Include only specific patterns */
  patternIds?: string[];
  /** Specific domain to focus on */
  domain?: string;
  /** Relevant table names */
  tableNames?: string[];
}

/**
 * Default context retrieval options
 */
const DEFAULT_CONTEXT_OPTIONS: ContextRetrievalOptions = {
  maxContexts: 10,
  includePatterns: true,
  includeSchemas: true,
  includeSecurityRules: true,
};

/**
 * InstaBids architectural patterns
 */
export const INSTABIDS_PATTERNS = {
  // Authentication pattern
  AUTH_ID_PATTERN: {
    name: 'Auth ID Relationship Pattern',
    description: 'Every user-related table must have an auth_id or user_id field that links to the auth.users table, and access must be restricted based on this relationship.',
    rules: [
      'All user data tables must have a user_id or auth_id column',
      'Row level security policies must check auth.uid() = user_id for all user data',
      'Profiles can only be accessed by their owners or through explicit sharing mechanisms',
      'Any query accessing user data must include an auth ID check'
    ],
    importance: 'critical'
  },
  
  // Domain boundaries pattern
  DOMAIN_BOUNDARY_PATTERN: {
    name: 'Domain Boundary Pattern',
    description: 'Services should respect domain boundaries and not directly access data from other domains except through defined interfaces.',
    rules: [
      'Bidding services should not directly modify project tables',
      'Messaging services should not directly modify user profiles',
      'Cross-domain operations should use events and dedicated handlers'
    ],
    importance: 'high'
  },
  
  // Event-driven communication pattern
  EVENT_DRIVEN_PATTERN: {
    name: 'Event-Driven Communication Pattern',
    description: 'Cross-domain coordination should use events rather than direct dependencies.',
    rules: [
      'Use database triggers or server-side events for cross-domain effects',
      'Event handlers should be idempotent',
      'Events should include all necessary context in their payload'
    ],
    importance: 'high'
  },
  
  // Secure data access pattern
  SECURE_DATA_ACCESS_PATTERN: {
    name: 'Secure Data Access Pattern',
    description: 'All data access must be properly authorized and filtered based on user role and permissions.',
    rules: [
      'Homeowners can only see their own projects and related bids',
      'Contractors can only see bids they\'ve submitted or bid cards available to them',
      'Admin operations must be explicitly marked as admin-only',
      'Multi-tenant data must be filtered by tenant ID'
    ],
    importance: 'critical'
  }
};

/**
 * Context Manager for the LLM Sandwich Architecture
 */
export class ContextManager {
  private knowledgeRepository: KnowledgeRepositoryService;
  private cachedSchemas: Map<string, Schema> = new Map();
  private cachedPatterns: Map<string, Pattern> = new Map();
  private customContexts: Map<ContextName, ContextData> = new Map();
  
  /**
   * Create a new Context Manager
   */
  constructor(knowledgeRepository: KnowledgeRepositoryService) {
    this.knowledgeRepository = knowledgeRepository;
  }
  
  /**
   * Initialize the context manager
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize repository if needed
      await this.knowledgeRepository.initialize();
      
      // Load core patterns
      await this.loadBuiltInPatterns();
      
      // Cache schemas and patterns for faster access
      await this.refreshSchemaCache();
      await this.refreshPatternCache();
    } catch (error) {
      console.error('Failed to initialize context manager:', error);
      throw error;
    }
  }
  
  /**
   * Load built-in patterns
   */
  private async loadBuiltInPatterns(): Promise<void> {
    // Convert built-in patterns to Pattern objects and add to repository
    for (const [id, patternData] of Object.entries(INSTABIDS_PATTERNS)) {
      const pattern: Pattern = {
        id,
        name: patternData.name,
        description: patternData.description,
        usage: `This pattern should be followed by all ${patternData.importance === 'critical' ? 'components without exception' : 'components when possible'}`,
        example: '',
        required: patternData.importance === 'critical',
        dependencies: [],
        components: [],
        templates: [],
        rules: patternData.rules.map(rule => ({
          description: rule,
          severity: patternData.importance === 'critical' ? RuleSeverity.ERROR : RuleSeverity.WARNING,
        })),
      };
      
      await this.knowledgeRepository.addPattern(pattern);
    }
  }
  
  /**
   * Refresh schema cache
   */
  private async refreshSchemaCache(): Promise<void> {
    const schemas = await this.knowledgeRepository.getAllSchemas();
    this.cachedSchemas.clear();
    
    for (const schema of schemas) {
      this.cachedSchemas.set(schema.id, schema);
    }
  }
  
  /**
   * Refresh pattern cache
   */
  private async refreshPatternCache(): Promise<void> {
    const patterns = await this.knowledgeRepository.getAllPatterns();
    this.cachedPatterns.clear();
    
    for (const pattern of patterns) {
      this.cachedPatterns.set(pattern.id, pattern);
    }
  }
  
  /**
   * Add a custom context
   */
  public addCustomContext(context: ContextData): void {
    this.customContexts.set(context.name, context);
  }
  
  /**
   * Remove a custom context
   */
  public removeCustomContext(name: ContextName): boolean {
    return this.customContexts.delete(name);
  }
  
  /**
   * Clear all custom contexts
   */
  public clearCustomContexts(): void {
    this.customContexts.clear();
  }
  
  /**
   * Get all custom contexts
   */
  public getCustomContexts(): ContextData[] {
    return Array.from(this.customContexts.values());
  }
  
  /**
   * Get schema by ID
   */
  public async getSchema(id: string): Promise<Schema | undefined> {
    if (this.cachedSchemas.has(id)) {
      return this.cachedSchemas.get(id);
    }
    
    const schema = await this.knowledgeRepository.getSchema(id);
    if (schema) {
      this.cachedSchemas.set(id, schema);
    }
    
    return schema;
  }
  
  /**
   * Get pattern by ID
   */
  public async getPattern(id: string): Promise<Pattern | undefined> {
    if (this.cachedPatterns.has(id)) {
      return this.cachedPatterns.get(id);
    }
    
    const pattern = await this.knowledgeRepository.getPattern(id);
    if (pattern) {
      this.cachedPatterns.set(id, pattern);
    }
    
    return pattern;
  }
  
  /**
   * Get relevant context based on options
   */
  public async getRelevantContext(
    options: Partial<ContextRetrievalOptions> = {}
  ): Promise<ContextData[]> {
    const config = { ...DEFAULT_CONTEXT_OPTIONS, ...options };
    const contexts: ContextData[] = [];
    
    // Add custom contexts
    this.customContexts.forEach(context => {
      contexts.push(context);
    });
    
    // Add pattern contexts
    if (config.includePatterns) {
      const patterns = config.patternIds?.length
        ? await Promise.all(config.patternIds.map(id => this.getPattern(id)))
        : await this.knowledgeRepository.getAllPatterns();
      
      for (const pattern of patterns.filter(Boolean) as Pattern[]) {
        contexts.push({
          name: pattern.name,
          source: ContextSource.PATTERNS,
          content: this.formatPatternAsContext(pattern),
          format: 'text',
          metadata: { patternId: pattern.id, required: pattern.required },
        });
      }
    }
    
    // Add schema contexts
    if (config.includeSchemas) {
      let schemas: (Schema | undefined)[];
      
      if (config.schemaIds?.length) {
        schemas = await Promise.all(config.schemaIds.map(id => this.getSchema(id)));
      } else if (config.tableNames?.length) {
        const allSchemas = await this.knowledgeRepository.getAllSchemas();
        schemas = allSchemas.filter(schema => 
          config.tableNames?.includes(schema.name)
        );
      } else if (config.domain) {
        const allSchemas = await this.knowledgeRepository.getAllSchemas();
        schemas = allSchemas.filter(schema => 
          schema.metadata?.domain === config.domain
        );
      } else {
        schemas = await this.knowledgeRepository.getAllSchemas();
      }
      
      for (const schema of schemas.filter(Boolean) as Schema[]) {
        contexts.push({
          name: `Schema: ${schema.name}`,
          source: ContextSource.SCHEMAS,
          content: this.formatSchemaAsContext(schema),
          format: 'json',
          metadata: { schemaId: schema.id, schemaType: schema.type },
        });
      }
    }
    
    // Add security rule contexts
    if (config.includeSecurityRules) {
      // Add RLS policies context
      contexts.push({
        name: 'Row Level Security Policies',
        source: ContextSource.SECURITY_RULES,
        content: this.getRLSPoliciesContext(),
        format: 'text',
        metadata: { type: 'rls_policies' },
      });
    }
    
    // Sort contexts by relevance and limit to max
    return this.sortContextsByRelevance(contexts, config.maxContexts || DEFAULT_CONTEXT_OPTIONS.maxContexts!);
  }
  
  /**
   * Format pattern as context string
   */
  private formatPatternAsContext(pattern: Pattern): string {
    const rulesText = pattern.rules
      .map(rule => `- ${rule.description} (Severity: ${rule.severity})`)
      .join('\n');
    
    return `Pattern: ${pattern.name}
Description: ${pattern.description}
Required: ${pattern.required ? 'Yes' : 'No'}
Rules:
${rulesText}`;
  }
  
  /**
   * Format schema as context string
   */
  private formatSchemaAsContext(schema: Schema): string {
    return JSON.stringify(schema, null, 2);
  }
  
  /**
   * Get RLS policies context
   */
  private getRLSPoliciesContext(): string {
    return `
Row Level Security (RLS) Policies for InstaBids:

1. User Authentication Pattern:
   - Users can only access their own profile data
   - RLS policy: auth.uid() = user_id
   - Applied to: homeowners, contractors, property_managers, labor_helpers

2. Bidding Security Rules:
   - Contractors can only see bid cards that match their service areas and types
   - Contractors can only see their own submitted bids
   - Homeowners can only see bids on their own projects
   - RLS policy examples:
     - bid_cards: auth.uid() IN (SELECT user_id FROM contractors WHERE service_areas && bid_cards.service_areas)
     - bids: auth.uid() = contractor_id OR auth.uid() IN (SELECT creator_id FROM bid_cards WHERE id = bids.bid_card_id)

3. Project Security Rules:
   - Projects are only visible to the homeowner and assigned contractor
   - Property managers can only see projects for properties they manage
   - RLS policy examples:
     - projects: auth.uid() = homeowner_id OR auth.uid() = contractor_id

4. Messaging Security Rules:
   - Users can only see conversations they are participants in
   - RLS policy examples:
     - conversations: auth.uid() IN (SELECT user_id FROM conversation_participants WHERE conversation_id = conversations.id)
     - messages: auth.uid() IN (SELECT user_id FROM conversation_participants WHERE conversation_id = messages.conversation_id)

5. Payment Security Rules:
   - Users can only see payment transactions they are involved in
   - RLS policy examples:
     - payments: auth.uid() = payer_id OR auth.uid() = payee_id
`;
  }
  
  /**
   * Sort contexts by relevance and limit to max
   */
  private sortContextsByRelevance(
    contexts: ContextData[],
    maxContexts: number
  ): ContextData[] {
    // Sort contexts by relevance score (if available) and then by source priority
    return contexts
      .sort((a, b) => {
        // First by explicit relevance score
        if (a.relevanceScore !== undefined && b.relevanceScore !== undefined) {
          return b.relevanceScore - a.relevanceScore;
        }
        
        // Then by source priority
        const sourcePriority = {
          [ContextSource.SECURITY_RULES]: 4,
          [ContextSource.PATTERNS]: 3,
          [ContextSource.SCHEMAS]: 2,
          [ContextSource.USER_DEFINED]: 1,
        };
        
        return (
          (sourcePriority[b.source] || 0) - (sourcePriority[a.source] || 0)
        );
      })
      .slice(0, maxContexts);
  }
  
  /**
   * Format all context as a single string for the LLM prompt
   */
  public formatContextsForPrompt(contexts: ContextData[]): string {
    if (contexts.length === 0) {
      return '';
    }
    
    const formattedContexts = contexts.map(context => {
      let header = `### ${context.name} (${context.source})`;
      if (context.format) {
        header += ` [${context.format}]`;
      }
      
      return `${header}\n\n${context.content}`;
    });
    
    return `
----- CONTEXT -----

${formattedContexts.join('\n\n')}

----- END OF CONTEXT -----
`;
  }
  
  /**
   * Build a context-enriched prompt for the LLM
   */
  public async buildContextualPrompt(
    basePrompt: string,
    contextOptions: Partial<ContextRetrievalOptions> = {}
  ): Promise<string> {
    const contexts = await this.getRelevantContext(contextOptions);
    const contextString = this.formatContextsForPrompt(contexts);
    
    return `${contextString}

${basePrompt}`;
  }
}
