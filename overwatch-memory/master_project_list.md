# MASTER PROJECT LIST

**Last Updated:** March 20, 2025

This file provides a high-level overview of the main projects that the Overwatch Agent is currently tracking and managing.

## CURRENT PROJECTS

1. **InstaBids Platform:**
   - **Description:** A contractor bidding platform connecting homeowners with contractors. Features user management, project creation, bidding system, messaging, payments, AI outreach, and community features.
   - **Goal:** Build a fully functional, scalable, and user-friendly platform to connect homeowners and contractors efficiently.
   - **Status:** In architecture and initial implementation phase. Focus is currently on building the DDAA framework to support InstaBids.
   - **Documentation Location:**  `docs/` directory contains detailed specifications, diagrams, and documentation for all InstaBids features and domains.

2. **DDAA (Domain-Driven Agent Architecture):**
   - **Description:** An innovative software architecture designed for complex, domain-driven applications, leveraging LLMs and a "sandwich" layered approach with domain-specific agents.
   - **Goal:** Develop and validate the DDAA as a robust, scalable, and efficient architecture for building AI-powered applications, using InstaBids as the primary proof-of-concept.
   - **Status:** Core infrastructure implementation in progress (LLM Sandwich MVP). Focus is on building the "bread slices" (Guard Layer and Persistence Layer) and demonstrating basic functionality.
   - **Implementation Location:** `instabids-ddaa-architecture/` and `llm-sandwich/` directories contain the implementation code for the DDAA framework.
   - **Architecture Documentation:** Key architectural principles and patterns are documented in `docs/architecture/ddaa/` and `docs/architecture/architecture_overview.md`.

3. **Overwatch Agent Memory System:**
   - **Description:** A persistent knowledge base and onboarding system for AI agents (like the Overwatch Agent) to effectively manage and contribute to the InstaBids and DDAA projects.
   - **Goal:** Create a robust, scalable, and efficient memory system that allows AI agents to maintain context, track progress, and onboard quickly to the project.
   - **Status:** Memory system structure is currently being set up and populated. Focus is on optimizing the manifest files for context window efficiency and prioritized onboarding.
   - **Implementation & Documentation Location:**  `overwatch-memory/` directory contains the implementation and documentation for the memory system itself.

## PROJECT RELATIONSHIPS

- The DDAA architecture is being built *for* the InstaBids platform. InstaBids is the "use case" and validation project for DDAA.
- The Overwatch Agent Memory System is a *tool* to support the development of both InstaBids and DDAA.

## NEXT STEPS

[To be populated in `04_current_status.md`]

---

**Note:** This is a high-level overview. Refer to the individual project directories and documentation for detailed information.

**Created:** March 20, 2025
