/**
 * @file Types for the knowledge base system
 * 
 * This file defines the core types used throughout the Development-Time LLM Sandwich Architecture.
 * These types represent the structured knowledge extracted from existing codebases, documentation,
 * and schemas, which will be used to inform code generation.
 */

/**
 * Represents a database schema, table, or entity
 */
export interface Schema {
  /** Unique identifier for this schema */
  id: string;
  /** Human-readable name of the schema/table */
  name: string;
  /** Type of schema (database, table, entity, etc.) */
  type: SchemaType;
  /** Columns/fields in this schema */
  fields: SchemaField[];
  /** Relationships to other schemas */
  relationships: SchemaRelationship[];
  /** Constraints such as unique, not null, etc. */
  constraints: SchemaConstraint[];
  /** Optional metadata about this schema */
  metadata?: Record<string, any>;
}

/**
 * Type of schema element
 */
export enum SchemaType {
  DATABASE = 'database',
  TABLE = 'table',
  ENTITY = 'entity',
  INTERFACE = 'interface',
  TYPE = 'type',
  CLASS = 'class',
}

/**
 * Field/column in a schema
 */
export interface SchemaField {
  /** Field name */
  name: string;
  /** Data type of the field */
  type: string;
  /** Whether this field is required */
  required: boolean;
  /** Whether this field is a primary key */
  isPrimaryKey: boolean;
  /** Whether this field is a foreign key */
  isForeignKey: boolean;
  /** Default value, if any */
  defaultValue?: any;
  /** Description of this field */
  description?: string;
  /** Validation rules for this field */
  validations?: SchemaValidation[];
}

/**
 * Validation rule for a schema field
 */
export interface SchemaValidation {
  /** Type of validation */
  type: string;
  /** Parameters for this validation */
  params?: Record<string, any>;
  /** Error message for validation failure */
  errorMessage?: string;
}

/**
 * Relationship between schemas
 */
export interface SchemaRelationship {
  /** Type of relationship */
  type: RelationshipType;
  /** Schema this relationship is referencing */
  targetSchema: string;
  /** Field in the target schema this references */
  targetField: string;
  /** Field in this schema used for the relationship */
  sourceField: string;
  /** Whether this relationship is required */
  required: boolean;
  /** Cardinality of the relationship */
  cardinality: Cardinality;
  /** Whether deletes cascade */
  cascadeDelete: boolean;
}

/**
 * Type of relationship between schemas
 */
export enum RelationshipType {
  ONE_TO_ONE = 'one-to-one',
  ONE_TO_MANY = 'one-to-many',
  MANY_TO_ONE = 'many-to-one',
  MANY_TO_MANY = 'many-to-many',
}

/**
 * Cardinality of a relationship
 */
export enum Cardinality {
  ONE = 'one',
  ZERO_OR_ONE = 'zero-or-one',
  MANY = 'many',
  ZERO_OR_MANY = 'zero-or-many',
}

/**
 * Constraint on a schema
 */
export interface SchemaConstraint {
  /** Type of constraint */
  type: ConstraintType;
  /** Fields this constraint applies to */
  fields: string[];
  /** Name of the constraint */
  name: string;
  /** Expression for check constraints */
  expression?: string;
}

/**
 * Type of schema constraint
 */
export enum ConstraintType {
  PRIMARY_KEY = 'primary-key',
  UNIQUE = 'unique',
  CHECK = 'check',
  FOREIGN_KEY = 'foreign-key',
  NOT_NULL = 'not-null',
}

/**
 * Represents an architectural pattern in the codebase
 */
export interface Pattern {
  /** Unique identifier for this pattern */
  id: string;
  /** Name of the pattern */
  name: string;
  /** Description of what this pattern does */
  description: string;
  /** When to use this pattern */
  usage: string;
  /** Example implementation of this pattern */
  example: string;
  /** Whether this pattern is required or optional */
  required: boolean;
  /** Dependencies on other patterns */
  dependencies: string[];
  /** Components that implement this pattern */
  components: string[];
  /** Templates associated with this pattern */
  templates: string[];
  /** Rules that define this pattern */
  rules: PatternRule[];
}

/**
 * Rule that defines a pattern
 */
export interface PatternRule {
  /** Description of the rule */
  description: string;
  /** Severity if rule is violated */
  severity: RuleSeverity;
  /** How to fix violations of this rule */
  fix?: string;
}

/**
 * Severity of a pattern rule
 */
export enum RuleSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

/**
 * Template for code generation
 */
export interface CodeTemplate {
  /** Unique identifier for this template */
  id: string;
  /** Name of the template */
  name: string;
  /** Description of the template */
  description: string;
  /** The actual template content */
  content: string;
  /** The language this template is for */
  language: string;
  /** Parameters accepted by this template */
  parameters: TemplateParameter[];
  /** Patterns this template implements */
  patterns: string[];
}

/**
 * Parameter for a code template
 */
export interface TemplateParameter {
  /** Name of the parameter */
  name: string;
  /** Description of the parameter */
  description: string;
  /** Type of the parameter */
  type: string;
  /** Whether this parameter is required */
  required: boolean;
  /** Default value for this parameter */
  defaultValue?: any;
}

/**
 * Knowledge repository containing all extracted information
 */
export interface KnowledgeRepository {
  /** Schemas extracted from the codebase */
  schemas: Record<string, Schema>;
  /** Patterns identified in the codebase */
  patterns: Record<string, Pattern>;
  /** Templates for code generation */
  templates: Record<string, CodeTemplate>;
  /** Last updated timestamp */
  lastUpdated: string;
  /** Version of the knowledge base */
  version: string;
}

/**
 * Result of code generation
 */
export interface GeneratedCode {
  /** The generated files */
  files: GeneratedFile[];
  /** Messages about the generation process */
  messages: string[];
  /** Warnings that occurred during generation */
  warnings: string[];
  /** Errors that prevented successful generation */
  errors: string[];
  /** Confidence in the generated code (0-1) */
  confidence: number;
  /** Patterns used in generation */
  patterns: string[];
}

/**
 * A generated file
 */
export interface GeneratedFile {
  /** Path to the generated file */
  path: string;
  /** Content of the generated file */
  content: string;
  /** Language of the generated file */
  language: string;
  /** Whether this file is executable */
  executable: boolean;
}
