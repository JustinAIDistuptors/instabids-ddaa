# DOCUMENTATION FILES MANIFEST (SUMMARY)

**Last Updated:** March 20, 2025

This manifest provides a high-level overview of the documentation directories in the InstaBids project. For detailed file listings within each directory, refer to the individual manifests in subdirectories (if created) or use file listing tools.

## DOCUMENTATION AREAS

### Architecture Documentation (`docs/architecture/`)
- **Purpose:** Contains architectural decision records (ADRs), DDAA-specific architecture documentation, and overall architecture overviews.
- **Key Entry Points:** [docs/architecture/architecture_overview.md](docs/architecture/architecture_overview.md), [docs/architecture/ddaa/README.md](docs/architecture/ddaa/README.md)

### API Documentation (`docs/api/`)
- **Purpose:** Defines API specifications for all InstaBids domains using YAML format.
- **Key Entry Points:** [docs/api/README.md](docs/api/README.md) (if exists, otherwise examine individual YAML files)

### ERD Documentation (`docs/erd/`)
- **Purpose:** Entity Relationship Diagrams (ERDs) visually representing the data models for each domain.
- **Key Entry Points:** [docs/erd/erd_overview.md](docs/erd/erd_overview.md)

### Flow Documentation (`docs/flow/`)
- **Purpose:** Process flow diagrams illustrating key user workflows and system interactions.
- **Key Entry Points:** [docs/flow/flow_labor_marketplace.md](docs/flow/flow_labor_marketplace.md) (as a central example)

### Schema Documentation (`docs/schema/`)
- **Purpose:** SQL schema definitions for the InstaBids database, broken down by domain.
- **Key Entry Points:** [docs/schema/schema_core.sql](docs/schema/schema_core.sql) (as a starting point)

### Interface Documentation (`docs/interfaces/`)
- **Purpose:** TypeScript interface definitions for various data structures and API contracts.
- **Key Entry Points:** [docs/interfaces/interfaces_core.ts](docs/interfaces/interfaces_core.ts) (as a starting point)

---

**Note:** This manifest provides a summary overview. For detailed file listings, refer to subdirectory manifests (if created) or use file listing tools.

**Created:** March 20, 2025
