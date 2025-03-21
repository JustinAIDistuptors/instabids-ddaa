# InstaBids Domain-Driven Agent Architecture (DDAA)

This repository implements a Domain-Driven Agent Architecture for the InstaBids platform, a contractor bidding marketplace. The architecture focuses on creating robust, maintainable domain boundaries with clear interfaces using the intent-driven approach.

## Architecture Overview

The Domain-Driven Agent Architecture (DDAA) is a pattern that combines elements of:
- Domain-Driven Design
- Actor model for state encapsulation
- Intent-driven interfaces
- Pattern-based architectural enforcement

The architecture is organized as a "sandwich" with three layers:

```
┌─────────────────────────────────────┐
│             Guard Layer             │ ← Enforces patterns & validates input
├─────────────────────────────────────┤
│           Domain Agent Layer        │ ← Contains business logic
├─────────────────────────────────────┤
│           Data Interface Layer      │ ← Abstracts persistence
└─────────────────────────────────────┘
```

### Key Components

1. **Guard Layer**: Validates inputs, enforces architectural patterns, and provides security checks
2. **Domain Agent Layer**: Implements business logic with an intent-based interface
3. **Data Interface Layer**: Abstracts the persistence layer and provides domain-specific data operations
4. **Event Bus**: Facilitates cross-domain communication through events
5. **Pattern Registry**: Centralizes architectural pattern enforcement

## Core Concepts

### Intent-Driven Interfaces

Instead of exposing direct method calls, domains expose "intents" that represent actions to be performed. An intent includes:

- A name (e.g., `submitBid`, `acceptBid`)
- Parameters needed to fulfill the intent
- Metadata (user ID, correlation ID, etc.)

Benefits:
- Uniform validation
- Consistent logging and monitoring
- Decoupling from implementation details
- Self-documenting APIs

### Architectural Pattern Enforcement

The architecture includes a pattern registry that defines and enforces architectural patterns across domains. This ensures consistency and prevents architectural drift.

Examples:
- Data segregation patterns
- Cross-domain communication patterns
- Authorization patterns
- Error handling patterns

### Domain Events for Cross-Domain Communication

Domains communicate with each other through events rather than direct method calls. This:

- Maintains domain boundaries
- Enables loose coupling
- Allows for event sourcing
- Simplifies scaling and distribution

## Bidding Domain Implementation

This repository includes a comprehensive implementation of the Bidding domain with the following:

### Domain Entities & Value Objects
- Bid
- BidStatus
- BidVisibility

### Intents
- `submitBid`: Submit a new bid for a project
- `updateBid`: Update an existing bid
- `withdrawBid`: Withdraw a submitted bid
- `acceptBid`: Accept a bid (homeowner)
- `rejectBid`: Reject a bid (homeowner)
- `counterBid`: Propose a counter to an existing bid
- `getBid`: Get details of a specific bid
- `listBids`: List bids for a project or by a contractor
- `getBidStats`: Get statistics about bids for a project
- `createGroupBid`: Create a group bid with multiple contractors
- `joinGroupBid`: Join an existing group bid

### Events
- `bidding:bid_submitted`: Emitted when a bid is submitted
- `bidding:bid_updated`: Emitted when a bid is updated
- `bidding:bid_withdrawn`: Emitted when a bid is withdrawn
- `bidding:bid_accepted`: Emitted when a bid is accepted
- `bidding:bid_rejected`: Emitted when a bid is rejected

### Patterns
- `COMPLETE_BID_DATA`: Ensures a bid has all required fields
- `VALID_BID_AMOUNT`: Ensures bid amount is within acceptable range
- `ONE_ACTIVE_BID_PER_PROJECT`: Ensures a contractor can only have one active bid per project
- `NO_MODIFY_ACCEPTED_BID`: Ensures a bid cannot be modified after it's been accepted
- `BID_BEFORE_DEADLINE`: Ensures a bid cannot be submitted after project deadline
- `BID_OWNER_ONLY`: Ensures only the bid owner can modify their bid

## Getting Started

### Prerequisites

- Node.js 16+
- TypeScript

### Installation

```bash
npm install
```

### Building

```bash
npm run build
```

### Running the Example

```bash
npm run example
```

This will run the bidding example, which demonstrates the following:
1. Creating a bid
2. Retrieving the bid
3. Accepting the bid
4. Cross-domain communication through events

## Project Structure

```
instabids-ddaa-architecture/
├── src/
│   ├── core/                  # Core architectural components
│   │   ├── domain/            # Domain agent abstractions
│   │   ├── guard/             # Guard layer abstractions
│   │   ├── persistence/       # Data interface abstractions
│   │   ├── events/            # Event bus implementation
│   │   └── patterns/          # Pattern registry
│   ├── domains/               # Domain implementations
│   │   └── bidding/           # Bidding domain
│   │       ├── bidding-agent.ts        # Domain logic
│   │       ├── bidding-data-interface.ts # Persistence abstractions
│   │       ├── bidding-guard.ts        # Validation and pattern enforcement
│   │       └── bidding-factory.ts      # Factory for creating domain components
│   └── examples/              # Usage examples
└── dist/                      # Compiled output
```

## Benefits of DDAA

1. **Maintainability**
   - Clear domain boundaries
   - Enforced architectural patterns
   - Explicit, intent-based interfaces

2. **Adaptability**
   - Domain logic isolated from infrastructure concerns
   - Easy to change persistence implementations
   - Event-driven communication enables flexible integrations

3. **Testability**
   - Each layer can be tested independently
   - Intents provide clear test boundaries
   - Patterns enforce testable architecture

4. **Security**
   - Centralized validation in guard layer
   - Explicit permission checking
   - Auditable intent trail

## Extending the Architecture

### Adding a New Domain

1. Define domain entities and value objects
2. Create a data interface for the domain
3. Implement the guard layer with domain-specific validations
4. Implement the domain agent with intent handlers
5. Create a factory to wire up the components
6. Subscribe to relevant events from other domains

### Adding New Patterns

1. Define the pattern in a domain's guard layer or in a shared pattern registry
2. Implement the validation logic
3. Apply the pattern to relevant intents
4. Add tests to verify the pattern is enforced

## Future Improvements

- **Distributed Event Bus**: Replace the in-memory event bus with a distributed solution (Kafka, Redis, etc.)
- **Persistent Pattern Registry**: Store patterns in a database for runtime updates
- **Schema Validation**: Add JSON Schema validation for intent parameters
- **OpenAPI Generation**: Generate OpenAPI specs from intent schemas
- **Metrics & Monitoring**: Add instrumentation for observability
- **Additional Domains**: Implement more domains (Project Management, Payments, etc.)

## License

MIT
