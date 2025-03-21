# GitHub Repository Structure Guide

This document provides guidance on how the implemented storage services and related documentation are structured for GitHub integration.

## Repository Structure

All files in this project follow a standard repository structure that's ready for GitHub deployment. The organization is as follows:

```
instabids-project/
├── src/                            # Source code directory
│   ├── shared/                     # Shared utilities, constants, and helpers
│   │   └── constants/
│   │       └── storage.ts          # Shared storage constants
│   │
│   └── domains/                    # Domain-specific code
│       ├── bidding/                # Bidding domain
│       │   └── services/
│       │       └── bidding-storage-service.ts
│       │
│       ├── messaging/              # Messaging domain
│       │   └── services/
│       │       └── messaging-storage-service.ts
│       │
│       ├── payment/                # Payment domain
│       │   └── services/
│       │       └── payment-storage-service.ts
│       │
│       ├── project/                # Project domain
│       │   └── services/
│       │       └── project-storage-service.ts
│       │
│       └── user/                   # User domain
│           └── services/
│               └── user-storage-service.ts
│
├── docs/                           # Documentation directory
│   ├── architecture/               # Architecture documentation
│   │   └── ddaa/                   # Domain-Driven Architecture and Algorithms
│   │       ├── domain_agent_prompt_template.md
│   │       ├── bidding_agent_prompt_example.md
│   │       ├── messaging_agent_prompt_example.md
│   │       ├── payment_agent_prompt_example.md
│   │       └── project_agent_prompt_example.md
│   │
│   ├── implementation/             # Implementation guides
│   │   ├── storage_implementation_README.md
│   │   ├── storage_implementation_guide_no_rls.md
│   │   └── storage_implementation_checklist.md
│   │
│   └── storage/                    # Storage-specific documentation
│       ├── storage_bidding_domain.md
│       ├── storage_messaging_domain.md
│       ├── storage_payment_domain.md
│       ├── storage_project_domain.md
│       └── storage_user_domain.md
│
├── scripts/                        # Utility scripts
│   ├── create-storage-buckets.js
│   ├── verify-environment-setup.js
│   └── setup-storage-env.js
│
├── package.json                    # Project dependencies and scripts
└── tsconfig.json                   # TypeScript configuration
```

## GitHub Integration

When pushing this project to GitHub:

1. **Repository Setup**
   - The entire structure can be pushed as-is to a GitHub repository
   - All paths are relative and will work properly in the repository
   - The structure follows standard conventions for TypeScript/Node.js projects

2. **File Organization**
   - Source code (`src/`) contains all implementation files organized by domain
   - Documentation (`docs/`) provides guides and reference materials
   - Scripts (`scripts/`) contain utilities for setup and management

3. **Import/Export Structure**
   - All TypeScript files use relative imports referencing the project structure
   - Example: `import { STORAGE_BUCKETS } from '../../../shared/constants/storage';`
   - This ensures proper module resolution when the code is cloned from GitHub

4. **Path Conventions**
   - All paths in the code base (for imports/requires) are relative to the project root
   - File paths in documentation refer to the GitHub repository structure
   - Path separators use forward slashes (/) for cross-platform compatibility

## CI/CD Considerations

For GitHub CI/CD integration:

1. **GitHub Actions**
   - This project structure is compatible with GitHub Actions workflows
   - Typical workflows would include:
     - TypeScript compilation
     - Linting
     - Unit testing
     - Documentation generation

2. **Environment Variables**
   - Sensitive configuration (API keys, credentials) should be stored in GitHub Secrets
   - Environment setup can leverage the scripts in the `scripts/` directory

3. **Branch Structure**
   - Main/master branch for stable releases
   - Development branch for active development
   - Feature branches for new functionality
   - Each storage service implementation could be developed in a separate feature branch

## Deployment

For deployment from GitHub:

1. The structure supports standard Node.js deployment patterns
2. TypeScript files will be compiled to JavaScript in a `dist/` or `build/` directory
3. Deployment scripts can be added to the `scripts/` directory
4. Documentation can be automatically published to GitHub Pages

This organization ensures that all files have a clear place in the repository structure and can be easily navigated, understood, and maintained by the development team.
