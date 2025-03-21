# ARCHITECTURE: DDAA (DOMAIN-DRIVEN AGENT ARCHITECTURE)

**Last Updated:** March 20, 2025, 7:02 PM EST

## ARCHITECTURAL VISION

The Domain-Driven Agent Architecture (DDAA) represents an innovative approach to software architecture that:

1. Combines domain-driven design principles with AI agent capabilities
2. Implements a consistent "sandwich" pattern across all domains
3. Uses Intent-Driven Development for rapid implementation
4. Applies Pattern-First Development to ensure architectural integrity
5. Organizes development around domain-specific "sandwich" agents

## LLM SANDWICH ARCHITECTURE

### Core Concept

Each domain is implemented as a "sandwich" with three distinct layers:

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

### Layer Responsibilities

#### Guard Layer (Top Bread)

- Enforces architectural patterns
- Validates request security and permissions
- Ensures data integrity and validation
- Intercepts and handles errors
- Provides standardized response formatting

#### Domain Logic Layer (Filling)

- Implements core business rules
- Processes domain-specific operations
- Orchestrates workflow between components
- Remains database-agnostic
- Contains no direct database access

#### Persistence Layer (Bottom Bread)

- Handles all database operations
- Manages data structure and relationships
- Normalizes input/output data
- Implements caching strategies
- Enforces data integrity constraints

## HIERARCHICAL AGENT STRUCTURE

The system implements a three-tier agent hierarchy:

```
┌─────────────────────────────────────┐
│ STRATEGIC LAYER                     │
│ "Overwatch Agent" (Claude with 2M context) │
│ - System architecture design        │
│ - Project decomposition             │
│ - Cross-domain priorities           │
│ - Technical debt monitoring         │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│ TACTICAL LAYER                      │
│ "Master Chief"                      │
│ - Implementation coordination       │
│ - Cross-domain integration          │
│ - Technical problem-solving         │
│ - Progress tracking                 │
└─────────────────────────────────────┘
    ↙           ↓            ↘
┌─────────┐ ┌─────────┐ ┌─────────┐
│ DOMAIN  │ │ DOMAIN  │ │ DOMAIN  │
│ LAYER   │ │ LAYER   │ │ LAYER   │
│ Bidding │ │Messaging│ │ Payment │
│ Agent   │ │ Agent   │ │ Agent   │
└─────────┘ └─────────┘ └─────────┘
```

## DOMAIN-SPECIFIC AGENTS

Each domain is represented by its own agent with full sandwich architecture. The primary domains include:

- **User Management Agent** - Authentication, profiles, roles
- **Project Management Agent** - Project creation, status, workflows
- **Bidding Agent** - Individual and group bids
- **Messaging Agent** - Conversations, notifications
- **Payment Agent** - Escrow, milestones, commissions
- **AI Outreach Agent** - Contractor discovery and acquisition
- **Community Agent** - Reviews, Q&A, referrals

## INTENT-DRIVEN DEVELOPMENT

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

The system:
- Translates intent to implementation
- Enforces all architectural patterns
- Adapts to changing requirements without code changes
- Maintains type safety through inference

## PATTERN-FIRST DEVELOPMENT

Pattern-First Development ensures architectural integrity:

1. Define patterns explicitly (e.g., "profile.id must always match auth.id")
2. Create enforcement mechanisms (guard layers)
3. Implement features within pattern constraints
4. Pattern violations fail immediately

## CROSS-DOMAIN COMMUNICATION

[To be populated after reading project documentation]

## DATABASE SCHEMA PATTERNS

[To be populated after reading project documentation]

## SECURITY PATTERNS

[To be populated after reading project documentation]

---

**Note:** This architecture document will be updated with additional details as the onboarding process continues.

**Created:** March 20, 2025, 7:02 PM EST
