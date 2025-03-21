# InstaBids & DDAA (Domain-Driven Agent Architecture)

This repository contains both the InstaBids platform - a contractor bidding platform connecting homeowners with contractors - and the innovative DDAA (Domain-Driven Agent Architecture) being developed and proven through the InstaBids implementation.

## Project Duality

This project has two interconnected components:

1. **InstaBids Platform** - A contractor bidding platform connecting homeowners with contractors
2. **DDAA (Domain-Driven Agent Architecture)** - An innovative architectural approach being developed and proven through InstaBids implementation

## InstaBids Platform

### Vision and Purpose

InstaBids is a platform that connects homeowners with contractors. It features:
- Multiple user types (homeowners, contractors, property managers)
- Project creation and management
- Competitive bidding system with group bidding capabilities
- Messaging and notifications
- Payment processing with milestone releases
- AI-powered contractor outreach and acquisition
- Community and social features
- Mobile and web interfaces

### Core Domains

The system includes these major domains:
- User Management (auth, profiles, roles)
- Project Management (creation, status, workflows)
- Bidding System (individual and group bids)
- Messaging System (conversations, notifications)
- Payment Processing (escrow, milestones, commissions)
- AI Outreach (contractor discovery and acquisition)
- Community Features (reviews, Q&A, referrals)

## DDAA Architecture

### Concept and Innovation

The Domain-Driven Agent Architecture (DDAA) is an innovative approach that:
- Organizes the system around domain-specific agents
- Uses a "sandwich" pattern for each domain
- Implements a hierarchical agent structure
- Employs Intent-Driven Development
- Enables pattern-first development

### Sandwich Architecture

Each domain implements a three-layer "sandwich" architecture:
```
┌─────────────────────────────────────┐
│ GUARD LAYER (Top Bread)             │
│ - Pattern enforcement               │
│ - Security validation               │
│ - Input/output validation           │
├─────────────────────────────────────┤
│ DOMAIN LOGIC LAYER (Filling)        │
│ - Business rules                    │
│ - Domain-specific processing        │
│ - Core functionality                │
├─────────────────────────────────────┤
│ PERSISTENCE LAYER (Bottom Bread)    │
│ - Database operations               │
│ - Data access patterns              │
│ - Data normalization                │
└─────────────────────────────────────┘
```

### Intent-Driven Development

Intent-Driven Development transforms how business logic is expressed:

**Traditional**:
```typescript
const bids = await supabase.from('bids')
.select('*')
.eq('project_id', projectId)
.eq('status', 'active');
```

**Intent-Driven**:
```typescript
const bids = await intentEngine.fulfill('Get all active bids for this project', {
context: { projectId, userId: auth.id }
});
```

## Repository Structure

The repository is organized as follows:

- `/docs/` - Comprehensive documentation
  - Architecture documentation
  - Database schemas
  - API specifications
  - Process flows
  - ERDs and much more

- `/instabids-ddaa/` - Core InstaBids DDAA implementation

- `/instabids-ddaa-architecture/` - DDAA architectural components

- `/llm-sandwich/` - LLM Sandwich framework implementation

- `/llm-sandwich-dev/` - Development version of the LLM Sandwich

- `/overwatch-memory/` - Memory system for the Overwatch Agent

## Implementation Status

According to our project completion checklist, the architecture documentation is approximately 97% complete, and we are moving into the implementation phase. We are following a phased implementation plan:

1. **Phase 1 (Months 1-3)**: Core Platform Foundation
   - Basic authentication, project management, bidding, messaging, payments
   - Initial mobile web experience

2. **Phase 2 (Months 4-6)**: Enhanced Marketplace
   - Advanced project management, enhanced bidding
   - Group bidding essentials, milestone payments
   - Basic analytics, improved mobile experience

3. **Phase 3 (Months 7-9)**: Market Expansion & Advanced Features
   - Labor marketplace, AI General Contractor
   - Dream projects, community features
   - Social sharing, advanced analytics

4. **Phase 4 (Months 10-12)**: AI Outreach & Acquisition
   - AI contractor outreach, advanced payments
   - Platform optimization, native mobile apps
   - Integration ecosystem, international expansion

## Getting Started

### Prerequisites

- Node.js (v18+)
- NPM or Yarn
- Supabase account and project
- TypeScript

### Development Setup

1. Clone this repository
2. Install dependencies for each project:
   ```
   cd instabids-ddaa && npm install
   cd ../llm-sandwich && npm install
   cd ../instabids-ddaa-architecture && npm install
   ```
3. Follow the environment setup instructions in `docs/environment/environment_setup.md`
4. Initialize the database using the schema files in `docs/schema/`

## Contributing

This project is currently under active development. Please refer to the project's documentation for more information on how to contribute.

## License

[To be determined]
