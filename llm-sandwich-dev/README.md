# LLM Sandwich Architecture for InstaBids

This repository contains an implementation of the LLM Sandwich Architecture for the InstaBids contractor bidding platform. The architecture provides a powerful approach to combining LLMs with traditional software development, enabling pattern enforcement, schema awareness, and intelligent domain logic.

## Architecture Overview

The LLM Sandwich Architecture consists of three key layers:

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

### Key Components

1. **Knowledge Base** - Extracts and manages:
   - Database schemas from SQL definitions
   - Architectural patterns from documentation
   - ID relationship patterns for security

2. **Guard Layer (DatabaseAgentProxy)** - The "top bread" of the sandwich:
   - Enforces architectural patterns
   - Validates operations against security rules
   - Provides intelligent error recovery

3. **Domain Layer (BiddingAgent, etc.)** - The "filling" of the sandwich:
   - Implements domain-specific business logic
   - Provides high-level domain operations
   - Uses the guard layer for database access

4. **Persistence Layer (DataInterface)** - The "bottom bread" of the sandwich:
   - Provides schema-aware database operations
   - Dynamically generates optimized queries
   - Validates data against schemas

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm or yarn
- Access to an LLM provider (OpenAI, Anthropic, or OpenRouter)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-organization/llm-sandwich-dev.git
   cd llm-sandwich-dev
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` to add your LLM API key and other configuration.

4. Build the project:
   ```bash
   npm run build
   ```

5. Run tests:
   ```bash
   npm test
   ```

## Usage

### Initializing the Architecture

```typescript
// Create knowledge repository
const knowledgeRepository = new KnowledgeRepositoryService({
  storageType: 'memory' // or 'file' with a path
});
await knowledgeRepository.initialize();

// Initialize context manager
const contextManager = new ContextManager(knowledgeRepository);
await contextManager.initialize();

// Create LLM client
const llmClient = new LLMClient({
  provider: LLMProvider.OPENAI,
  apiKey: process.env.LLM_API_KEY!,
  defaultModel: 'gpt-4-turbo'
});

// Create data interface
const dataInterface = new DataInterface({
  dbClient: yourDatabaseClient,
  contextManager,
  llmClient
});

// Create database agent proxy
const databaseProxy = new DatabaseAgentProxy({
  dataInterface,
  contextManager,
  llmClient
});
await databaseProxy.initialize();

// Create domain agents
const biddingAgent = new BiddingAgent(
  userId,
  databaseProxy,
  'contractor', // or 'homeowner'
  llmClient
);
```

### Using the BiddingAgent

```typescript
// Create a bid (as a contractor)
const bidId = await biddingAgent.createBid({
  project_id: 'project-123',
  amount: 15000,
  description: 'Complete kitchen renovation including cabinets and countertops',
  timeline_days: 30,
  services: ['cabinets', 'countertops', 'plumbing'],
  materials_included: true
});

// Get bids for a project
const bids = await biddingAgent.getBidsForProject('project-123');

// Accept a bid (as a homeowner)
await biddingAgent.acceptBid('bid-123');

// Evaluate bids using LLM (as a homeowner)
const evaluatedBids = await biddingAgent.evaluateBids('project-123', {
  priceFactor: 0.4,
  timelineFactor: 0.3,
  ratingFactor: 0.3
});
```

## Architecture in Practice

### Intent-Based Queries

The architecture supports intent-based queries, where you describe what you want to do in natural language:

```typescript
const query = await databaseProxy.createQuery(
  "Find all active projects created in the last week",
  "homeowner",
  userId
);

const results = await databaseProxy.execute(query);
```

### Pattern Enforcement

The guard layer enforces architectural patterns automatically:

```typescript
// This will throw an error if it violates the auth ID pattern
const result = await databaseProxy.execute({
  type: QueryIntentType.SELECT,
  description: 'Get all projects',
  tables: ['projects'],
  // Missing authId field would cause an error
});

// This will properly enforce the auth ID pattern
const result = await databaseProxy.execute({
  type: QueryIntentType.SELECT,
  description: 'Get my projects',
  tables: ['projects'],
  authId: userId,
  entityType: 'homeowner',
  filters: { homeowner_id: userId }
} as SelectQueryIntent);
```

## Project Structure

- `src/knowledge-base/` - Knowledge extraction and storage
- `src/integration/` - Integration components (LLM client, context manager)
- `src/layers/` - The three layers of the sandwich architecture
  - `src/layers/guard/` - The guard layer (top bread)
  - `src/layers/domain/` - The domain layer (filling)
  - `src/layers/persistence/` - The persistence layer (bottom bread)
- `tests/` - Test suites

## Key Innovations

1. **Intent-Based vs. Implementation-Based Development**: Components express what they want accomplished (intent) rather than how to do it (implementation).

2. **Dynamic Pattern Enforcement**: Architectural patterns are enforced at runtime by the DatabaseAgentProxy.

3. **Knowledge Transfer Through Explanation**: New patterns can be implemented by explaining them to the system.

4. **Adaptive Domain Logic**: Business rules evolve through learning rather than coding.

5. **Runtime Architectural Guardrails**: Critical patterns are maintained through intelligent enforcement.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
