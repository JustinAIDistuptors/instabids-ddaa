# InstaBids Domain-Driven Agent Architecture (DDAA)

This repository contains the implementation of the Domain-Driven Agent Architecture (DDAA) for the InstaBids contractor bidding platform. DDAA is a pattern that combines principles from Domain-Driven Design (DDD) with autonomous agents to create a robust, modular, and type-safe architecture for complex applications.

## Architecture Overview

DDAA implements a "sandwich" architecture with three primary layers for each domain:

### 1. Guard Layer (Top Slice)
- Enforces architectural patterns and constraints
- Validates intent operations before they reach the domain layer
- Provides permission checks and access control
- Implements post-execution hooks and transforms

### 2. Domain Layer (Middle Slice)
- Contains domain-specific business logic and operations
- Handles events and state transitions
- Provides operations exposed to other domains and systems
- Encapsulates domain expertise and rules

### 3. Persistence Layer (Bottom Slice)
- Handles data access and storage
- Abstracts away database implementation details
- Provides a consistent interface for data operations
- Maintains schema separation between domains

## Key Concepts

### Domain Agent
A domain agent is responsible for a specific bounded context and exposes well-defined operations via intents. The agent contains all three layers of the sandwich architecture and orchestrates their interaction.

### Intent-Driven Operations
Operations in DDAA are performed by fulfilling intents. An intent is a structured request containing:
- An operation name
- Operation parameters
- Context information (user, session, etc.)

### Pattern Enforcement
The guard layer enforces domain-specific architectural patterns, ensuring operations conform to established constraints. This prevents accidental breakage of architectural boundaries.

## Project Structure

```
instabids-ddaa/
├── database/               # Database schema files
│   ├── 01_core_schema_setup.sql
│   ├── 02_core_tables.sql
│   ├── 03_user_management_schema.sql
│   └── 04_bidding_schema.sql
├── src/
│   ├── core/               # Core framework components
│   │   ├── domain/         # Base domain agent classes
│   │   ├── guard/          # Base guard layer classes
│   │   └── persistence/    # Base persistence classes
│   ├── domains/            # Domain-specific implementations
│   │   ├── bidding/        # Bidding domain implementation
│   │   │   ├── bidding-agent.ts          # Bidding domain agent
│   │   │   ├── bidding-guard.ts          # Bidding guard layer
│   │   │   ├── bidding-data-interface.ts # Bidding persistence layer
│   │   │   └── bidding-factory.ts        # Factory for creating bidding components
│   │   └── ...             # Other domains
│   └── examples/           # Example implementations and demos
│       └── bidding-demo.ts # Demonstration of bidding domain usage
└── README.md               # This file
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account for persistence (or another compatible database)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/instabids-ddaa.git
cd instabids-ddaa
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
Create a `.env` file in the root directory with your Supabase credentials:
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

### Running the Demo

```bash
npx ts-node src/examples/bidding-demo.ts
```

## Usage Example

Here's a simplified example of how to use the bidding domain agent:

```typescript
import { DomainAgentContext, DomainIntent } from './src/core/domain/domain-agent';
import { BiddingFactory } from './src/domains/bidding/bidding-factory';

// Create a domain context
const context: DomainAgentContext = {
  userId: 'user-123',
  userRole: 'homeowner',
  timestamp: Date.now()
};

// Create a bidding factory and agent
const factory = new BiddingFactory();
const biddingAgent = factory.createAgent(context);

// Define an intent to create a bid card
const createBidCardIntent: DomainIntent = {
  operation: 'createBidCard',
  params: {
    title: 'Kitchen Renovation',
    description: 'Complete kitchen renovation',
    job_category_id: 'cat-123',
    job_type_id: 'type-456',
    location: { address: '123 Main St' },
    zip_code: '94105'
  }
};

// Fulfill the intent
async function createBidCard() {
  const result = await biddingAgent.fulfillIntent(createBidCardIntent);
  
  if (result.success) {
    console.log('Bid card created:', result.data);
  } else {
    console.error('Error creating bid card:', result.error, result.message);
  }
}

createBidCard();
```

## Benefits of DDAA

1. **Clear Domain Boundaries**: Each domain is isolated with well-defined interfaces, preventing unwanted coupling.

2. **Type Safety**: Strong TypeScript types ensure consistent interfaces across domain boundaries.

3. **Pattern Enforcement**: Architectural patterns are enforced at runtime, preventing common mistakes.

4. **Evolvability**: Domains can evolve independently without affecting other parts of the system.

5. **Testability**: Each layer can be tested in isolation, making unit testing easier.

6. **Scalability**: Domain boundaries align with team boundaries, allowing parallel development.

## Future Work

- Implement additional domains (User Management, Project Management, Messaging)
- Add support for real-time notifications
- Enhance pattern enforcement
- Add observability and telemetry support

## License

MIT License
