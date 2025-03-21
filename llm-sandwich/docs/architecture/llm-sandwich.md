# LLM Sandwich Architecture for InstaBids

This document outlines the LLM Sandwich Architecture implemented for the InstaBids platform, including its core components, layers, and unique capabilities.

## Architecture Overview

The LLM Sandwich Architecture provides a three-layer approach to AI-powered systems:

```
┌───────────────────────────────────────────────────┐
│ LLM GUARD LAYER: DatabaseAgentProxy               │
│ • Dynamically enforces architectural patterns     │
│ • Adapts to new patterns without code changes     │
│ • Provides intelligent error recovery             │
└───────────────────────────────────────────────────┘
                      ↑ ↓
┌───────────────────────────────────────────────────┐
│ DOMAIN LAYER: Domain Agents                       │
│ • Domain-specific business logic                  │
│ • UI component implementation                     │
│ • User interaction flows                          │
└───────────────────────────────────────────────────┘
                      ↑ ↓
┌───────────────────────────────────────────────────┐
│ LLM PERSISTENCE LAYER: DataInterface              │
│ • Intelligent query construction                  │
│ • Schema awareness and optimization               │
│ • Adaptive data modeling                          │
└───────────────────────────────────────────────────┘
```

## Core Components

### Knowledge Base

The knowledge base extracts and stores:
- Database schemas from SQL definitions
- Architectural patterns from documentation
- ID relationship patterns (critical for user authentication)

These components provide the LLM with the necessary context to make intelligent decisions about database operations and business logic.

### Integration Components

- **LLM Client**: Handles interactions with large language models through OpenRouter
- **Context Manager**: Provides relevant context to the LLM, including schemas and patterns

### Guard Layer

The DatabaseAgentProxy serves as the top layer of the sandwich, enforcing architectural patterns at runtime:

- Intercepts database operations
- Validates them against known patterns (especially ID relationships)
- Ensures queries follow established rules
- Provides intelligent error handling

Example usage:

```typescript
// Execute a query with intent
const result = await databaseAgentProxy.execute({
  type: QueryIntentType.SELECT,
  description: 'Get contractor profile',
  tables: ['profiles'],
  authId: 'auth_123', // Current user's auth ID
  entityType: 'contractor',
  filters: { user_type: 'contractor' }
});
```

### Domain Layer

Domain agents encapsulate business logic for specific domains:

- **Base Domain Agent**: Abstract class with common functionality
- **Bidding Agent**: Handles bid creation, evaluation, and management

Key features:
- Profile verification for ID relationship pattern
- Intelligent operation execution
- LLM-based decision making (e.g., bid evaluation)

Example usage:

```typescript
// Create a bidding agent for the current user
const biddingAgent = new BiddingAgent('auth_123');

// Create a new bid
const bidResult = await biddingAgent.createBid({
  project_id: 'project_123',
  amount: 5000,
  description: 'Complete kitchen renovation',
  timeline_days: 30
});

// Evaluate bids for a project
const evaluationResult = await biddingAgent.evaluateBids('project_123', {
  priceFactor: 0.5,
  timelineFactor: 0.3,
  ratingFactor: 0.2
});
```

### Persistence Layer

The DataInterface forms the bottom layer, providing intelligent database access:

- Dynamically extracts schema information
- Builds optimized queries
- Verifies data against schema
- Generates queries from natural language intent

Example usage:

```typescript
// Execute a database operation
const projects = await dataInterface.executeOperation(
  'projects',
  DatabaseOperation.SELECT,
  {
    filters: { homeowner_id: 'profile_123' },
    orderBy: 'created_at',
    orderDirection: 'desc'
  }
);

// Generate a query from natural language intent
const queryParams = await dataInterface.generateQueryFromIntent(
  'Find all active projects created in the last week',
  'homeowner',
  'auth_123'
);
```

## Key Innovations

1. **Intent-Based vs. Implementation-Based Development**: Components express what they want accomplished (intent) rather than how to do it (implementation). This is seen in the QueryIntent approach and natural language query generation.

2. **Dynamic Pattern Enforcement**: Architectural patterns are enforced at runtime by the DatabaseAgentProxy, which can adapt to new patterns without code changes.

3. **Knowledge Transfer Through Explanation**: New patterns can be implemented by explaining them to the system rather than coding them, through the context management system.

4. **Adaptive Domain Logic**: Business rules evolve through learning rather than coding, as demonstrated in the bid evaluation feature.

5. **Runtime Architectural Guardrails**: Critical patterns (like the auth.id = profile.id relationship) are maintained through intelligent enforcement.

## Integration with InstaBids

This architecture integrates with InstaBids by:

1. **Enforcing ID Relationships**: Ensuring that users can only access their own data
2. **Providing Domain-Specific Agents**: For bidding, projects, messaging, etc.
3. **Enabling Natural Language Queries**: For complex data operations
4. **Maintaining Architectural Patterns**: Across the entire system

## Extension Points

The architecture can be extended by:

1. **Adding New Domain Agents**: For additional business domains
2. **Expanding Knowledge Base**: With more patterns and schemas
3. **Creating New LLM Prompts**: For specialized tasks
4. **Implementing Additional Layers**: For specific concerns

## Conclusion

The LLM Sandwich Architecture provides a robust foundation for the InstaBids platform, combining the power of large language models with solid architectural principles. It enables more flexible, maintainable, and intelligent software development while enforcing critical patterns and constraints.
