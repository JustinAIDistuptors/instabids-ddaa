/**
 * LLM Sandwich Architecture - Main Export
 * 
 * This is the main entry point for the LLM Sandwich Architecture, which provides
 * a three-layer approach to AI-powered systems:
 * 
 * 1. LLM Guard Layer (top) - Enforces architectural patterns
 * 2. Domain Layer (middle) - Implements domain-specific business logic
 * 3. LLM Persistence Layer (bottom) - Provides intelligent database access
 */

// Export the context manager
export { contextManager, ContextType } from './integration/context-manager.js';

// Export the LLM client
export { llmClient, LLMRequestOptions, LLMCompletionRequest, LLMResponse } from './integration/llm-client.js';

// Export the Guard Layer (Database Agent Proxy)
export {
  databaseAgentProxy,
  ValidationStatus,
  QueryIntentType,
  QueryIntent,
  QueryResult
} from './layers/guard/database-agent-proxy.js';

// Export the Domain Layer
export { DomainAgent, DomainAgentResponse } from './layers/domain/domain-agent.js';
export { BiddingAgent, Bid, Project, BidEvaluationCriteria } from './layers/domain/bidding-agent.js';

// Export the Persistence Layer
export {
  dataInterface,
  DatabaseOperation,
  OperationResult,
  QueryOptions,
  SchemaInfo
} from './layers/persistence/data-interface.js';

// Knowledge Base Types
export * from './knowledge-base/types.js';
