Call dad Yeah, Kathy just text me, she's there packing. But I mean, I guess kind of assume. I can text Kathy. I mean, how would you have gotten to work? over at work? I think works. Thankfully, not too far away. So he worked day and was planned. And when I talked to a lot, he was like, you know, going to do the right stuff. You know what I mean? Like, yeah, so. he was kind of going to work.# LLM Sandwich Architecture

The LLM Sandwich Architecture provides a revolutionary approach to integrating large language models (LLMs) into software development and execution. It represents a paradigm shift in how we build AI-powered systems by providing structured layers that leverage LLMs for different purposes.

## Two Architectural Approaches

This project explores two distinct but related architectural approaches:

### Runtime LLM Sandwich Architecture

The Runtime approach embeds LLMs directly into application execution, with three key layers:

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

The Runtime architecture creates applications that leverage LLMs for adaptive, intelligent behavior at execution time.

### Development-Time LLM Sandwich Architecture

The Development-Time approach uses LLMs to assist in generating high-quality code that adheres to architectural patterns:

```
┌──────────────────────────────────────────────────────────┐
│ KNOWLEDGE EXTRACTION                                     │
│ • Schema Parser • Pattern Recognizer • Documentation Analyzer  │
└──────────────────────────────────────────────────────────┘
                      ↑ ↓
┌──────────────────────────────────────────────────────────┐
│ CODE GENERATION ENGINE                                   │
│ • Intent Parser • Template Manager • Code Synthesizer    │
└──────────────────────────────────────────────────────────┘
                      ↑ ↓
┌──────────────────────────────────────────────────────────┐
│ VALIDATION & QUALITY ASSURANCE                           │
│ • Pattern Validator • Test Generator • Linter Integration │
└──────────────────────────────────────────────────────────┘
```

The Development-Time architecture produces standard code without LLM dependencies, making it suitable for traditional deployment scenarios.

## Current Implementation

This repository currently implements the **Runtime LLM Sandwich Architecture**. The main components include:

- **LLM Integration**: Client and response handling
- **Context Management**: Dynamic assembly of relevant information for LLMs
- **Guard Layer**: Pattern enforcement via DatabaseAgentProxy
- **Domain Layer**: Business logic encapsulation with Domain Agents
- **Persistence Layer**: Intelligent database access

## Project Structure

```
llm-sandwich/
├── src/
│   ├── knowledge-base/    # Type definitions and knowledge structures
│   ├── integration/       # LLM integration and context management
│   └── layers/
│       ├── guard/         # Pattern enforcement layer
│       ├── domain/        # Business logic layer
│       └── persistence/   # Database access layer
├── scripts/               # Utility scripts for knowledge processing
├── docs/                  # Documentation
│   └── roadmaps/          # Implementation roadmaps for both architectures
└── examples/              # Usage examples (coming soon)
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- TypeScript 5.0+

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/llm-sandwich.git
cd llm-sandwich

# Install dependencies
npm install

# Create .env file with necessary configurations
cp .env.example .env
# Edit .env with your OpenRouter API key and other settings

# Build the project
npm run build
```

### Configuration

Edit the `.env` file to include:

```
OPENROUTER_API_KEY=your_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
ENABLE_PATTERN_ENFORCEMENT=true
```

## Usage Examples

### Using the Domain Layer

```typescript
import { BiddingAgent } from 'llm-sandwich';

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
const evaluationResult = await biddingAgent.evaluateBids('project_123');
```

### Using the Guard Layer Directly

```typescript
import { databaseAgentProxy, QueryIntentType } from 'llm-sandwich';

// Execute a database operation with validation
const result = await databaseAgentProxy.execute({
  type: QueryIntentType.SELECT,
  description: 'Get user profile data',
  tables: ['profiles'],
  authId: 'auth_123',
  entityType: 'user',
  filters: { active: true }
});
```

## Documentation

For more detailed information, see the following resources:

- [Runtime Architecture Roadmap](./docs/roadmaps/runtime-architecture-roadmap.md)
- [Development-Time Architecture Roadmap](./docs/roadmaps/devtime-architecture-roadmap.md)
- [Architecture Comparison Checklist](./docs/roadmaps/architecture-comparison-checklist.md)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
