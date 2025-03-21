/**
 * Base Domain Agent for the LLM Domain Layer
 * 
 * This module defines the base class for all domain-specific agents in the LLM
 * Sandwich Architecture. Domain agents encapsulate business logic for specific
 * domains and interact with the database through the DatabaseAgentProxy.
 */

import { databaseAgentProxy, QueryIntent, QueryIntentType, QueryResult } from '../guard/database-agent-proxy.js';
import { llmClient, LLMCompletionRequest } from '../../integration/llm-client.js';
import { contextManager, ContextType } from '../../integration/context-manager.js';

/**
 * The response from a domain agent operation
 */
export interface DomainAgentResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  explanation?: string;
}

/**
 * Base class for all domain agents in the LLM Sandwich Architecture
 */
export abstract class DomainAgent {
  protected authId?: string;
  protected entityType: string;
  
  constructor(authId?: string) {
    this.authId = authId;
    this.entityType = this.getEntityType();
  }
  
  /**
   * Get the entity type for this domain agent
   */
  protected abstract getEntityType(): string;
  
  /**
   * Get the domain name for this agent
   */
  protected abstract getDomain(): string;
  
  /**
   * Get the user's profile for this domain
   */
  protected async getProfile<T>(): Promise<QueryResult<T>> {
    if (!this.authId) {
      return {
        data: null,
        error: 'No authentication ID provided',
        explanation: 'User must be authenticated to access profile'
      };
    }
    
    return await databaseAgentProxy.getProfileByAuthId<T>(this.authId);
  }
  
  /**
   * Execute a database operation with intent
   */
  protected async executeDatabase<T>(intent: Partial<QueryIntent>): Promise<QueryResult<T>> {
    // Fill in common fields
    const fullIntent: QueryIntent = {
      type: intent.type || QueryIntentType.SELECT,
      description: intent.description || 'Domain agent database operation',
      tables: intent.tables || [],
      authId: this.authId,
      entityType: this.entityType,
      filters: intent.filters,
      data: intent.data,
      options: intent.options
    };
    
    return await databaseAgentProxy.execute<T>(fullIntent);
  }
  
  /**
   * Use LLM to make a domain-specific decision
   */
  protected async useLLM<T>(
    userPrompt: string,
    systemContext?: string,
    options?: {
      temperature?: number;
      contextTypes?: ContextType[];
      tableOrDomain?: string;
      patternName?: string;
    }
  ): Promise<string> {
    // Gather context
    const contextTypes = options?.contextTypes || [
      ContextType.ID_RELATIONSHIP,
      ContextType.PATTERNS
    ];
    
    if (!contextTypes.includes(ContextType.SCHEMA) && this.getDomain()) {
      contextTypes.push(ContextType.SCHEMA);
    }
    
    const context = await contextManager.generateContext(contextTypes, {
      entityType: this.entityType,
      tableOrDomain: options?.tableOrDomain || this.getDomain(),
      patternName: options?.patternName,
      maxLength: 2000 // Limit context size
    });
    
    // Construct system prompt with context
    const systemPrompt = `
    You are a domain expert for ${this.getDomain()} in the InstaBids platform.
    You are responsible for making smart decisions and recommendations based on domain-specific knowledge.
    
    ${systemContext || ''}
    
    CONTEXT:
    ${context}
    `;
    
    const request: LLMCompletionRequest = {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    };
    
    // Get response from LLM
    const llmResponse = await llmClient.complete(request, {
      temperature: options?.temperature ?? 0.3
    });
    
    return llmResponse.content;
  }
  
  /**
   * Format a response from this domain agent
   */
  protected formatResponse<T>(
    result: QueryResult<T> | null | undefined,
    explanation?: string
  ): DomainAgentResponse<T> {
    if (!result) {
      return {
        success: false,
        error: 'Operation failed',
        explanation: explanation || 'No result returned from operation'
      };
    }
    
    return {
      success: !result.error,
      data: result.data || undefined,
      error: result.error || undefined,
      explanation: explanation || result.explanation
    };
  }
}
