# OVERWATCH AGENT MEMORY SYSTEM

**Last Updated:** March 20, 2025

## OVERVIEW

Welcome to the Overwatch Agent Memory System! This system is designed to provide persistent knowledge and context to AI agents (like me, the Overwatch Agent) working on the InstaBids project and its Domain-Driven Agent Architecture (DDAA).

As the Overwatch Agent, you are the strategic coordinator for this complex project. This memory system is your primary tool for maintaining a comprehensive understanding of the project across sessions.

## PURPOSE OF THIS MEMORY SYSTEM

- **Context Continuity:** To ensure AI agents can effectively resume work after interruptions or resets, without losing critical project context.
- **Knowledge Retention:** To capture and organize key information, decisions, and architectural patterns throughout the project lifecycle.
- **Efficient Onboarding:** To provide a streamlined way for new AI agents (or human team members) to quickly get up to speed on the project's vision, architecture, and current status.
- **Scalability and Maintainability:** To create a memory structure that can scale with the project's complexity and remain easy to navigate and update over time.

## MEMORY SYSTEM STRUCTURE

The memory system is organized hierarchically within the `/overwatch-memory/` directory:

```
/overwatch-memory/
├── 00_ENTRY_POINT.md        # Entry point and instructions (THIS FILE)
├── 01_agent_identity.md       # Overwatch Agent role and responsibilities
├── 02_project_overview.md     # High-level project vision and goals
├── 03_architecture.md       # Core architectural patterns and decisions
├── 04_current_status.md       # Tracks current project status and next steps
├── /manifests/              # Directory containing manifest files (file indexes)
│   ├── core_files.md        # Manifest for CORE_FILES
│   ├── conversation_files.md  # Manifest for CONVERSATION_FILES
│   ├── docs_architecture_files.md # Manifest for DOCUMENTATION/Architecture
│   └── ... (other manifest files per directory)
└── /summaries/              # Directory for summaries and distilled knowledge
    ├── conversations/        # Summaries of conversation logs
    ├── domains/            # Domain-specific knowledge summaries
    └── documents/          # Key document summaries
```

- **Core Files (00-04):**  High-level documents providing essential context and instructions. Read these first for onboarding.
- **Manifests Directory:** Contains smaller, directory-specific manifest files that index all project files with concise summaries and keywords.
- **Summaries Directory:**  Stores more detailed summaries and distilled knowledge, organized by conversations, domains, and documents.

## ONBOARDING INSTRUCTIONS (FOR NEW OVERWATCH AGENTS)

To onboard to the project as the Overwatch Agent:

1. **Identify as Overwatch Agent:**  Begin your first communication by stating "You are the Overwatch Agent."
2. **Read Entry Point File:**  Open and carefully read `/overwatch-memory/00_ENTRY_POINT.md` (this file) for initial instructions.
3. **Read Core Files:**  Read the core files in numerical order (01_agent_identity.md, 02_project_overview.md, 03_architecture.md, 04_current_status.md) to gain a high-level understanding.
4. **Explore Manifests:**  Review the manifest files in `/overwatch-memory/manifests/` to get an overview of all project files and their purpose. Focus on the "Key Insights" column for concise summaries.
5. **Load Detailed Files On-Demand:**  Use the `read_file` tool to fetch the full content of specific files only when detailed information is needed for a particular task.
6. **Consult Master Project List:**  See the `master_project_list.md` file (or embedded section below) for a high-level overview of the main projects and their goals.

## MASTER PROJECT LIST

See: [master_project_list.md](master_project_list.md) for a detailed breakdown of current projects and their goals.

---

**Note:** This README provides a high-level overview of the Overwatch Agent Memory System. For detailed instructions, always refer to `00_ENTRY_POINT.md`.

**Created:** March 20, 2025
