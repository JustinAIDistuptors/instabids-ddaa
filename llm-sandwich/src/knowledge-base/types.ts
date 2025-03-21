/**
 * Types for the LLM Sandwich Architecture knowledge base
 */

/**
 * Represents a database table schema extracted from SQL definition
 */
export interface DatabaseTable {
  name: string;
  columns: DatabaseColumn[];
  primaryKey: string | string[];
  foreignKeys: ForeignKeyConstraint[];
  uniqueConstraints: UniqueConstraint[];
  otherConstraints: string[];
  description?: string;
}

/**
 * Represents a column in a database table
 */
export interface DatabaseColumn {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  description?: string;
  isIdentity?: boolean;
}

/**
 * Represents a foreign key constraint
 */
export interface ForeignKeyConstraint {
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  onDelete?: 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION';
}

/**
 * Represents a unique constraint
 */
export interface UniqueConstraint {
  name: string;
  columns: string[];
}

/**
 * Represents a domain or functional area of the system
 */
export interface Domain {
  name: string;
  description: string;
  tables: string[];
  dependencies: string[];
  boundaryType: 'STRONG' | 'WEAK';
}

/**
 * Represents an architectural pattern extracted from documentation
 */
export interface ArchitecturalPattern {
  name: string;
  description: string;
  pattern: PatternRule[];
  examples: string[];
  importance: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  domains: string[];
}

/**
 * Represents a rule within an architectural pattern
 */
export interface PatternRule {
  type: 'RELATIONSHIP' | 'VALIDATION' | 'SECURITY' | 'WORKFLOW' | 'OTHER';
  description: string;
  implementation?: string;
}

/**
 * Represents the ID relationship pattern (auth.id = profile.id)
 * This is a critical pattern in the InstaBids platform
 */
export interface IDRelationshipPattern extends ArchitecturalPattern {
  entityType: string;  // e.g., 'homeowner', 'contractor'
  profileTable: string;
  primaryIdSource: 'AUTH' | 'PROFILE';
}

/**
 * The complete knowledge base for the LLM Sandwich Architecture
 */
export interface KnowledgeBase {
  tables: Record<string, DatabaseTable>;
  domains: Record<string, Domain>;
  patterns: Record<string, ArchitecturalPattern>;
  idRelationships: Record<string, IDRelationshipPattern>;
  typeDefinitions: Record<string, string>;  // TypeScript interfaces
}
