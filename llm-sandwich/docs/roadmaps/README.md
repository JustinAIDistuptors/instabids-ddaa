# LLM Sandwich Architecture Roadmaps

> **IMPORTANT NOTICE**: This directory contains implementation roadmaps for two distinct architectural approaches - do not confuse them during implementation.

## Overview

The LLM Sandwich Architecture is a novel approach to leveraging large language models (LLMs) in software development and execution. We have identified two separate but related architectural approaches:

1. **Development-Time LLM Sandwich Architecture**: Uses LLMs during development to generate high-quality code
2. **Runtime LLM Sandwich Architecture**: Embeds LLMs directly into application execution

## Roadmap Documents

### [Development-Time Architecture Roadmap](./devtime-architecture-roadmap.md)

The Development-Time architecture focuses on using LLMs to assist in generating code that adheres to architectural patterns. The output is standard code that does not require LLMs at runtime, making it suitable for traditional deployment scenarios.

**Key aspects:**
- Uses LLMs for code generation
- Enforces patterns through static analysis
- Generates complete source code
- No runtime LLM dependencies
- One-time cost during development

### [Runtime Architecture Roadmap](./runtime-architecture-roadmap.md)

The Runtime architecture integrates LLMs directly into application execution flow. This creates adaptive systems that can enforce architectural patterns at runtime and make intelligent decisions during operation.

**Key aspects:**
- LLMs actively participate in application execution
- Dynamic pattern enforcement and adaptation
- Intelligent query construction and optimization
- Ongoing LLM integration during operation
- Adaptable without code changes

### [Architecture Comparison Checklist](./architecture-comparison-checklist.md)

This document provides a direct comparison between the two architectures and detailed checklists to ensure proper separation of concerns during implementation.

**Key contents:**
- Conceptual comparison
- Visual representation of differences
- Repository structure differences
- Component naming conventions
- Development checklists
- Documentation guidelines
- When to use which architecture

## Implementation Planning

We recommend implementing these architectures in separate repositories:

- `llm-sandwich-dev` for the Development-Time architecture
- `llm-sandwich-runtime` for the Runtime architecture (what we've started building)

Each repository should follow the structure outlined in its respective roadmap document, and all components should adhere to the naming conventions defined in the comparison checklist.

## Implementation Strategy

Based on careful consideration of benefits and risks, we will implement these architectures in the following order:

1. **Development-Time Architecture (First Priority)**
   - Create a new repository (`llm-sandwich-dev`)
   - Implement the knowledge extraction system
   - Build the code generation engine
   - Develop validation and quality assurance tools
   - Create developer tools integration
   - Test with InstaBids domains as proof of concept

2. **Runtime Architecture (Second Priority)**
   - Continue building on current progress in this repository
   - Components already implemented:
     - **Knowledge Base**: Basic type definitions
     - **Integration**: LLM Client and Context Manager
     - **Guard Layer**: DatabaseAgentProxy (initial implementation)
     - **Domain Layer**: Base DomainAgent and BiddingAgent example
     - **Persistence Layer**: DataInterface and query building
   - Complete remaining components after Development-Time implementation

This strategy allows us to quickly prove the concept with the lower-risk Development-Time architecture while continuing to refine the more innovative Runtime architecture.

For a detailed implementation plan with timeline and resource requirements, see [Build Implementation Plan](../implementation/build-implementation-plan.md).
