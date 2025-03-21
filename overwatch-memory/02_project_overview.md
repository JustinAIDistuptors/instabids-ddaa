# PROJECT OVERVIEW: INSTABIDS & DDAA

**Last Updated:** March 20, 2025, 7:01 PM EST

## PROJECT DUALITY

This project has two interconnected components:

1. **InstaBids Platform** - A contractor bidding platform connecting homeowners with contractors
2. **DDAA (Domain-Driven Agent Architecture)** - An innovative architectural approach being developed and proven through InstaBids implementation

## INSTABIDS PLATFORM

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

### Business Goals

[To be populated after reading project documentation]

## DDAA ARCHITECTURE

### Concept and Innovation

The Domain-Driven Agent Architecture (DDAA) is an innovative approach that:
- Organizes the system around domain-specific agents
- Uses a "sandwich" pattern for each domain
- Implements a hierarchical agent structure
- Employs Intent-Driven Development
- Enables pattern-first development

### Key Architectural Principles

- Domain-Driven Design with bounded contexts
- Modular monolith to start (not microservices)
- Unidirectional dependencies to prevent circular references
- Type-first development with strong TypeScript typing
- Clear service interfaces between domains
- Event-driven processes for cross-domain coordination

### Sandwich Architecture

Each domain implements a three-layer "sandwich" architecture:
- **Guard Layer (Top Bread)** - Pattern enforcement, security, validation
- **Domain Logic Layer (Filling)** - Business rules and domain-specific processing
- **Persistence Layer (Bottom Bread)** - Database operations and data access

### Agent Hierarchy

The system employs a three-tier agent hierarchy:
- **Strategic Layer (Overwatch)** - High-level architecture and cross-domain coordination
- **Tactical Layer (Master Chief)** - Implementation coordination and integration
- **Domain Layer (Domain-specific agents)** - Specialized implementation of domain features

## DEVELOPMENT APPROACH

[To be populated after reading project documentation]

## KEY STAKEHOLDERS

[To be populated after reading project documentation]

## TIMELINE AND MILESTONES

[To be populated after reading project documentation]

---

**Note:** This overview will be populated with more detailed information as the onboarding process continues.

**Created:** March 20, 2025, 7:01 PM EST
