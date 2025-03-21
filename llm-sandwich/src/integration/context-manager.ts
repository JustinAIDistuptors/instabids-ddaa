/**
 * Context Manager for the LLM Sandwich Architecture
 * 
 * This module handles the dynamic compilation and management of context
 * that is provided to the LLM during operations. It enables the LLM to have
 * awareness of architectural patterns, database schemas, and other important
 * information without overly bloating the context.
 */

import { KnowledgeBase, DatabaseTable, ArchitecturalPattern, IDRelationshipPattern } from '../knowledge-base/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Types of context that can be included
 */
export enum ContextType {
  SCHEMA = 'schema',
  PATTERNS = 'patterns',
  ID_RELATIONSHIP = 'id_relationship',
  DOMAIN_KNOWLEDGE = 'domain_knowledge',
  EXAMPLES = 'examples'
}

/**
 * Manages the context information provided to the LLM
 */
export class ContextManager {
  private knowledgeBase: KnowledgeBase | null = null;
  private initialized = false;
  private knowledgeBasePath: string;

  constructor() {
    // Path to the knowledge base files
    this.knowledgeBasePath = path.join(process.cwd(), 'src', 'knowledge-base', 'data');
  }

  /**
   * Initialize the context manager by loading knowledge base data
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize with empty knowledge base
      this.knowledgeBase = {
        tables: {},
        domains: {},
        patterns: {},
        idRelationships: {},
        typeDefinitions: {}
      };

      // Load schema knowledge
      try {
        const schemaPath = path.join(this.knowledgeBasePath, 'schema.json');
        const schemaData = JSON.parse(await fs.readFile(schemaPath, 'utf-8'));
        if (schemaData.tables) {
          this.knowledgeBase.tables = schemaData.tables;
        }
      } catch (error) {
        console.warn('Schema data not found or invalid:', error);
      }

      // Load patterns knowledge
      try {
        const patternsPath = path.join(this.knowledgeBasePath, 'patterns.json');
        const patternsData = JSON.parse(await fs.readFile(patternsPath, 'utf-8'));
        if (patternsData.patterns) {
          this.knowledgeBase.patterns = patternsData.patterns;
        }
        if (patternsData.idRelationships) {
          this.knowledgeBase.idRelationships = patternsData.idRelationships;
        }
      } catch (error) {
        console.warn('Patterns data not found or invalid:', error);
      }

      // Load type definitions
      try {
        const typesPath = path.join(this.knowledgeBasePath, 'types.json');
        const typesData = JSON.parse(await fs.readFile(typesPath, 'utf-8'));
        if (typesData.typeDefinitions) {
          this.knowledgeBase.typeDefinitions = typesData.typeDefinitions;
        }
      } catch (error) {
        console.warn('Type definitions not found or invalid:', error);
      }

      this.initialized = true;
      console.log('Context manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize context manager:', error);
      throw error;
    }
  }

  /**
   * Get the full schema context for a specific table or domain
   */
  async getSchemaContext(tableOrDomain?: string): Promise<string> {
    await this.ensureInitialized();
    
    if (!this.knowledgeBase) {
      return 'No schema information available.';
    }

    if (!tableOrDomain) {
      // Return summary of all tables
      return this.formatTableSummaries(Object.values(this.knowledgeBase.tables));
    }

    // Check if it's a table
    const table = this.knowledgeBase.tables[tableOrDomain];
    if (table) {
      return this.formatTableDetail(table);
    }

    // Check if it's a domain
    const domain = this.knowledgeBase.domains[tableOrDomain];
    if (domain) {
      const domainTables = domain.tables
        .map(tableName => this.knowledgeBase?.tables[tableName])
        .filter(table => !!table) as DatabaseTable[];
      
      return `# Domain: ${domain.name}\n${domain.description}\n\n${this.formatTableSummaries(domainTables)}`;
    }

    return `No schema information found for "${tableOrDomain}".`;
  }

  /**
   * Get pattern context for specific pattern or all critical patterns
   */
  async getPatternContext(patternName?: string): Promise<string> {
    await this.ensureInitialized();
    
    if (!this.knowledgeBase) {
      return 'No pattern information available.';
    }

    if (!patternName) {
      // Return all critical patterns
      const criticalPatterns = Object.values(this.knowledgeBase.patterns)
        .filter(pattern => pattern.importance === 'CRITICAL');
      
      return this.formatPatterns(criticalPatterns);
    }

    // Check for specific pattern
    const pattern = this.knowledgeBase.patterns[patternName];
    if (pattern) {
      return this.formatPattern(pattern);
    }

    return `No pattern found with name "${patternName}".`;
  }

  /**
   * Get ID relationship pattern context
   */
  async getIdRelationshipContext(entityType?: string): Promise<string> {
    await this.ensureInitialized();
    
    if (!this.knowledgeBase || Object.keys(this.knowledgeBase.idRelationships).length === 0) {
      return 'No ID relationship pattern information available.';
    }

    if (!entityType) {
      // Default to 'user' if not specified
      entityType = 'user';
    }

    const relationship = this.knowledgeBase.idRelationships[entityType];
    if (relationship) {
      return this.formatIdRelationship(relationship);
    }

    // If specific entity type not found, return the first available
    const firstRelationship = Object.values(this.knowledgeBase.idRelationships)[0];
    return this.formatIdRelationship(firstRelationship);
  }

  /**
   * Generate context for LLM based on specified context types
   */
  async generateContext(contextTypes: ContextType[], options: {
    tableOrDomain?: string;
    patternName?: string;
    entityType?: string;
    maxLength?: number;
  } = {}): Promise<string> {
    await this.ensureInitialized();
    
    const contextParts: string[] = [];

    // Add requested context types
    for (const contextType of contextTypes) {
      switch (contextType) {
        case ContextType.SCHEMA:
          contextParts.push(await this.getSchemaContext(options.tableOrDomain));
          break;
        case ContextType.PATTERNS:
          contextParts.push(await this.getPatternContext(options.patternName));
          break;
        case ContextType.ID_RELATIONSHIP:
          contextParts.push(await this.getIdRelationshipContext(options.entityType));
          break;
        // Additional context types can be added here
      }
    }

    // Combine all context parts
    let combinedContext = contextParts.join('\n\n');
    
    // Truncate if necessary
    if (options.maxLength && combinedContext.length > options.maxLength) {
      combinedContext = combinedContext.substring(0, options.maxLength) + 
        '\n\n[Context truncated due to length constraints]';
    }
    
    return combinedContext;
  }

  /**
   * Format a table for detailed view
   */
  private formatTableDetail(table: DatabaseTable): string {
    let result = `# Table: ${table.name}\n`;
    
    if (table.description) {
      result += `${table.description}\n\n`;
    }
    
    result += '## Columns\n';
    for (const column of table.columns) {
      result += `- ${column.name} (${column.type})`;
      if (!column.nullable) result += ' NOT NULL';
      if (column.defaultValue) result += ` DEFAULT ${column.defaultValue}`;
      if (column.description) result += ` // ${column.description}`;
      result += '\n';
    }
    
    if (table.primaryKey) {
      result += '\n## Primary Key\n';
      if (Array.isArray(table.primaryKey)) {
        result += `- Columns: ${table.primaryKey.join(', ')}\n`;
      } else {
        result += `- Column: ${table.primaryKey}\n`;
      }
    }
    
    if (table.foreignKeys.length > 0) {
      result += '\n## Foreign Keys\n';
      for (const fk of table.foreignKeys) {
        result += `- ${fk.columns.join(', ')} -> ${fk.referencedTable}(${fk.referencedColumns.join(', ')})\n`;
      }
    }
    
    return result;
  }

  /**
   * Format multiple tables for summary view
   */
  private formatTableSummaries(tables: DatabaseTable[]): string {
    if (tables.length === 0) {
      return 'No tables available.';
    }
    
    let result = '# Database Schema Summary\n\n';
    
    for (const table of tables) {
      result += `## ${table.name}\n`;
      if (table.description) {
        result += `${table.description}\n\n`;
      }
      
      // List key columns only
      const keyColumns = table.columns.filter(col => {
        const isPrimary = Array.isArray(table.primaryKey) 
          ? table.primaryKey.includes(col.name) 
          : table.primaryKey === col.name;
        
        const isForeignKey = table.foreignKeys.some(fk => 
          fk.columns.includes(col.name)
        );
        
        return isPrimary || isForeignKey || !col.nullable;
      });
      
      if (keyColumns.length > 0) {
        result += 'Key columns:\n';
        for (const col of keyColumns) {
          result += `- ${col.name} (${col.type})\n`;
        }
        result += '\n';
      }
    }
    
    return result;
  }

  /**
   * Format a single architectural pattern
   */
  private formatPattern(pattern: ArchitecturalPattern): string {
    let result = `# Architectural Pattern: ${pattern.name}\n`;
    result += `Importance: ${pattern.importance}\n\n`;
    result += `${pattern.description}\n\n`;
    
    if (pattern.pattern.length > 0) {
      result += '## Rules\n';
      for (const rule of pattern.pattern) {
        result += `- [${rule.type}] ${rule.description}\n`;
      }
      result += '\n';
    }
    
    if (pattern.examples.length > 0) {
      result += '## Example\n';
      result += pattern.examples[0] + '\n';
    }
    
    return result;
  }

  /**
   * Format multiple architectural patterns
   */
  private formatPatterns(patterns: ArchitecturalPattern[]): string {
    if (patterns.length === 0) {
      return 'No patterns available.';
    }
    
    let result = '# Architectural Patterns\n\n';
    
    for (const pattern of patterns) {
      result += `## ${pattern.name}\n`;
      result += `Importance: ${pattern.importance}\n\n`;
      result += `${pattern.description}\n\n`;
    }
    
    return result;
  }

  /**
   * Format ID relationship pattern
   */
  private formatIdRelationship(relationship: IDRelationshipPattern): string {
    let result = `# ID Relationship Pattern: ${relationship.name}\n`;
    result += `Importance: ${relationship.importance}\n\n`;
    result += `${relationship.description}\n\n`;
    
    result += `## Details\n`;
    result += `- Entity Type: ${relationship.entityType}\n`;
    result += `- Profile Table: ${relationship.profileTable}\n`;
    result += `- Primary ID Source: ${relationship.primaryIdSource}\n\n`;
    
    if (relationship.pattern.length > 0) {
      result += '## Rules\n';
      for (const rule of relationship.pattern) {
        result += `- [${rule.type}] ${rule.description}\n`;
      }
      result += '\n';
    }
    
    if (relationship.examples.length > 0) {
      result += '## Example\n';
      result += relationship.examples[0] + '\n';
    }
    
    return result;
  }

  /**
   * Ensure context manager is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

/**
 * Singleton instance of the context manager
 */
export const contextManager = new ContextManager();
